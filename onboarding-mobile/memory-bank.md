# Onboard Mobile — Memory Bank

## Project facts
- App: Onboard Mobile (slug onboard-mobile), iOS + Android, Expo SDK 55 standalone template
- Path: C:\Users\navan\OneDrive\Desktop\Flows\onboarding-mobile
- Environment: Dev_USA 7a5c7438-a0d8-ebc0-9b61-ad57aa550f0a (https://orgbc4fa1b4.crm.dynamics.com), tenant 8d9b954a-787e-43fe-b998-6c448197fb42
- Solution: EmployeeOnboarding 9715db37-24be-f111-a059-70a8a58ba805 (prefix onb)
- Companion web app: ..\onboarding-app (same SharePoint data + business rules)
- visual_companion: yes

## Completed steps
- [x] Step 1 prerequisites (Node 22, npm 10, az logged in). resolve-environment.js can't spawn `az` on Windows → .resolved-environment.json written manually
- [x] Step 3 plan — 4 gates approved together in one plan-mode review (planner sub-agent lacks gate tools)
- [x] Step 5 template prep, Step 6 `power-apps init -t MobileApp`, scaffold tsc gate
- [x] Step 6.75 design: brand/tokens.ts (Power Platform AI Solution), tamagui.config.ts brand themes, app/_layout.tsx branded ThemeTokens, tokens gradients hero/brand
- [x] Step 7 auth: clientId e7dc4b42-c705-4a86-9b6d-be3cdafb5bd3 (Wrap app "OnboardingApp"; earlier "OnBoarding App" 11e6c686… failed), tenant 8d9b954a-…
- [x] Step 6.85 offline profile: not-applicable (no Dataverse tables)
- [x] Step 10 data sources: Office 365 Outlook (onb_office365), Process Resume flow, SharePoint action connector (added with ..\onboarding-app's newer `pa` CLI — template CLI lacks `--as action`)
- [x] Step 10b Tabs (home, interviews, candidates, joiners, capture) + per-folder stacks
- [x] Step 10.8 shared code: src/services/{onboarding,calendar,emailTemplate,resume,currentUser}.ts, src/components/onboarding.tsx
- [x] Step 11 screens: 11 screens in 3 waves, all tsc gates clean; native wrappers src/native/camera.ts + documentPicker.ts; expo-haptics removed (crashes in current binary)
- [x] Step 11.4 stylistic sweep: contrast 0; 3 screen-quality false positives (BottomActionBar pads bottom inset itself; no real nested tap)
- [x] Verified 2026-10-02: app signs in and runs on iOS via Power Apps Developer app
- [x] Step 12 Metro running (`npx expo start`), dev-client URL exp+onboard-mobile://expo-development-client/?url=http%3A%2F%2F192.168.1.108%3A8081, QR at .expo/metro-qr.png

## Deploy
- Current version: v1.0.0 — deployed 2026-10-02 to Dev_USA, added to solution EmployeeOnboarding
- App URL: https://apps.powerapps.com/play/e/7a5c7438-a0d8-ebc0-9b61-ad57aa550f0a/a/30ea8520-7832-487a-9a61-202f3333892b
- Build: no `build` script in template → `CI=1 npx expo export --platform web --output-dir build-web` (buildPath ./build-web; `dist` is locked by OneDrive; export process hangs after "Exported:" — stop it)

## Build history
| v1.0.0 | 2026-10-02 | deploy | success |

## Offline profile
status: not-applicable

## Policies
tsc_error_policy: patch_continue

## Project facts (runtime)
- Metro launch cmd: cd onboarding-mobile && npx expo start

## Concerns
- Signed-in user email resolved through SharePoint `_api/web/currentuser` (useAuth exposes no claims)
