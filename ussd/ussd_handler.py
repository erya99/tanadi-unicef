"""
TANADI · USSD callback handler
==============================

FastAPI endpoint that implements the Family MUAC++ menu tree for
Africa's Talking USSD service. Mirrors the menu flow in `/data.js`.

Design principles
-----------------
- 3 main menus, each with 3 options. Memorable by repetition.
- Low literacy: numbers map to colors / concepts taught in CHW
  field training.
- Each screen kept under 160 characters to fit USSD limits.
- Village location resolved from phoneNumber via operator Cell-ID
  lookup. No GPS required — works on basic feature phones.

Local test
----------
    pip install fastapi uvicorn python-multipart
    uvicorn ussd_handler:app --reload

Africa's Talking webhook POST body
----------------------------------
    sessionId       unique per call
    serviceCode     shortcode (*384#)
    phoneNumber     caller MSISDN
    text            concatenated input ('', '1', '1*3', ...)

Response
--------
    CON ...    continue session, show menu
    END ...    terminate session
"""

from __future__ import annotations

from datetime import datetime
from fastapi import FastAPI, Form
from fastapi.responses import PlainTextResponse

app = FastAPI(title='TANADI USSD handler')


# --- In-memory state (replace with PostgreSQL in production) -------------

SESSIONS: dict[str, dict] = {}    # sessionId -> { phone, started_at, breadcrumb }
REPORTS: list[dict] = []          # appended on each completed flow
USER_LANG: dict[str, str] = {}    # phoneNumber -> language code


# --- Cell-ID → village resolution (stub) ---------------------------------
# In production: queries Orange/Airtel HLR Lookup API.
# Falls back to phoneNumber → village mapping for users registered
# in onboarding flow.

PHONE_VILLAGE_MAP: dict[str, str] = {
    # Filled by CHW during field enrollment, or by onboarding USSD flow.
    # Example:
    #   '+22790123456': 'Dan Issa',
}


def resolve_village(phone_number: str) -> str:
    """Resolve caller's village from phone number via Cell-ID + DB lookup."""
    return PHONE_VILLAGE_MAP.get(phone_number, 'Unknown')


# --- Menu tree ------------------------------------------------------------

ROOT_MENU = (
    "CON TANADI Ina kwana!\n"
    "1. Yaro (Child MUAC)\n"
    "2. Lafiya (Health)\n"
    "3. Abinci (Food)\n"
    "0. Harshe (Language)"
)

MENUS = {
    # Root
    '': ROOT_MENU,

    # ---- MENU 1: MUAC color ----
    '1': (
        "CON Yaro MUAC\n"
        "Wane launi?\n"
        "1. Kore (Green)\n"
        "2. Rawaya (Yellow)\n"
        "3. Ja (Red)"
    ),

    # ---- MENU 2: Health symptom ----
    '2': (
        "CON Lafiya\n"
        "Wane alama?\n"
        "1. Gudawa (Diarrhea)\n"
        "2. Zazzabi (Fever)\n"
        "3. Tari (Cough)"
    ),

    # ---- MENU 3: Food access (10-day recall) ----
    '3': (
        "CON Abinci\n"
        "Kwana 10 da suka wuce?\n"
        "1. Na samu (Got it)\n"
        "2. Kadan (Some)\n"
        "3. Bansamu (None)"
    ),

    # ---- Language ----
    '0': (
        "CON Harshe / Langue\n"
        "1. Hausa\n"
        "2. Francais\n"
        "3. Zarma\n"
        "4. Fulfulde"
    ),
}


# --- Confirmation messages ------------------------------------------------

MUAC_RESPONSES = {
    '1': "END Kore. An karbi rahoton.\nYaronka lafiya. Na gode!",
    '2': "END Rawaya. An karbi rahoton.\nCHW visit in 3 days.",
    '3': "END JA URGENT. An aiko taimako.\nCSPS notified. ETA 2h.\nAllah ya kiyaye.",
}

