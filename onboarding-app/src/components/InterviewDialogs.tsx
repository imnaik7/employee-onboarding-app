import { useState } from 'react';
import {
  Button,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerHeaderTitle,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  OverlayDrawer,
  Radio,
  RadioGroup,
  Textarea,
} from '@fluentui/react-components';
import { Dismiss24Regular, Star24Filled, Star24Regular } from '@fluentui/react-icons';
import { motion } from 'motion/react';
import {
  recordResult,
  scheduleInterview,
  type Candidate,
  type CandidateStatus,
  type Interview,
  type InterviewResult,
  type Round,
} from '../services/onboarding';
import { createInvite } from '../services/calendar';
import { errorText, useToast } from '../hooks/useToast';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function defaultStart(): string {
  // Next working day at 10:00 local time, formatted for <input type="datetime-local">
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T10:00`;
}

function DrawerShell({ title, open, onClose, children, footer }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <OverlayDrawer open={open} onOpenChange={(_, d) => !d.open && onClose()} position="end" size="medium" className="glass-drawer">
      <DrawerHeader>
        <DrawerHeaderTitle action={<Button appearance="subtle" aria-label="Close" icon={<Dismiss24Regular />} onClick={onClose} />}>{title}</DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody className="drawer-form">{children}</DrawerBody>
      <DrawerFooter>{footer}</DrawerFooter>
    </OverlayDrawer>
  );
}

export function ScheduleDialog({
  candidate,
  round,
  open,
  onClose,
  onDone,
}: {
  candidate: Candidate;
  round: Round;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const notify = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [start, setStart] = useState(defaultStart);
  const [duration, setDuration] = useState('60');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim() || !EMAIL.test(email.trim())) {
      setError('Enter the interviewer name and a valid email');
      return;
    }
    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime()) || startDate.getTime() < Date.now()) {
      setError('Pick a date and time in the future');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await scheduleInterview({
        candidate,
        round,
        interviewerName: name,
        interviewerEmail: email,
        start: startDate,
        durationMinutes: Number(duration),
        meetingLink: link.trim(),
        createInvite,
      });
      notify(`${round} interview scheduled`, `Outlook invite sent to ${name} and ${candidate.fullName}.`);
      onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DrawerShell
      title={`Schedule ${round} interview`}
      open={open}
      onClose={onClose}
      footer={
        <>
          <Button appearance="primary" onClick={submit} disabled={busy}>
            {busy ? 'Sending invite…' : 'Send invite'}
          </Button>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
        </>
      }
    >
      <p className="muted">
        For <strong>{candidate.fullName}</strong> · {candidate.position || 'candidate'}
      </p>
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}
      <Field label="Interviewer name" required>
        <Input value={name} onChange={(_, d) => setName(d.value)} />
      </Field>
      <Field label="Interviewer email" required>
        <Input type="email" value={email} onChange={(_, d) => setEmail(d.value)} />
      </Field>
      <div className="form-grid-2">
        <Field label="Date & time" required>
          <Input type="datetime-local" value={start} onChange={(_, d) => setStart(d.value)} />
        </Field>
        <Field label="Duration">
          <Dropdown value={`${duration} min`} selectedOptions={[duration]} onOptionSelect={(_, d) => setDuration(d.optionValue ?? '60')}>
            {['30', '45', '60', '90'].map((m) => (
              <Option key={m} value={m}>{`${m} min`}</Option>
            ))}
          </Dropdown>
        </Field>
      </div>
      <Field label="Meeting link (Teams / Zoom)" hint="Optional — otherwise the invite says the link will be shared">
        <Input value={link} onChange={(_, d) => setLink(d.value)} placeholder="https://teams.microsoft.com/…" />
      </Field>
      <MessageBar intent="info">
        <MessageBarBody>A branded Outlook invite goes to the interviewer and {candidate.email} from your calendar.</MessageBarBody>
      </MessageBar>
    </DrawerShell>
  );
}

const RESULT_HINT: Partial<Record<InterviewResult, string>> = {
  Fail: 'The candidate will be marked Not Selected.',
  'No Show': 'The round can be rescheduled.',
  Cancelled: 'The round can be scheduled again.',
};

export function ResultDialog({
  interview,
  candidateName,
  open,
  onClose,
  onDone,
}: {
  interview: Interview;
  candidateName?: string;
  open: boolean;
  onClose: () => void;
  onDone: (newStatus: CandidateStatus | null) => void;
}) {
  const notify = useToast();
  const [result, setResult] = useState<InterviewResult>('Pass');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if ((result === 'Pass' || result === 'Fail') && !feedback.trim()) {
      setError('Please add a short feedback note');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const status = await recordResult(interview, result, rating || null, feedback.trim());
      notify(
        `${interview.round}: ${result}`,
        status === 'Selected' ? 'All rounds cleared — ready for an offer 🎉' : status === 'Not Selected' ? 'Candidate marked Not Selected.' : undefined,
        result === 'Fail' ? 'warning' : 'success',
      );
      onDone(status);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const hint = result === 'Pass' && interview.round === 'HR' ? 'All rounds cleared — the candidate moves to Selected.' : RESULT_HINT[result];

  return (
    <DrawerShell
      title={`${interview.round} result`}
      open={open}
      onClose={onClose}
      footer={
        <>
          <Button appearance="primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Save result'}
          </Button>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
        </>
      }
    >
      {candidateName && (
        <p className="muted">
          <strong>{candidateName}</strong> · with {interview.interviewerName}
        </p>
      )}
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}
      <Field label="Outcome">
        <RadioGroup layout="horizontal" value={result} onChange={(_, d) => setResult(d.value as InterviewResult)}>
          <Radio value="Pass" label="Pass" />
          <Radio value="Fail" label="Fail" />
          <Radio value="No Show" label="No show" />
          <Radio value="Cancelled" label="Cancelled" />
        </RadioGroup>
      </Field>
      <Field label="Rating">
        <div className="stars" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <motion.button
              key={n}
              type="button"
              role="radio"
              aria-checked={n === rating}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              className={`star ${n <= rating ? 'on' : ''}`}
              onClick={() => setRating(n === rating ? 0 : n)}
              whileTap={{ scale: 0.8 }}
              whileHover={{ scale: 1.15 }}
            >
              {n <= rating ? <Star24Filled /> : <Star24Regular />}
            </motion.button>
          ))}
        </div>
      </Field>
      <Field label="Feedback" required={result === 'Pass' || result === 'Fail'}>
        <Textarea value={feedback} onChange={(_, d) => setFeedback(d.value)} rows={6} resize="vertical" placeholder="Strengths, gaps, recommendation…" />
      </Field>
      {hint && (
        <MessageBar intent={result === 'Fail' ? 'warning' : result === 'Pass' ? 'success' : 'info'}>
          <MessageBarBody>{hint}</MessageBarBody>
        </MessageBar>
      )}
    </DrawerShell>
  );
}
