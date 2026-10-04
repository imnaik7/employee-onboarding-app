// Runs an agent-proposed action with the app's own services — the same code paths as the screens,
// so validation, Outlook invites and the DocuSign flow behave exactly as when clicked manually.
import { scheduleInterview, setStatus, setTaskDone, type Candidate, type Interview, type OnboardingTask } from '../services/onboarding';
import { createInvite } from '../services/calendar';
import { canSendOffer, offerGaps } from '../utils/offer';
import type { Navigate } from '../state/nav';
import type { AgentAction } from './protocol';

interface Ctx {
  candidates: Candidate[];
  interviews: Interview[];
  tasks: OnboardingTask[];
  navigate: Navigate;
}

const fmt = (d: Date) => d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Human description + any reason it cannot run — shown on the action card before the user confirms. */
export function describe(a: AgentAction, ctx: Ctx): { title: string; detail: string; blocker?: string } {
  const cand = 'candidateId' in a ? ctx.candidates.find((c) => c.id === a.candidateId) : undefined;
  if (a.type !== 'completeTask' && !cand) return { title: a.label ?? 'Action', detail: '', blocker: 'That candidate is not in your list.' };
  switch (a.type) {
    case 'openCandidate':
      return { title: a.label ?? `Open ${cand!.fullName}`, detail: `${cand!.position || 'Candidate'} · ${cand!.status}` };
    case 'scheduleInterview': {
      const start = new Date(a.start);
      const bad = Number.isNaN(start.getTime()) ? 'The proposed time is not valid.' : start.getTime() < Date.now() ? 'The proposed time is in the past.' : '';
      const email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.interviewerEmail ?? '') ? '' : 'Interviewer email is missing.';
      return {
        title: a.label ?? `Schedule ${a.round} for ${cand!.fullName}`,
        detail: `${bad ? '' : fmt(start)} · ${a.durationMins ?? 45} min · ${a.interviewerEmail} · Outlook invite to both`,
        blocker: bad || email || undefined,
      };
    }
    case 'sendOffer': {
      const gaps = offerGaps(cand!);
      return {
        title: a.label ?? `Send offer to ${cand!.fullName}`,
        detail: `DocuSign offer letter to ${cand!.email}`,
        blocker: !canSendOffer(cand!) ? `${cand!.fullName} is "${cand!.status}" — offers go to Selected candidates.` : gaps.length ? `Missing ${gaps.join(', ')}.` : undefined,
      };
    }
    case 'completeTask': {
      const t = ctx.tasks.find((x) => x.id === a.taskId);
      const who = t && ctx.candidates.find((c) => c.id === t.candidateId);
      return t
        ? { title: a.label ?? `Mark “${t.title}” done`, detail: `${who?.fullName ?? ''} · ${t.category}`, blocker: t.isDone ? 'Already done.' : undefined }
        : { title: a.label ?? 'Complete task', detail: '', blocker: 'Task not found.' };
    }
  }
}

/** Executes the action; returns a short confirmation for the chat. */
export async function runAction(a: AgentAction, ctx: Ctx): Promise<string> {
  switch (a.type) {
    case 'openCandidate':
      ctx.navigate({ page: 'detail', id: a.candidateId });
      return 'Opened.';
    case 'scheduleInterview': {
      const candidate = ctx.candidates.find((c) => c.id === a.candidateId)!;
      const known = ctx.interviews.find((i) => i.interviewerEmail.toLowerCase() === a.interviewerEmail.toLowerCase());
      const name = known?.interviewerName || a.interviewerEmail.split('@')[0]!.replace(/[._]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
      await scheduleInterview({
        candidate, round: a.round, interviewerName: name, interviewerEmail: a.interviewerEmail, start: new Date(a.start),
        durationMinutes: a.durationMins ?? 45, meetingLink: '', createInvite,
      });
      return `${a.round} interview scheduled — Outlook invite sent to ${name} and ${candidate.fullName}.`;
    }
    case 'sendOffer': {
      const c = ctx.candidates.find((x) => x.id === a.candidateId)!;
      await setStatus(c.id, 'Offer Requested');
      return `Offer requested — DocuSign will email ${c.email} in a minute.`;
    }
    case 'completeTask':
      await setTaskDone(a.taskId, true);
      return 'Task marked done.';
  }
}
