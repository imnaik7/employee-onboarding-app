import type { CandidateStatus } from '../services/onboarding';

const TONE: Record<CandidateStatus, string> = {
  Applied: 'slate',
  Interviewing: 'indigo',
  'Not Selected': 'gray',
  Selected: 'teal',
  'Offer Requested': 'amber',
  'Offer Sent': 'amber',
  Accepted: 'green',
  Declined: 'red',
  Expired: 'gray',
  Onboarded: 'violet',
};

/** Dot + label pill; pulses while the status is "in flight" (offer out). */
export function StatusBadge({ status }: { status: CandidateStatus }) {
  const live = status === 'Offer Requested' || status === 'Offer Sent';
  return (
    <span className={`status status-${TONE[status]}`}>
      <span className={`status-dot ${live ? 'live' : ''}`} aria-hidden />
      {status}
    </span>
  );
}
