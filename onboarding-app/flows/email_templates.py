"""Branded HTML email + offer letter templates for the onboarding flows.

Emails use table layout + inline styles so they render consistently in Outlook, Gmail and mobile clients.
Values may contain Power Automate @{...} expressions; they are injected verbatim.
Run: python flows/email_templates.py  -> patches flows/send-offer.json in place, then deploy it.
"""
import json
import pathlib

COMPANY = "Power Platform AI Solution"
PRIMARY = "#4F46E5"
VIOLET = "#7C3AED"
INK = "#0F172A"
MUTED = "#64748B"
SOFT = "#F1F5F9"
FONT = "'Segoe UI',Roboto,Helvetica,Arial,sans-serif"


def email(pill, heading, intro, rows=None, body="", cta=None, footnote=""):
    rows_html = ""
    if rows:
        cells = "".join(
            f'<tr><td style="padding:10px 16px;color:{MUTED};font-size:13px;border-bottom:1px solid #E2E8F0;width:40%">{k}</td>'
            f'<td style="padding:10px 16px;color:{INK};font-size:14px;font-weight:600;border-bottom:1px solid #E2E8F0">{v}</td></tr>'
            for k, v in rows
        )
        rows_html = (
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'style="border:1px solid #E2E8F0;border-radius:12px;border-collapse:separate;overflow:hidden;margin:20px 0">{cells}</table>'
        )
    cta_html = ""
    if cta:
        cta_html = (
            '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px"><tr>'
            f'<td style="border-radius:10px;background:{PRIMARY};background-image:linear-gradient(135deg,{PRIMARY},{VIOLET})">'
            f'<a href="{cta[1]}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:15px;font-weight:600;'
            f'text-decoration:none;font-family:{FONT}">{cta[0]} &rarr;</a></td></tr></table>'
        )
    foot = f'<p style="margin:16px 0 0;color:{MUTED};font-size:12px;line-height:1.6">{footnote}</p>' if footnote else ""
    return (
        f'<!DOCTYPE html><html><body style="margin:0;padding:0;background:{SOFT}">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{SOFT};padding:32px 12px;font-family:{FONT}"><tr><td align="center">'
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;'
        'border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.08)">'
        f'<tr><td style="background:{PRIMARY};background-image:linear-gradient(135deg,{PRIMARY} 0%,{VIOLET} 60%,#DB2777 100%);padding:28px 36px">'
        '<table role="presentation" width="100%"><tr>'
        f'<td style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.2px">&#9889; {COMPANY}</td>'
        '<td align="right"><span style="display:inline-block;background:rgba(255,255,255,.18);color:#ffffff;font-size:11px;font-weight:600;'
        f'letter-spacing:1px;text-transform:uppercase;padding:6px 12px;border-radius:99px">{pill}</span></td>'
        '</tr></table>'
        f'<div style="color:#ffffff;font-size:26px;font-weight:700;line-height:1.3;margin-top:22px">{heading}</div>'
        '</td></tr>'
        f'<tr><td style="padding:32px 36px 36px;color:{INK};font-size:15px;line-height:1.65">'
        f'<p style="margin:0 0 12px">{intro}</p>{rows_html}{body}{cta_html}{foot}'
        '</td></tr>'
        f'<tr><td style="background:#F8FAFC;padding:20px 36px;border-top:1px solid #E2E8F0;color:{MUTED};font-size:12px;line-height:1.6">'
        f'<b style="color:{INK}">{COMPANY}</b> &middot; Talent &amp; People Team<br/>This is an automated message from our onboarding system.'
        '</td></tr></table></td></tr></table></body></html>'
    )


def f(field):
    return "@{triggerOutputs()?['body/" + field + "']}"


def money(field, monthly=False):
    v = "float(coalesce(triggerOutputs()?['body/" + field + "'],0))"
    if monthly:
        v = "div(" + v + ",12)"
    return "@{formatNumber(" + v + ",'N0','en-IN')}"


