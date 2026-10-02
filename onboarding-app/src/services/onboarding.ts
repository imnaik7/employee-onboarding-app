import { SharePointService } from '../generated';
import { COMPANY, interviewInviteHtml } from './emailTemplate';

// SharePoint site + list IDs (list GUIDs are stable even if a list is renamed)
export const SITE = 'https://imnaik.sharepoint.com/sites/My-SP-Dev';
const CANDIDATES_LIST = '8cb9a8c5-8425-40b8-b22c-81c8fc0979a4';
const TASKS_LIST = 'fa747535-e3fe-4ad9-9cdb-3199bf31f307';
const INTERVIEWS_LIST = '1875f8d9-d39d-44fa-84f5-29961ae91d5c';

export const STATUSES = [
  'Applied',
  'Interviewing',
  'Not Selected',
  'Selected',
  'Offer Requested',
  'Offer Sent',
  'Accepted',
  'Declined',
  'Expired',
  'Onboarded',
] as const;
export type CandidateStatus = (typeof STATUSES)[number];

// Statuses in which the profile and compensation can still be edited
export const EDITABLE_STATUSES: CandidateStatus[] = ['Applied', 'Interviewing', 'Selected', 'Declined', 'Expired'];

export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Intern'] as const;
export const TASK_CATEGORIES = ['IT', 'HR Docs', 'Facilities', 'Orientation'] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const ROUNDS = ['Tech 1', 'Tech 2', 'HR'] as const;
export type Round = (typeof ROUNDS)[number];
export const RESULTS = ['Scheduled', 'Pass', 'Fail', 'No Show', 'Cancelled'] as const;
export type InterviewResult = (typeof RESULTS)[number];

export interface SalaryBreakup {
  basic: number;
  hra: number;
  special: number;
  employerPf: number;
  gratuity: number;
  variable: number;
}

export interface Candidate {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  hiringManager: string;
  managerEmail: string;
  salary: number | null; // annual CTC
  breakup: SalaryBreakup;
  startDate: string; // yyyy-MM-dd
  workLocation: string;
  employmentType: string;
  currentCompany: string;
  experienceYears: number | null;
  skills: string;
  aiSummary: string;
  resumeFileName: string;
  resumeUrl: string;
  source: string;
  status: CandidateStatus;
  envelopeId: string;
  offerSentOn: string;
  respondedOn: string;
  declineReason: string;
  signedOfferUrl: string;
  notes: string;
  created: string;
  modified: string;
}

export type CandidateInput = Omit<
  Candidate,
  'id' | 'status' | 'envelopeId' | 'offerSentOn' | 'respondedOn' | 'declineReason' | 'signedOfferUrl' | 'created' | 'modified'
>;

export interface OnboardingTask {
  id: number;
  title: string;
  candidateId: number;
  category: TaskCategory;
  dueDate: string;
  isDone: boolean;
  owner: string;
}

export interface Interview {
  id: number;
  candidateId: number;
  round: Round;
  interviewerName: string;
  interviewerEmail: string;
  scheduledStart: string; // ISO
  durationMinutes: number;
  meetingLink: string;
  eventId: string;
  result: InterviewResult;
  rating: number | null;
  feedback: string;
}

// Default checklist created when a candidate accepts. dayOffset is relative to the start date.
export const DEFAULT_TASKS: { title: string; category: TaskCategory; owner: string; dayOffset: number }[] = [
  { title: 'Collect ID proof & signed NDA', category: 'HR Docs', owner: 'HR', dayOffset: -7 },
  { title: 'Bank & tax details submitted', category: 'HR Docs', owner: 'HR', dayOffset: -5 },
  { title: 'Create email & M365 account', category: 'IT', owner: 'IT', dayOffset: -3 },
  { title: 'Ship laptop & accessories', category: 'IT', owner: 'IT', dayOffset: -3 },
  { title: 'Desk, access card & parking', category: 'Facilities', owner: 'Facilities', dayOffset: -1 },
  { title: 'Welcome session & team intro', category: 'Orientation', owner: 'Manager', dayOffset: 0 },
  { title: 'Assign buddy & 30-day goals', category: 'Orientation', owner: 'Manager', dayOffset: 2 },
];

// ---- Salary breakup ---------------------------------------------------------

