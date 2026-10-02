# Onboard Mobile — Native App Plan

## Overview
- **App:** Onboard Mobile (slug `onboard-mobile`), iOS + Android
- **Brand:** Power Platform AI Solution — indigo `#4F46E5` → violet `#7C3AED`, accent pink `#DB2777`
- **Environment:** Dev_USA `7a5c7438-a0d8-ebc0-9b61-ad57aa550f0a` (https://orgbc4fa1b4.crm.dynamics.com), tenant `8d9b954a-787e-43fe-b998-6c448197fb42`
- **Solution:** EmployeeOnboarding `9715db37-24be-f111-a059-70a8a58ba805` (publisher prefix `onb`)
- **Companion to:** web code app `C:\Users\navan\OneDrive\Desktop\Flows\onboarding-app` — same data, same business rules

## App Requirements
- Interviewers: my upcoming interviews (InterviewerEmail = me), interview detail, open resume, submit Pass/Fail/No Show/Cancelled + 1–5 rating + feedback. Fail → candidate Not Selected; HR-round Pass → Selected.
- HR on the go: pipeline by status with search, candidate journey timeline, schedule next round (Tech 1 → Tech 2 → HR, strictly ordered; Outlook invite to interviewer + candidate), send offer (sets Status `Offer Requested`; the existing "Onboarding - Send Offer Letter" flow handles DocuSign, storage and emails).
- Hiring managers: my joiners (ManagerEmail = me, Accepted/Onboarded) with checklist progress; tick tasks; mark Onboarded at 100%.
- Resume capture: camera photo or document pick → "Auto-fill with AI" toggle → "Onboarding - Process Resume" flow → review form → create candidate (Status Applied, Source "Mobile app"). AI failure (credits) falls back to manual entry with a clear banner.
- No new Dataverse tables. Everything in the EmployeeOnboarding solution.

## Data Model
No Dataverse tables — the app reuses the existing SharePoint lists on `https://imnaik.sharepoint.com/sites/My-SP-Dev` through the SharePoint **action** connector (generic `GetItems` / `GetItem` / `PostItem` / `PatchItem` / `HttpRequest` with `dataset` + list GUID). Table-mode metadata fetch fails in this tenant, so action mode is required.

| List | GUID | Key columns |
|---|---|---|
| Onboarding Candidates | `8cb9a8c5-8425-40b8-b22c-81c8fc0979a4` | Title (full name), Email, Phone, Position, Department, HiringManager, ManagerEmail, Salary + SalBasic/SalHRA/SalSpecial/SalEmployerPF/SalGratuity/SalVariable, StartDate, WorkLocation, EmploymentType◆, CurrentCompany, ExperienceYears, Skills, AiSummary, ResumeFileName, ResumeUrl, Source, Status◆, EnvelopeId, OfferSentOn, RespondedOn, DeclineReason, SignedOfferUrl, Notes |
| Onboarding Interviews | `1875f8d9-d39d-44fa-84f5-29961ae91d5c` | CandidateId, Round◆ (Tech 1/Tech 2/HR), InterviewerName, InterviewerEmail, ScheduledStart, DurationMinutes, MeetingLink, EventId, Result◆ (Scheduled/Pass/Fail/No Show/Cancelled), Rating, Feedback |
| Onboarding Tasks | `fa747535-e3fe-4ad9-9cdb-3199bf31f307` | Title, CandidateId, Category◆ (IT/HR Docs/Facilities/Orientation), DueDate, IsDone, TaskOwner |

◆ choice column — read as `{ Value }`, written as `{ Value: 'x' }`.

Status values: Applied, Interviewing, Not Selected, Selected, Offer Requested, Offer Sent, Accepted, Declined, Expired, Onboarded.

### Notes
- Signed-in user email comes from SharePoint `_api/web/currentuser` via the connector's `HttpRequest` (the auth hook does not expose user claims).
- Business logic is ported from `onboarding-app/src/services/onboarding.ts` into `src/services/onboarding.ts` (same function names) so web and mobile behave identically.

## Native Capabilities
| Capability | Package (already in template) | Used by |
|---|---|---|
| Camera capture | `expo-image-picker` (`launchCameraAsync`) | Capture — photograph a paper resume |
| Document picker | `expo-document-picker` | Capture — pick PDF/DOCX/image |
| File read as base64 | `expo-file-system` | Capture — send file to the resume flow |
| Open links | `expo-web-browser` / `Linking` | Resume, meeting link, signed offer |
| Haptics | `expo-haptics` | Result submitted / task ticked |

## Design Direction: <deferred — set by /design-system>
Brand inputs known: Power Platform AI Solution, indigo #4F46E5 → violet #7C3AED gradient, pink #DB2777 accent, professional/modern, light + dark.

## Connectors
| Connector | API name | Connection reference | Mode | Purpose |
|---|---|---|---|---|
| SharePoint | `shared_sharepointonline` | `onb_sharepointonline` | action | All list reads/writes + current user |
| Office 365 Outlook | `shared_office365` | `onb_office365` | action | Interview invites (`V4CalendarPostItem`) |
| Cloud flow | Onboarding - Process Resume | (solution flow `630c15ee-7b83-ec6e-ed4d-8234d3411160`) | flow | Resume upload + optional AI extraction |

## Screens
**Navigation pattern:** Tabs + Stack (5 tabs).

| Screen | File | Tab | Presentation | Data |
|---|---|---|---|---|
| Home | `app/(app)/home.tsx` | Home | default | currentUser, candidates, my interviews, my joiners |
| My Interviews | `app/(app)/interviews/index.tsx` | Interviews | default | listInterviews({ interviewerEmail: me }) + candidates |
| Interview Detail | `app/(app)/interviews/[id].tsx` | — | default | interview + candidate |
| Record Result | `app/(app)/interviews/result.tsx` | — | modal | recordResult() |
| Pipeline | `app/(app)/candidates/index.tsx` | Candidates | default | listCandidates() |
| Candidate Detail | `app/(app)/candidates/[id].tsx` | — | default | candidate, interviews, tasks |
| Schedule Round | `app/(app)/candidates/schedule.tsx` | — | modal | scheduleInterview() + Outlook |
| My Joiners | `app/(app)/joiners/index.tsx` | Joiners | default | candidates (ManagerEmail = me, toggle All) + tasks |
| Joiner Checklist | `app/(app)/joiners/[id].tsx` | — | default | listTasks(id), setTaskDone, setStatus Onboarded |
| Capture Resume | `app/(app)/capture/index.tsx` | Capture | default | processResume() |
| Review Candidate | `app/(app)/capture/review.tsx` | — | default | createCandidate() |

### Per-Screen Specs
- **Home** — gradient hero with greeting + role chips; KPI row (Interviews today, Awaiting my feedback, In pipeline, Joining in 30 days); "Next up" interview card (join + record result); "Needs action" list (awaiting feedback, Selected ready for offer); pull-to-refresh.
- **My Interviews** — segmented Upcoming / Awaiting feedback / Completed; card: candidate avatar, round pill, time, duration, Join button; tap → detail. Empty states per segment.
- **Interview Detail** — candidate summary (position, experience, skills chips, AI summary), round + time + interviewer, buttons: Open resume, Join meeting, Record result (only when Scheduled); previous rounds' results for this candidate.
- **Record Result (modal)** — outcome segmented control (Pass/Fail/No show/Cancelled), 5 tappable stars, feedback (required for Pass/Fail), contextual banner (Fail → Not Selected; HR Pass → Selected), haptic on save, back to list.
- **Pipeline** — search, horizontal status chips with counts, sectioned list grouped by status; card with avatar, position, status badge, start date; tap → detail; FAB "+ Resume" → Capture tab.
- **Candidate Detail** — header with avatar + status; journey timeline (Resume → Tech 1 → Tech 2 → HR → Offer → Accepted → Onboarded, done/current/failed/todo); profile facts; interviews list; offer card with CTC + breakup table, decline reason, signed offer link; bottom action bar: "Schedule <round>" (when nextRound) and "Send offer" (Selected/Declined/Expired, disabled with missing-field hint).
- **Schedule Round (modal)** — interviewer name + email, date + time pickers (default next weekday 10:00), duration chips 30/45/60/90, meeting link; info banner about the Outlook invite; Send invite.
- **My Joiners** — toggle My joiners / All joiners; card with progress bar, done/total, overdue count, joining date chip.
- **Joiner Checklist** — progress ring/bar, tasks grouped by category with checkboxes, owner + due; "Create checklist" if none; "Mark as onboarded" at 100%.
- **Capture Resume** — two big tiles (Take photo / Choose file), AI auto-fill switch, upload progress, result banner (AI filled / AI unavailable → manual / attached), Continue → Review.
- **Review Candidate** — prefilled form (name*, email*, phone, current company, experience, skills, summary, position, department, location, hiring manager, manager email); Create candidate → Candidate Detail.

## Approvals
- Gates 1–4 presented together in one plan-mode review (planner sub-agent can't open gates in this host; orchestrator ran them inline). Approver: user. Timestamp: pending.

## Generated Services (snapshot 2026-10-02)
| Service | Path | Notes |
|---|---|---|
| `SharePointService` | `src/generated/services/SharePointService.ts` | action connector — DO NOT call directly from screens; use `@/services/onboarding` |
| `Office365OutlookService` | `src/generated/services/Office365OutlookService.ts` | used only via `@/services/calendar` `createInvite` |
| `Onboarding_ProcessResumeService` | `src/generated/services/Onboarding_ProcessResumeService.ts` | used only via `@/services/resume` `processResume` |

## Shared Code (screens MUST use these — never call generated services directly)
- `@/services/onboarding` — types `Candidate`, `CandidateInput`, `CandidateStatus`, `Interview`, `InterviewResult`, `Round`, `OnboardingTask`, `SalaryBreakup`; constants `STATUSES`, `ROUNDS`, `EDITABLE_STATUSES`, `EMPTY_BREAKUP`, `DEFAULT_TASKS`; functions `listCandidates()`, `getCandidate(id)`, `createCandidate(input)` (creates with Status Applied), `updateCandidate(id,input)`, `setStatus(id,status)`, `listTasks(candidateId?)`, `setTaskDone(taskId,bool)`, `createDefaultTasks(candidate)`, `listInterviews({candidateId?, interviewerEmail?})`, `nextRound(interviews): Round|null`, `scheduleInterview({candidate, round, interviewerName, interviewerEmail, start: Date, durationMinutes, meetingLink, createInvite})`, `recordResult(interview, result, rating|null, feedback): Promise<CandidateStatus|null>`, `computeBreakup(ctc, variablePct)`, `breakupTotal(b)`, `toDateInput(date)`.
- `@/services/calendar` — `createInvite` (pass into `scheduleInterview`).
- `@/services/resume` — `processResume({uri,name,size}, useAi): Promise<{resumeUrl, resumeFileName, aiStatus:'done'|'skipped'|'failed', extracted}>`, `MAX_RESUME_MB`, `RESUME_MIME_TYPES`. aiStatus 'failed' → show warning "AI auto-fill unavailable (AI credits may be used up) — please enter details manually" and continue.
- `@/services/currentUser` — `getCurrentUser(): Promise<{email, name}>` (lower-case email) for "my interviews" / "my joiners".
- `@/components` — LoadingState, ErrorState, EmptyState, ScreenHeader, ModalHeader, BottomActionBar, FloatingActionButton, FilterChipRow, FormField, RowPick, StatusPill, StatTile, Hero (gradient 'hero' = brand indigo→violet→pink), SectionHeader, AvatarInitials, InfoRow, ActionRow, Gradient.
- `@/components/onboarding` — CandidateStatusBadge, RoundPill, ResultPill, StarRating (value,onChange?), ProgressBar(value 0..1, tone), JourneyTimeline({candidate, interviews}), buildJourney, CandidateRow({candidate,onPress}), InterviewCard({interview,candidate?,onPress}), BreakupTable({ctc, breakup}).
- `@/utils` — formatDate (date-only safe), formatDateTime, formatRelative.
- Data fetching: use `@tanstack/react-query` (`useQuery`, `useQueryClient().invalidateQueries`) — `PowerAppsProvider` already provides the QueryClient. Query keys: `['candidates']`, `['candidate', id]`, `['interviews', filter]`, `['tasks', candidateId]`, `['me']`.
- Links: `expo-web-browser` `openBrowserAsync(url)` for resume / meeting / signed offer.
- Branding: tokens only (`$accentBase`, `$surface0..3`, `$text0..3`, `$status*`); no raw hex in screens.