FIRST = "@{first(split(triggerOutputs()?['body/Title'],' '))}"
START = "@{formatDateTime(triggerOutputs()?['body/StartDate'],'dddd, dd MMMM yyyy')}"
SIGNED_URL = "https://imnaik.sharepoint.com/sites/My-SP-Dev@{body('Save_signed_letter')?['Path']}"
VARIABLE_ROW = (
    "@{if(greater(float(coalesce(triggerOutputs()?['body/SalVariable'],0)),0),"
    "concat('<tr><td>Variable Pay / Performance Bonus*</td><td class=\"n\">',"
    "formatNumber(float(triggerOutputs()?['body/SalVariable']),'N0','en-IN'),'</td><td class=\"n\">',"
    "formatNumber(div(float(triggerOutputs()?['body/SalVariable']),12),'N0','en-IN'),'</td></tr>'),'')}"
)
VARIABLE_NOTE = (
    "@{if(greater(float(coalesce(triggerOutputs()?['body/SalVariable'],0)),0),"
    "'* Variable pay is linked to individual and company performance and paid as per company policy. ','')}"
)

PAY_ROWS = [
    ("Basic Salary", "SalBasic"),
    ("House Rent Allowance (HRA)", "SalHRA"),
    ("Special Allowance", "SalSpecial"),
    ("Employer PF Contribution", "SalEmployerPF"),
    ("Gratuity", "SalGratuity"),
]

OFFER_LETTER = (
    '<html><head><meta charset="utf-8"><style>'
    f'body{{font-family:{FONT};color:{INK};font-size:10.5pt;line-height:1.6;margin:0}}'
    f'.band{{background:{PRIMARY};background-image:linear-gradient(135deg,{PRIMARY},{VIOLET});color:#fff;padding:28px 44px}}'
    '.band .co{font-size:18pt;font-weight:700}.band .tag{font-size:9pt;opacity:.85;letter-spacing:1.5px;text-transform:uppercase}'
    '.wrap{padding:28px 44px}'
    f'h1{{font-size:17pt;margin:4px 0 2px;color:{PRIMARY}}}'
    f'.meta{{color:{MUTED};font-size:9pt}}'
    '.card{border:1px solid #E2E8F0;border-radius:10px;padding:14px 18px;margin:14px 0;background:#F8FAFC}'
    '.grid td{padding:3px 14px 3px 0;vertical-align:top}.grid .k{color:#64748B;width:150px}'
    'table.pay{border-collapse:collapse;width:100%;margin:10px 0}'
    'table.pay th{background:#EEF2FF;color:#3730A3;font-size:9pt;text-transform:uppercase;letter-spacing:.6px;padding:8px 10px;text-align:left}'
    'table.pay td{padding:8px 10px;border-bottom:1px solid #E2E8F0}'
    '.n{text-align:right}'
    'table.pay tfoot td{font-weight:700;background:#EEF2FF;color:#1E1B4B;border-bottom:0}'
    'h3{font-size:11.5pt;margin:20px 0 6px;color:#1E1B4B}'
    'ul{margin:6px 0;padding-left:18px}'
    '.sig{margin-top:30px;width:100%}.sig td{width:50%;vertical-align:bottom}'
    f'.line{{border-top:1px solid #94A3B8;margin-top:42px;padding-top:4px;color:{MUTED};font-size:9pt;width:80%}}'
    '.foot{margin-top:28px;border-top:1px solid #E2E8F0;padding-top:10px;color:#94A3B8;font-size:8pt;text-align:center}'
    '</style></head><body>'
    f'<div class="band"><div class="tag">Offer of Employment</div><div class="co">&#9889; {COMPANY}</div></div>'
    '<div class="wrap">'
    "<div class=\"meta\">Ref: OFFER-@{triggerOutputs()?['body/ID']}-@{formatDateTime(utcNow(),'yyyyMMdd')} &middot; "
    "Date: @{formatDateTime(utcNow(),'dd MMMM yyyy')}</div>"
    f"<h1>Welcome to the team, {FIRST}!</h1>"
    f"<p>Dear {f('Title')},</p>"
    f"<p>Following our interviews, we are delighted to offer you the position of <b>{f('Position')}</b> at <b>{COMPANY}</b>. "
    "We were impressed by your experience and believe you will make an outstanding contribution.</p>"
    '<div class="card"><table class="grid">'
    f"<tr><td class=\"k\">Position</td><td><b>{f('Position')}</b></td></tr>"
    f"<tr><td class=\"k\">Department</td><td>{f('Department')}</td></tr>"
    "<tr><td class=\"k\">Employment type</td><td>@{coalesce(triggerOutputs()?['body/EmploymentType/Value'],'Full-time')}</td></tr>"
    f"<tr><td class=\"k\">Reporting to</td><td>{f('HiringManager')}</td></tr>"
    f"<tr><td class=\"k\">Work location</td><td>{f('WorkLocation')}</td></tr>"
    f"<tr><td class=\"k\">Date of joining</td><td><b>{START}</b></td></tr>"
    '</table></div>'
    '<h3>Compensation &amp; Salary Breakup</h3>'
    f"<p>Your annual Cost to Company (CTC) is <b>INR {money('Salary')}</b>, structured as follows:</p>"
    '<table class="pay"><thead><tr><th>Component</th><th class="n">Annual (INR)</th><th class="n">Monthly (INR)</th></tr></thead><tbody>'
    + "".join(f'<tr><td>{label}</td><td class="n">{money(fld)}</td><td class="n">{money(fld, True)}</td></tr>' for label, fld in PAY_ROWS)
    + VARIABLE_ROW
    + f'</tbody><tfoot><tr><td>Total CTC</td><td class="n">{money("Salary")}</td><td class="n">{money("Salary", True)}</td></tr></tfoot></table>'
    f'<p class="meta">{VARIABLE_NOTE}Statutory deductions (employee PF, professional tax, income tax) apply as per law.</p>'
    '<h3>Terms of the offer</h3><ul>'
    '<li>This offer is subject to satisfactory background verification and the documents listed in your onboarding checklist.</li>'
    '<li>You will be on probation for six months from your date of joining.</li>'
    '<li>Please sign this letter within <b>7 days</b> to confirm your acceptance.</li></ul>'
    '<p>We are excited to have you on board and look forward to building the future of AI on the Power Platform together.</p>'
    '<table class="sig"><tr>'
    f'<td>Warm regards,<br/><b>Talent &amp; People Team</b><br/>{COMPANY}</td>'
    f"<td><b>Accepted by:</b> {f('Title')}<div class=\"line\">Signature &amp; date</div></td>"
    '</tr></table>'
    f'<div class="foot">{COMPANY} &middot; This offer letter is confidential and intended only for the named candidate.</div>'
    '</div></body></html>'
)