export const EMPTY_BREAKUP: SalaryBreakup = { basic: 0, hra: 0, special: 0, employerPf: 0, gratuity: 0, variable: 0 };

/**
 * Standard CTC split: Basic 40% of CTC, HRA 50% of Basic, Employer PF 12% of Basic,
 * Gratuity 4.81% of Basic, optional variable %, Special Allowance is the balancing figure.
 */
export function computeBreakup(ctc: number, variablePct = 0): SalaryBreakup {
  const variable = Math.round((ctc * variablePct) / 100);
  const basic = Math.round(ctc * 0.4);
  const hra = Math.round(basic * 0.5);
  const employerPf = Math.round(basic * 0.12);
  const gratuity = Math.round(basic * 0.0481);
  const special = ctc - variable - basic - hra - employerPf - gratuity;
  return { basic, hra, special, employerPf, gratuity, variable };
}

export const breakupTotal = (b: SalaryBreakup): number =>
  b.basic + b.hra + b.special + b.employerPf + b.gratuity + b.variable;

// ---- Mapping helpers --------------------------------------------------------

type Row = Record<string, unknown>;

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
// SharePoint choice columns come back as { Value: '...' } through the connector
const choice = (v: unknown): string =>
  v && typeof v === 'object' && 'Value' in (v as Row) ? str((v as Row).Value) : str(v);
