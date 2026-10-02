import { breakupTotal, type Candidate } from '../services/onboarding';

/** Everything printed on the offer letter must be present before it can be sent. */
export function offerGaps(c: Candidate): string[] {
  const gaps: string[] = [];
  if (!c.position) gaps.push('position');
  if (!c.department) gaps.push('department');
  if (!c.startDate) gaps.push('start date');
  if (!c.workLocation) gaps.push('work location');
  if (!c.hiringManager) gaps.push('hiring manager');
  if (!c.salary) gaps.push('annual CTC');
  else if (breakupTotal(c.breakup) !== c.salary) gaps.push('salary breakup (must add up to the CTC)');
  return gaps;
}

export const canSendOffer = (c: Candidate) => c.status === 'Selected' || c.status === 'Declined' || c.status === 'Expired';
export const canClose = (c: Candidate) => c.status === 'Applied' || c.status === 'Interviewing' || c.status === 'Selected';