OFFER_SENT_EMAIL = email(
    "Offer letter",
    f"Great news, {FIRST} &mdash; your offer is here! &#127881;",
    f"We're thrilled to offer you the role of <b>{f('Position')}</b> at {COMPANY}. "
    "Your official offer letter, including the full salary breakup, has just been sent to you through <b>DocuSign</b> for e-signature.",
    rows=[
        ("Role", f("Position")),
        ("Team", f("Department")),
        ("Location", f("WorkLocation")),
        ("Proposed joining date", START),
        ("Annual CTC", "INR " + money("Salary")),
    ],
    body=(
        '<p style="margin:0 0 6px"><b>Next steps</b></p>'
        f'<ol style="margin:0;padding-left:20px;color:{INK}">'
        f'<li>Open the DocuSign email titled <i>&ldquo;Your offer letter from {COMPANY}&rdquo;</i>.</li>'
        '<li>Review the letter and salary breakup.</li>'
        '<li>Sign to accept &mdash; it takes under a minute.</li></ol>'
    ),
    footnote="Please sign within 7 days. Questions? Simply reply to this email and our Talent team will help.",
)

WELCOME_ITEMS = [
    ("&#128196;", "Keep your ID proof, PAN and bank details handy &mdash; HR will reach out to collect them."),
    ("&#128187;", "Your laptop and company account will be ready before you join."),
    ("&#129309;", "You will be paired with an onboarding buddy in your first week."),
]

WELCOME_EMAIL = email(
    "Welcome aboard",
    f"Welcome to {COMPANY}, {FIRST}! &#128640;",
    f"Thank you for signing your offer &mdash; we're so excited you're joining us as <b>{f('Position')}</b>. "
    "Here's everything you need for a great first day.",
    rows=[
        ("Joining date", START),
        ("Reporting to", f("HiringManager")),
        ("Location", f("WorkLocation")),
        ("Team", f("Department")),
    ],
    body=(
        '<p style="margin:0 0 6px"><b>Before day one</b></p>'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
        + "".join(
            f'<tr><td style="padding:6px 0;width:28px;vertical-align:top;font-size:16px">{ico}</td>'
            f'<td style="padding:6px 0;color:{INK};font-size:14px">{txt}</td></tr>'
            for ico, txt in WELCOME_ITEMS
        )
        + '</table>'
    ),
    cta=("View your signed offer letter", SIGNED_URL),
    footnote="A copy of your signed offer letter is stored securely. We can't wait to meet you!",
)

