# Employee Onboarding — Memory Bank

## Project
- Path: C:\Users\navan\OneDrive\Desktop\Flows\onboarding-app
- App name: Employee Onboarding (branded "Power Platform AI Solution")
- Environment: Dev_USA 7a5c7438-a0d8-ebc0-9b61-ad57aa550f0a (https://orgbc4fa1b4.crm.dynamics.com)
- App URL: https://apps.powerapps.com/play/e/7a5c7438-a0d8-ebc0-9b61-ad57aa550f0a/app/0b21dc3c-7dc5-453c-9539-8ab8efb2c4bd
- CLI Binary: pa (`npx --no-install pa`), local devDependency
- Solution: EmployeeOnboarding (9715db37-24be-f111-a059-70a8a58ba805), publisher Onboarding / prefix `onb`
- Connection references: onb_sharepointonline, onb_office365, onb_docusigndemo, onb_commondataserviceforapps
- Dataverse API from CLI: `az login` + flows/deploy-flow.mjs (uses az token)

## SharePoint (https://imnaik.sharepoint.com/sites/My-SP-Dev)
- Onboarding Candidates 8cb9a8c5-8425-40b8-b22c-81c8fc0979a4 (Status: Applied, Interviewing, Not Selected, Selected, Offer Requested, Offer Sent, Accepted, Declined, Expired, Onboarded; salary breakup SalBasic/SalHRA/SalSpecial/SalEmployerPF/SalGratuity/SalVariable; resume fields)
- Onboarding Interviews 1875f8d9-d39d-44fa-84f5-29961ae91d5c (Round Tech 1/Tech 2/HR, Result Scheduled/Pass/Fail/No Show/Cancelled)
- Onboarding Tasks fa747535-e3fe-4ad9-9cdb-3199bf31f307
- Libraries: /Resumes, /OfferLetters/Signed, /OfferLetters/Declined
- Note: `pa app add data-source --as table` fails for SP ("Failed to retrieve metadata") → SharePoint added `--as action` (generic GetItems/PostItem/PatchItem)

## Flows (solution-aware; source in flows/*.json, deploy with `node flows/deploy-flow.mjs flows/<file>.json`)
- Onboarding - Process Resume (PowerApps V2; flow id for app 630c15ee-7b83-ec6e-ed4d-8234d3411160): save to /Resumes → AI Builder OCR (textrecognition) → prompt "Onboarding Resume Extractor" (msdyn_aimodel bb44afdb-c376-4c58-80e0-af61c12eaa8d, created via AIModelPublish, in solution) → respond. Respond always runs (runAfter incl. Failed) so AI failure → manual entry. Prompt verified via Dataverse Predict (needs `source` param); Verified end-to-end 2026-10-02 (web app upload auto-fills). OCR input must be base64ToBinary(...) — raw base64 gets double-encoded. .docx not supported by OCR
- Onboarding - Send Offer Letter (SP trigger Status = Offer Requested): HTML offer letter w/ salary breakup → DocuSign Demo (acct 85b1d96d-…) → poll 5 min → Signed: PDF to OfferLetters/Signed, checklist, welcome + manager emails; Declined: reason, copy, thank-you email; 30 days → Expired
- Email/letter design: flows/email_templates.py (run it, then redeploy send-offer). App-side invites: src/services/emailTemplate.ts

## UI (v1.1.0 — Premium SaaS redesign, 2026-10-02)
- Dark-first glass UI + light mode; brand ramp in src/theme/brand.ts, tokens in src/styles/tokens.css, all styling in src/App.css
- Shell: src/shell/{Aura,Sidebar,TopBar,CommandPalette}.tsx (Ctrl+K / "/"), toasts via src/hooks/useToast.tsx
- Data: one AppDataProvider (src/state/AppData.tsx + appDataContext.ts) loads candidates/interviews/tasks/me; pages call refresh(); use `now` from context instead of Date.now() in render
- UI kit: src/ui/{GlassCard,charts (Sparkline/Donut/ProgressRing/StackedBar),CountUp,StageStepper,Skeletons,Confetti}.tsx; deps motion + @dnd-kit
- Kanban DnD rules in src/utils/pipeline.ts (only → Offer out / → Closed are manual); offer gaps in src/utils/offer.ts

## App features
- Dashboard (KPIs, funnel, upcoming joiners, activity), Candidates (board/list), Candidate form (resume upload + AI toggle + manual fallback, salary breakup calculator), Candidate detail (journey timeline, interviews, offer, onboarding checklist), Interviews page, Onboarding page

## Pending
- Web app v1.1.0 (Premium SaaS UI) deployed 2026-10-02 into solution (redeploy: `npm run build && npx --no-install pa app push -s 9715db37-24be-f111-a059-70a8a58ba805`)
- Native mobile app built in ..\onboarding-mobile (runs on iOS dev client)
- End-to-end test of resume upload with AI (OCR path) and the full offer flow still to do