const dateOnly = (v: unknown): string => str(v).slice(0, 10);
const num = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number(v));
// OData string literal escaping for $filter values
const odata = (s: string): string => s.replace(/'/g, "''");

// Local yyyy-MM-dd (toISOString would shift the day for timezones ahead of UTC)
export const toDateInput = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function unwrap<T>(result: { success: boolean; data: T; error?: unknown }, action: string): T {
  if (!result.success) {
    const err = result.error as { message?: string } | undefined;
    throw new Error(`${action} failed${err?.message ? `: ${err.message}` : ''}`);
  }
  return result.data;
}

function toCandidate(r: Row): Candidate {
  const status = choice(r.Status) as CandidateStatus;
  return {
    id: Number(r.ID ?? r.Id),
    fullName: str(r.Title),
    email: str(r.Email),
    phone: str(r.Phone),
    position: str(r.Position),
    department: str(r.Department),
    hiringManager: str(r.HiringManager),
    managerEmail: str(r.ManagerEmail),
    salary: num(r.Salary),
    breakup: {
      basic: num(r.SalBasic) ?? 0,
      hra: num(r.SalHRA) ?? 0,
      special: num(r.SalSpecial) ?? 0,
      employerPf: num(r.SalEmployerPF) ?? 0,
      gratuity: num(r.SalGratuity) ?? 0,
      variable: num(r.SalVariable) ?? 0,
    },
    startDate: dateOnly(r.StartDate),
    workLocation: str(r.WorkLocation),
    employmentType: choice(r.EmploymentType) || 'Full-time',
    currentCompany: str(r.CurrentCompany),
    experienceYears: num(r.ExperienceYears),
    skills: str(r.Skills),
    aiSummary: str(r.AiSummary),
    resumeFileName: str(r.ResumeFileName),
    resumeUrl: str(r.ResumeUrl),
    source: str(r.Source),
    status: STATUSES.includes(status) ? status : 'Applied',
    envelopeId: str(r.EnvelopeId),
    offerSentOn: str(r.OfferSentOn),
    respondedOn: str(r.RespondedOn),
    declineReason: str(r.DeclineReason),
    signedOfferUrl: str(r.SignedOfferUrl),
    notes: str(r.Notes),
    created: str(r.Created),
    modified: str(r.Modified),
  };
}

function toTask(r: Row): OnboardingTask {
  return {
    id: Number(r.ID ?? r.Id),
    title: str(r.Title),
    candidateId: Number(r.CandidateId),
    category: (choice(r.Category) || 'HR Docs') as TaskCategory,
    dueDate: dateOnly(r.DueDate),
    isDone: r.IsDone === true || r.IsDone === 'true',
    owner: str(r.TaskOwner),
  };
}

function toInterview(r: Row): Interview {
  return {
    id: Number(r.ID ?? r.Id),
    candidateId: Number(r.CandidateId),
    round: (choice(r.Round) || 'Tech 1') as Round,
    interviewerName: str(r.InterviewerName),
    interviewerEmail: str(r.InterviewerEmail),
    scheduledStart: str(r.ScheduledStart),
    durationMinutes: num(r.DurationMinutes) ?? 60,
    meetingLink: str(r.MeetingLink),
    eventId: str(r.EventId),
    result: (choice(r.Result) || 'Scheduled') as InterviewResult,
    rating: num(r.Rating),
    feedback: str(r.Feedback),
  };
}

function candidateFields(input: CandidateInput): Row {
  return {
    Title: input.fullName.trim(),
    Email: input.email.trim(),
    Phone: input.phone.trim(),
    Position: input.position.trim(),
    Department: input.department.trim(),
    HiringManager: input.hiringManager.trim(),
    ManagerEmail: input.managerEmail.trim(),
    Salary: input.salary,
    SalBasic: input.breakup.basic,
    SalHRA: input.breakup.hra,
    SalSpecial: input.breakup.special,
    SalEmployerPF: input.breakup.employerPf,
    SalGratuity: input.breakup.gratuity,
    SalVariable: input.breakup.variable,
    StartDate: input.startDate || null,
    WorkLocation: input.workLocation.trim(),
    EmploymentType: { Value: input.employmentType },
    CurrentCompany: input.currentCompany.trim(),
    ExperienceYears: input.experienceYears,
    Skills: input.skills,
    AiSummary: input.aiSummary,
    ResumeFileName: input.resumeFileName,
    ResumeUrl: input.resumeUrl,
    Source: input.source,
    Notes: input.notes,
  };
}

// ---- Candidates -------------------------------------------------------------

export async function listCandidates(): Promise<Candidate[]> {
  const data = unwrap(
    await SharePointService.GetItems(SITE, CANDIDATES_LIST, undefined, 'Modified desc', 500),
    'Loading candidates',
  );
  return ((data?.value ?? []) as Row[]).map(toCandidate);
}

export async function getCandidate(id: number): Promise<Candidate> {
  return toCandidate(unwrap(await SharePointService.GetItem(SITE, CANDIDATES_LIST, id), 'Loading candidate'));
}

export async function createCandidate(input: CandidateInput): Promise<Candidate> {
  const row = unwrap(
    await SharePointService.PostItem(SITE, CANDIDATES_LIST, { ...candidateFields(input), Status: { Value: 'Applied' } }),
    'Saving candidate',
  );
  return toCandidate(row);
}

export async function updateCandidate(id: number, input: CandidateInput): Promise<Candidate> {
  return toCandidate(
    unwrap(await SharePointService.PatchItem(SITE, CANDIDATES_LIST, id, candidateFields(input)), 'Updating candidate'),
  );
}

export async function setStatus(id: number, status: CandidateStatus): Promise<Candidate> {
  const fields: Row = { Status: { Value: status } };
  // Re-sending an offer starts a fresh envelope, so clear the previous outcome
  if (status === 'Offer Requested') {
    Object.assign(fields, { EnvelopeId: '', DeclineReason: '', RespondedOn: null });
  }
  return toCandidate(unwrap(await SharePointService.PatchItem(SITE, CANDIDATES_LIST, id, fields), 'Updating status'));
}

// ---- Onboarding checklist ---------------------------------------------------

export async function listTasks(candidateId?: number): Promise<OnboardingTask[]> {
  const filter = candidateId === undefined ? undefined : `CandidateId eq ${candidateId}`;
  const data = unwrap(
    await SharePointService.GetItems(SITE, TASKS_LIST, filter, 'DueDate asc', 2000),
    'Loading checklist',
  );
  return ((data?.value ?? []) as Row[]).map(toTask);
}

export async function setTaskDone(taskId: number, isDone: boolean): Promise<void> {
  unwrap(await SharePointService.PatchItem(SITE, TASKS_LIST, taskId, { IsDone: isDone }), 'Updating task');
}

export async function createDefaultTasks(candidate: Candidate): Promise<void> {
  const base = candidate.startDate ? new Date(`${candidate.startDate}T00:00:00`) : new Date();
  for (const t of DEFAULT_TASKS) {
    const due = new Date(base);
    due.setDate(due.getDate() + t.dayOffset);
    unwrap(
      await SharePointService.PostItem(SITE, TASKS_LIST, {
        Title: t.title,
        CandidateId: candidate.id,
        Category: { Value: t.category },
        DueDate: toDateInput(due),
        IsDone: false,
        TaskOwner: t.owner,
      }),
      'Creating checklist',
    );
  }
}

// ---- Interviews -------------------------------------------------------------

export async function listInterviews(filter?: { candidateId?: number; interviewerEmail?: string }): Promise<Interview[]> {
  const parts: string[] = [];
  if (filter?.candidateId !== undefined) parts.push(`CandidateId eq ${filter.candidateId}`);
  if (filter?.interviewerEmail) parts.push(`InterviewerEmail eq '${odata(filter.interviewerEmail)}'`);
  const data = unwrap(
    await SharePointService.GetItems(SITE, INTERVIEWS_LIST, parts.join(' and ') || undefined, 'ScheduledStart asc', 2000),
    'Loading interviews',
  );
  return ((data?.value ?? []) as Row[]).map(toInterview);
}

/**
 * Which round can be scheduled next: rounds run strictly in order and a round only
 * unlocks once the previous one is passed. Returns null when nothing can be scheduled
 * (a round is pending, a round failed, or all rounds are passed).
 */
export function nextRound(interviews: Interview[]): Round | null {
  for (const round of ROUNDS) {
    const latest = interviews
      .filter((i) => i.round === round && i.result !== 'Cancelled')
      .sort((a, b) => b.id - a.id)[0];
    if (!latest) return round;
    if (latest.result === 'Pass') continue;
    if (latest.result === 'No Show') return round; // allow re-scheduling
    return null; // Scheduled (pending) or Fail
  }
  return null;
}

export interface ScheduleInput {
  candidate: Candidate;
  round: Round;
  interviewerName: string;
  interviewerEmail: string;
  start: Date;
  durationMinutes: number;
  meetingLink: string;
  createInvite: (args: {
    subject: string;
    start: Date;
    end: Date;
    attendees: string[];
    body: string;
    location: string;
  }) => Promise<string>; // returns the Outlook event id
}

export async function scheduleInterview(s: ScheduleInput): Promise<Interview> {
  const end = new Date(s.start.getTime() + s.durationMinutes * 60_000);
  const subject = `${COMPANY} | ${s.round} interview – ${s.candidate.fullName}${s.candidate.position ? ` (${s.candidate.position})` : ''}`;
  const body = interviewInviteHtml({
    candidateName: s.candidate.fullName,
    position: s.candidate.position,
    round: s.round,
    start: s.start,
    durationMinutes: s.durationMinutes,
    interviewerName: s.interviewerName,
    meetingLink: s.meetingLink,
    resumeUrl: s.candidate.resumeUrl,
  });
  const eventId = await s.createInvite({
    subject,
    start: s.start,
    end,
    attendees: [s.interviewerEmail, s.candidate.email].filter(Boolean),
    body,
    location: s.meetingLink || 'To be shared',
  });
  const row = unwrap(
    await SharePointService.PostItem(SITE, INTERVIEWS_LIST, {
      Title: `${s.round} – ${s.candidate.fullName}`,
      CandidateId: s.candidate.id,
      Round: { Value: s.round },
      InterviewerName: s.interviewerName.trim(),
      InterviewerEmail: s.interviewerEmail.trim().toLowerCase(),
      ScheduledStart: s.start.toISOString(),
      DurationMinutes: s.durationMinutes,
      MeetingLink: s.meetingLink,
      EventId: eventId,
      Result: { Value: 'Scheduled' },
    }),
    'Saving interview',
  );
  if (s.candidate.status === 'Applied') await setStatus(s.candidate.id, 'Interviewing');
  return toInterview(row);
}

/**
 * Records an interview outcome and moves the candidate along the pipeline:
 * any Fail → Not Selected; HR Pass → Selected (ready for offer).
 */
export async function recordResult(
  interview: Interview,
  result: InterviewResult,
  rating: number | null,
  feedback: string,
): Promise<CandidateStatus | null> {
  unwrap(
    await SharePointService.PatchItem(SITE, INTERVIEWS_LIST, interview.id, {
      Result: { Value: result },
      Rating: rating,
      Feedback: feedback,
    }),
    'Saving interview result',
  );
  let status: CandidateStatus | null = null;
  if (result === 'Fail') status = 'Not Selected';
  else if (result === 'Pass' && interview.round === 'HR') status = 'Selected';
  if (status) await setStatus(interview.candidateId, status);
  return status;
}