DECLINE_EMAIL = email(
    "Offer update",
    f"Thank you, {FIRST}",
    f"We've received your response to our offer for <b>{f('Position')}</b>. While we're sorry it didn't work out this time, "
    "we truly appreciate the time and energy you invested in our interview process.",
    body=(
        f'<p style="margin:0">We would love to stay in touch &mdash; if your plans change or a future role at {COMPANY} interests you, '
        "please don't hesitate to reach out. We wish you every success in your next chapter.</p>"
    ),
    footnote="Warm regards, the Talent &amp; People Team.",
)

MANAGER_EMAIL = email(
    "Offer accepted",
    f"{f('Title')} accepted the offer! &#127881;",
    f"Hi {f('HiringManager')}, great news &mdash; <b>{f('Title')}</b> has e-signed the offer for <b>{f('Position')}</b>.",
    rows=[
        ("Candidate", f("Title")),
        ("Role", f("Position")),
        ("Joining date", START),
        ("Location", f("WorkLocation")),
    ],
    body=(
        '<p style="margin:0">The onboarding checklist (IT setup, HR documents, facilities and orientation) has been created automatically. '
        "Please plan a welcome session and assign a buddy for the first week.</p>"
    ),
    cta=("Open signed offer letter", SIGNED_URL),
)

COMBINED_PDF = "Combined without COC : Get all documents as single pdf"


def send_email(to, subject, html, run_after):
    return {
        "runAfter": run_after,
        "type": "OpenApiConnection",
        "inputs": {
            "host": {
                "apiId": "/providers/Microsoft.PowerApps/apis/shared_office365",
                "connectionName": "shared_office365",
                "operationId": "SendEmailV2",
            },
            "parameters": {
                "emailMessage/To": to,
                "emailMessage/Subject": subject,
                "emailMessage/Body": html,
                "emailMessage/Importance": "Normal",
            },
            "authentication": "@parameters('$authentication')",
        },
    }


if __name__ == "__main__":
    path = pathlib.Path(__file__).with_name("send-offer.json")
    spec = json.loads(path.read_text(encoding="utf-8"))
    acts = spec["definition"]["actions"]
    acts["Company"]["inputs"]["name"] = COMPANY
    acts["Company"]["description"] = "Company name used in DocuSign subject lines. Letter/email design lives in flows/email_templates.py."

    send = acts["Send_offer"]["actions"]
    send["Offer_letter_html"]["inputs"] = OFFER_LETTER
    send["Create_envelope"]["inputs"]["parameters"]["emailSubject"] = (
        f"Your offer letter from {COMPANY} – @{{triggerOutputs()?['body/Position']}}"
    )

    # Branded heads-up to the candidate once DocuSign has sent the envelope. Placed after the
    # Send_offer scope so a mail hiccup can't trigger the send-failure rollback.
    acts["Email_candidate_offer_sent"] = send_email(
        "@triggerOutputs()?['body/Email']",
        f"🎉 Your offer from {COMPANY} is waiting for your signature",
        OFFER_SENT_EMAIL,
        {"Send_offer": ["Succeeded"]},
    )
    acts["Wait_for_response"]["runAfter"] = {"Email_candidate_offer_sent": ["Succeeded", "Failed"]}

    cases = acts["Outcome"]["cases"]
    signed = cases["Signed"]["actions"]
    declined = cases["Declined"]["actions"]
    signed["Get_signed_letter"]["inputs"]["parameters"]["documentId"] = COMBINED_PDF
    declined["Get_declined_letter"]["inputs"]["parameters"]["documentId"] = COMBINED_PDF

    signed["If_manager_email"]["actions"]["Notify_manager"] = send_email(
        "@triggerOutputs()?['body/ManagerEmail']",
        "🎉 @{triggerOutputs()?['body/Title']} accepted the @{triggerOutputs()?['body/Position']} offer",
        MANAGER_EMAIL,
        {},
    )
    signed["Welcome_candidate"] = send_email(
        "@triggerOutputs()?['body/Email']",
        f"🚀 Welcome to {COMPANY}, {FIRST}!",
        WELCOME_EMAIL,
        {"Mark_accepted": ["Succeeded"]},
    )
    declined["Thank_candidate"] = send_email(
        "@triggerOutputs()?['body/Email']",
        f"Thank you from {COMPANY}",
        DECLINE_EMAIL,
        {"Mark_declined": ["Succeeded"]},
    )
    path.write_text(json.dumps(spec, indent=2, ensure_ascii=False), encoding="utf-8")
    print("send-offer.json updated")
