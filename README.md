# Employee Onboarding — Power Platform AI Solution

End-to-end hiring and onboarding on the Microsoft Power Platform:

**Resume (AI auto-fill)** → **Tech 1 → Tech 2 → HR interviews** → **DocuSign offer letter with salary breakup** → **signed copy in SharePoint / decline reason** → **onboarding checklist**

Everything ships in one Dataverse solution, **EmployeeOnboarding** (publisher prefix `onb`).

## What's in this repo

| Folder | What it is |
|---|---|
| [`onboarding-app/`](onboarding-app/) | **Web code app** (React + Vite + Fluent UI v9): HR console with dashboard, drag-and-drop pipeline, interviews, offers, onboarding, Ctrl+K command palette |
| [`onboarding-app/flows/`](onboarding-app/flows/) | **Cloud flow definitions** (JSON) + deploy script + branded email/offer-letter templates |
| [`onboarding-mobile/`](onboarding-mobile/) | **Native mobile app** (Expo / React Native / Tamagui) for interviewers, HR on the go, hiring managers and resume capture |

## Architecture

```
Web code app ─┐                       ┌─> SharePoint lists: Onboarding Candidates / Interviews / Tasks
Mobile app ───┼─ connection refs ─────┤   libraries: Resumes, OfferLetters/Signed, OfferLetters/Declined
              │  (onb_sharepointonline, onb_office365)
              │
              ├─> Flow "Onboarding - Process Resume" (Power Apps trigger)
              │      save resume → AI Builder OCR → prompt "Onboarding Resume Extractor" (JSON)
              │      AI failure / no credits → manual entry fallback
              │
              └─> Candidate Status = "Offer Requested"
                     └─> Flow "Onboarding - Send Offer Letter" (SharePoint trigger)
                            HTML offer letter + salary table → DocuSign → poll status
                            Signed   → PDF to OfferLetters/Signed, checklist, welcome + manager emails
                            Declined → reason + copy to OfferLetters/Declined, thank-you email
                            30 days  → Expired
```

## Prerequisites

- Node.js 22+, npm 10+
- Power Platform environment with a SharePoint site and these connections: SharePoint, Office 365 Outlook, DocuSign, Microsoft Dataverse (AI Builder)
- Azure CLI (`az login`) for the flow deploy script (Dataverse Web API)

## Web app

```bash
cd onboarding-app
npm install
npx --no-install pa app init -n "Employee Onboarding" -e <environment-id>   # first time only
npm run build
npx --no-install pa app push -s <solution-id>
```

Environment, solution and list IDs are documented in [`onboarding-app/memory-bank.md`](onboarding-app/memory-bank.md).

## Flows

```bash
cd onboarding-app
python flows/email_templates.py               # regenerate branded emails / offer letter into send-offer.json
node flows/deploy-flow.mjs flows/send-offer.json
node flows/deploy-flow.mjs flows/process-resume.json
```

The deploy script creates or updates each flow **inside the EmployeeOnboarding solution**, wired to the `onb_*` connection references, and turns it on.

## Mobile app

```bash
cd onboarding-mobile
npm install
npx expo start                                 # scan the QR with the Power Apps Developer app
CI=1 npx expo export --platform web --output-dir build-web
npx power-apps push --non-interactive          # deploy
```

Plan, screens and decisions: [`onboarding-mobile/native-app-plan.md`](onboarding-mobile/native-app-plan.md) · progress: [`onboarding-mobile/memory-bank.md`](onboarding-mobile/memory-bank.md).

## Notes

- No secrets are stored in this repo — connections are bound through solution connection references; `auth.config.json` holds only the public Entra client ID and tenant ID.
- DocuSign currently uses the **developer (demo)** account; switch the `onb_docusigndemo` connection reference for production.
- Offer-letter company details (address, signatory) are placeholders in `onboarding-app/flows/email_templates.py`.