HEALTH_RESPONSES = {
    '1': "END Gudawa rahoton an karbi.\nJe CSPS yau. Na gode!",
    '2': "END Zazzabi rahoton an karbi.\nJe CSPS yau. Na gode!",
    '3': "END Tari rahoton an karbi.\nJe CSPS yau. Na gode!",
}

FOOD_RESPONSES = {
    '1': "END Abinci OK. An karbi rahoton.\nNa gode!",
    '2': "END Abinci kadan. An karbi.\nCHW will follow up.",
    '3': "END URGENT no food. An karbi.\nWFP notified. Aid list updated.",
}


# --- Webhook endpoint -----------------------------------------------------

@app.post('/ussd', response_class=PlainTextResponse)
async def ussd_callback(
    sessionId: str = Form(...),
    serviceCode: str = Form(...),
    phoneNumber: str = Form(...),
    text: str = Form(default=''),
):
    """Africa's Talking USSD callback."""
    # Track session
    if sessionId not in SESSIONS:
        SESSIONS[sessionId] = {
            'phone': phoneNumber,
            'village': resolve_village(phoneNumber),
            'started_at': datetime.utcnow().isoformat(),
            'breadcrumb': []
        }
    SESSIONS[sessionId]['breadcrumb'].append(text)
    village = SESSIONS[sessionId]['village']

    # Direct menu match (root or first-level menu shown)
    if text in MENUS:
        return MENUS[text]

    # Second-level: MUAC color selected
    if text.startswith('1*'):
        choice = text.split('*')[1]
        if choice in MUAC_RESPONSES:
            color = {'1': 'green', '2': 'yellow', '3': 'red'}[choice]
            REPORTS.append({
                'session': sessionId,
                'phone': phoneNumber,
                'village': village,
                'type': 'muac',
                'color': color,
                'urgent': color == 'red',
                'timestamp': datetime.utcnow().isoformat()
            })
            if color == 'red':
                # In production: trigger SMS to nearest CSPS + UNICEF team
                # await notify_csps(village, phoneNumber)
                pass
            return MUAC_RESPONSES[choice]

    # Second-level: Health symptom selected
    if text.startswith('2*'):
        choice = text.split('*')[1]
        if choice in HEALTH_RESPONSES:
            symptom = {'1': 'diarrhea', '2': 'fever', '3': 'cough'}[choice]
            REPORTS.append({
                'session': sessionId,
                'phone': phoneNumber,
                'village': village,
                'type': 'health',
                'symptom': symptom,
                'timestamp': datetime.utcnow().isoformat()
            })
            return HEALTH_RESPONSES[choice]

    # Second-level: Food access selected
    if text.startswith('3*'):
        choice = text.split('*')[1]
        if choice in FOOD_RESPONSES:
            access = {'1': 'sufficient', '2': 'partial', '3': 'none'}[choice]
            REPORTS.append({
                'session': sessionId,
                'phone': phoneNumber,
                'village': village,
                'type': 'food',
                'access': access,
                'urgent': access == 'none',
                'timestamp': datetime.utcnow().isoformat()
            })
            return FOOD_RESPONSES[choice]

    # Language change
    if text.startswith('0*'):
        choice = text.split('*')[1]
        lang_map = {'1': 'ha', '2': 'fr', '3': 'dje', '4': 'ff'}
        if choice in lang_map:
            USER_LANG[phoneNumber] = lang_map[choice]
            return "END Language saved. Dial *384# to continue."

    return "END Invalid input. Dial *384# to retry."


# --- Debug endpoints ------------------------------------------------------

@app.get('/reports')
async def list_reports():
    """List collected reports (debug only)."""
    return {'count': len(REPORTS), 'reports': REPORTS[-20:]}


@app.get('/sessions')
async def list_sessions():
    """Active session breadcrumbs (debug only)."""
    return {'count': len(SESSIONS), 'sessions': list(SESSIONS.values())[-20:]}


@app.get('/health')
async def health():
    return {
        'status': 'ok',
        'sessions': len(SESSIONS),
        'reports': len(REPORTS),
        'registered_phones': len(PHONE_VILLAGE_MAP),
    }
