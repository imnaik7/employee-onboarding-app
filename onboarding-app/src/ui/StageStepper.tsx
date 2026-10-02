import { motion } from 'motion/react';
import { Checkmark16Filled, Dismiss16Filled } from '@fluentui/react-icons';
import { ROUNDS, type Candidate, type Interview } from '../services/onboarding';

type State = 'done' | 'current' | 'failed' | 'todo';
interface Stage {
  label: string;
  state: State;
}

const OFFER_OUT = ['Offer Sent', 'Accepted', 'Declined', 'Expired', 'Onboarded'];

/** Resume → Tech 1 → Tech 2 → HR → Offer → Joined, derived from status + interview results. */
function buildStages(c: Candidate, interviews: Interview[]): Stage[] {
  const stages: Stage[] = [{ label: 'Resume', state: 'done' }];
  let blocked = false;
  for (const round of ROUNDS) {
    const latest = interviews.filter((i) => i.round === round && i.result !== 'Cancelled').sort((a, b) => b.id - a.id)[0];
    let state: State = 'todo';
    if (latest?.result === 'Pass') state = 'done';
    else if (latest?.result === 'Fail') state = 'failed';
    else if (!blocked && c.status !== 'Not Selected') state = 'current';
    if (blocked) state = 'todo';
    if (state !== 'done') blocked = true;
    stages.push({ label: round === 'HR' ? 'HR' : round, state });
  }
  const offerState: State =
    c.status === 'Declined' || c.status === 'Expired'
      ? 'failed'
      : OFFER_OUT.includes(c.status)
        ? c.status === 'Offer Sent'
          ? 'current'
          : 'done'
        : c.status === 'Selected' || c.status === 'Offer Requested'
          ? 'current'
          : 'todo';
  stages.push({ label: 'Offer', state: c.status === 'Not Selected' ? 'todo' : offerState });
  stages.push({
    label: 'Joined',
    state: c.status === 'Onboarded' ? 'done' : c.status === 'Accepted' ? 'current' : 'todo',
  });
  return stages;
}

export function StageStepper({ candidate, interviews }: { candidate: Candidate; interviews: Interview[] }) {
  const stages = buildStages(candidate, interviews);
  const doneCount = stages.filter((s) => s.state === 'done').length;
  return (
    <ol className="stepper" aria-label="Hiring stages">
      <motion.span
        className="stepper-fill"
        initial={{ width: 0 }}
        animate={{ width: `${(Math.max(doneCount - 1, 0) / (stages.length - 1)) * 100}%` }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        aria-hidden
      />
      {stages.map((s, i) => (
        <li key={s.label} className={`step ${s.state}`} aria-current={s.state === 'current' ? 'step' : undefined}>
          <motion.span
            className="step-dot"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.07, type: 'spring', stiffness: 380, damping: 22 }}
          >
            {s.state === 'done' ? <Checkmark16Filled /> : s.state === 'failed' ? <Dismiss16Filled /> : i + 1}
          </motion.span>
          <span className="step-label">{s.label}</span>
        </li>
      ))}
    </ol>
  );
}
