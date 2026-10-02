import type { Candidate, CandidateStatus } from '../services/onboarding';
import { canClose, canSendOffer } from './offer';

export type ColumnId = 'applied' | 'interviewing' | 'selected' | 'offer' | 'accepted' | 'onboarded' | 'closed';

export const COLUMNS: { id: ColumnId; title: string; statuses: CandidateStatus[]; color: string }[] = [
  { id: 'applied', title: 'Applied', statuses: ['Applied'], color: '#64748b' },
  { id: 'interviewing', title: 'Interviewing', statuses: ['Interviewing'], color: '#6366f1' },
  { id: 'selected', title: 'Selected', statuses: ['Selected'], color: '#14b8a6' },
  { id: 'offer', title: 'Offer out', statuses: ['Offer Requested', 'Offer Sent'], color: '#f59e0b' },
  { id: 'accepted', title: 'Accepted', statuses: ['Accepted'], color: '#22c55e' },
  { id: 'onboarded', title: 'Onboarded', statuses: ['Onboarded'], color: '#a855f7' },
  { id: 'closed', title: 'Closed', statuses: ['Not Selected', 'Declined', 'Expired'], color: '#ef4444' },
];

/** Only these manual moves are allowed; every other stage is driven by interviews / DocuSign. */
export function canDrop(c: Candidate, to: ColumnId): boolean {
  if (to === 'offer') return canSendOffer(c);
  if (to === 'closed') return canClose(c);
  return false;
}
