// Message contract between the app and the "Onboarding Copilot" agent (see copilot/create-agent.mjs).
import type { Candidate, Interview, OnboardingTask, Round } from '../services/onboarding';

export type AgentAction =
  | { type: 'openCandidate'; candidateId: number; label?: string }
  | { type: 'scheduleInterview'; candidateId: number; round: Round; start: string; durationMins?: number; interviewerEmail: string; label?: string }
  | { type: 'sendOffer'; candidateId: number; label?: string }
  | { type: 'completeTask'; taskId: number; label?: string };

export interface AgentReply {
  answer: string;
  actions: AgentAction[];
  suggestions: string[];
}

const COMP_WORDS = /salary|ctc|compensation|pay|package|lpa|breakup|offer amount/i;
const clip = (s: string, n: number) => (s && s.length > n ? `${s.slice(0, n)}…` : s);

/**
 * Compact snapshot of what the signed-in user can already see. Salary is only included when the
 * question is about compensation, so it never leaks into unrelated answers.
 */
export function buildSnapshot(question: string, candidates: Candidate[], interviews: Interview[], tasks: OnboardingTask[]) {
  const withPay = COMP_WORDS.test(question);
  return {
    candidates: candidates.map((c) => ({
      id: c.id, name: c.fullName, email: c.email, status: c.status, position: c.position, department: c.department,
      manager: c.hiringManager, managerEmail: c.managerEmail, startDate: c.startDate, location: c.workLocation,
      experienceYears: c.experienceYears, skills: clip(c.skills, 160), summary: clip(c.aiSummary, 220), source: c.source,
      offerSentOn: c.offerSentOn || undefined, respondedOn: c.respondedOn || undefined, declineReason: c.declineReason || undefined,
      ...(withPay ? { annualCtc: c.salary } : {}),
    })),
    interviews: interviews.map((i) => ({
      id: i.id, candidateId: i.candidateId, round: i.round, interviewer: i.interviewerName, interviewerEmail: i.interviewerEmail,
      start: i.scheduledStart, durationMins: i.durationMinutes, result: i.result, rating: i.rating, feedback: clip(i.feedback, 200),
    })),
    tasks: tasks.map((t) => ({ id: t.id, candidateId: t.candidateId, title: t.title, category: t.category, due: t.dueDate, done: t.isDone, owner: t.owner })),
  };
}

const ACTION_TYPES = new Set(['openCandidate', 'scheduleInterview', 'sendOffer', 'completeTask']);

/** Agents occasionally wrap JSON in fences or add prose — accept all of those, fall back to plain text. */
export function parseReply(raw: string): AgentReply {
  const text = (raw ?? '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(text.slice(start, end + 1)) as Partial<AgentReply>;
      if (typeof obj.answer === 'string') {
        return {
          answer: obj.answer,
          actions: (Array.isArray(obj.actions) ? obj.actions : []).filter((a): a is AgentAction => !!a && ACTION_TYPES.has((a as AgentAction).type)),
          suggestions: (Array.isArray(obj.suggestions) ? obj.suggestions : []).filter((s): s is string => typeof s === 'string').slice(0, 3),
        };
      }
    } catch {
      /* not JSON — show as text */
    }
  }
  return { answer: text || 'Sorry, I could not come up with an answer.', actions: [], suggestions: [] };
}
