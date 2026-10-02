import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Avatar,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Link,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Tab,
  TabList,
} from '@fluentui/react-components';
import {
  ArrowClockwise20Regular,
  Briefcase16Regular,
  CalendarAdd20Regular,
  Call16Regular,
  CheckmarkCircle20Regular,
  DocumentPdf20Regular,
  Edit20Regular,
  Location16Regular,
  Mail16Regular,
  Send20Filled,
  Sparkle20Filled,
  Star16Filled,
  Video16Regular,
} from '@fluentui/react-icons';
import { useAppData } from '../state/appDataContext';
import type { DetailTab, Navigate } from '../state/nav';
import {
  EDITABLE_STATUSES,
  TASK_CATEGORIES,
  createDefaultTasks,
  nextRound,
  setStatus,
  setTaskDone,
  type SalaryBreakup,
} from '../services/onboarding';
import { StatusBadge } from '../components/StatusBadge';
import { ResultDialog, ScheduleDialog } from '../components/InterviewDialogs';
import { GlassCard, Pill, SectionTitle } from '../ui/GlassCard';
import { StageStepper } from '../ui/StageStepper';
import { ProgressRing, StackedBar } from '../ui/charts';
import { Confetti } from '../ui/Confetti';
import { errorText, useToast } from '../hooks/useToast';
import { formatDate, formatDateTime, formatSalary } from '../utils/format';
import { canSendOffer, offerGaps } from '../utils/offer';
import type { Interview } from '../services/onboarding';

const BREAKUP: { key: keyof SalaryBreakup; label: string; color: string }[] = [
  { key: 'basic', label: 'Basic', color: '#6366f1' },
  { key: 'hra', label: 'HRA', color: '#8b5cf6' },
  { key: 'special', label: 'Special allowance', color: '#ec4899' },
  { key: 'employerPf', label: 'Employer PF', color: '#14b8a6' },
  { key: 'gratuity', label: 'Gratuity', color: '#f59e0b' },
  { key: 'variable', label: 'Variable / bonus', color: '#38bdf8' },
];

interface Props {
  id: number;
  initialTab?: DetailTab;
  onNavigate: Navigate;
}

export function CandidateDetail({ id, initialTab, onNavigate }: Props) {
  const { byId, interviews: allInterviews, tasks: allTasks, refresh, loading } = useAppData();
  const notify = useToast();
  const c = byId.get(id);
  const interviews = useMemo(() => allInterviews.filter((i) => i.candidateId === id).sort((a, b) => a.id - b.id), [allInterviews, id]);
  const tasks = useMemo(() => allTasks.filter((t) => t.candidateId === id), [allTasks, id]);
  const [tab, setTab] = useState<DetailTab>(initialTab ?? 'overview');
  const [busy, setBusy] = useState(false);
  const [confirmOffer, setConfirmOffer] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [recording, setRecording] = useState<Interview | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  // While DocuSign is working, poll so the status flips without a manual reload
  useEffect(() => {
    if (c?.status !== 'Offer Requested' && c?.status !== 'Offer Sent') return;
    const t = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(t);
  }, [c?.status, refresh]);

  if (!c) {
    return (
      <div className="page">
        <MessageBar intent="warning">
          <MessageBarBody>This candidate could not be found — it may have been removed.</MessageBarBody>
        </MessageBar>
      </div>
    );
  }

  const run = async (fn: () => Promise<unknown>, success?: [string, string?]) => {
    setBusy(true);
    try {
      await fn();
      if (success) notify(success[0], success[1]);
      await refresh();
    } catch (err) {
      notify('Something went wrong', errorText(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const gaps = offerGaps(c);
  const round = c.status === 'Applied' || c.status === 'Interviewing' ? nextRound(interviews) : null;
  const doneCount = tasks.filter((t) => t.isDone).length;
  const accepted = c.status === 'Accepted' || c.status === 'Onboarded';
  const skills = c.skills
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="page">
      <Confetti fire={celebrate} onDone={() => setCelebrate(false)} />

      <GlassCard className="profile-hero" padded={false}>
        <div className="profile-hero-bg" aria-hidden />
        <div className="profile-hero-inner">
          <div className="avatar-ring">
            <Avatar name={c.fullName} size={72} color="colorful" />
          </div>
          <div className="grow">
            <div className="title-row">
              <h2>{c.fullName}</h2>
              <StatusBadge status={c.status} />
            </div>
            <div className="meta-row muted">
              {c.position && (
                <span>
                  <Briefcase16Regular /> {c.position}
                  {c.department ? ` · ${c.department}` : ''}
                </span>
              )}
              <span>
                <Mail16Regular /> {c.email}
              </span>
              {c.phone && (
                <span>
                  <Call16Regular /> {c.phone}
                </span>
              )}
              {c.workLocation && (
                <span>
                  <Location16Regular /> {c.workLocation}
                </span>
              )}
            </div>
          </div>
          <div className="hero-actions">
            <Button appearance="subtle" icon={<ArrowClockwise20Regular className={loading ? 'spin' : ''} />} onClick={() => void refresh()} aria-label="Refresh" />
            {EDITABLE_STATUSES.includes(c.status) && (
              <Button icon={<Edit20Regular />} onClick={() => onNavigate({ page: 'edit', id: c.id })}>
                Edit
              </Button>
            )}
            {round && (
              <Button appearance="primary" icon={<CalendarAdd20Regular />} onClick={() => setScheduling(true)}>
                Schedule {round}
              </Button>
            )}
            {canSendOffer(c) && (
              <Button appearance="primary" icon={<Send20Filled />} onClick={() => setConfirmOffer(true)} disabled={busy || gaps.length > 0}>
                {c.status === 'Selected' ? 'Send offer' : 'Re-send offer'}
              </Button>
            )}
          </div>
        </div>
        <div className="profile-stepper">
          <StageStepper candidate={c} interviews={interviews} />
        </div>
      </GlassCard>

      {canSendOffer(c) && gaps.length > 0 && (
        <MessageBar intent="warning">
          <MessageBarBody>
            <MessageBarTitle>Complete the profile to send an offer</MessageBarTitle>
            Missing: {gaps.join(', ')}.
          </MessageBarBody>
        </MessageBar>
      )}
      {(c.status === 'Offer Requested' || c.status === 'Offer Sent') && (
        <MessageBar intent="info" className="shimmer-bar">
          <MessageBarBody>
            {c.status === 'Offer Requested' ? 'Generating the offer letter and sending it through DocuSign…' : `Offer sent ${formatDateTime(c.offerSentOn)} — waiting for ${c.fullName.split(' ')[0]} to sign.`}
          </MessageBarBody>
        </MessageBar>
      )}

      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as DetailTab)} appearance="subtle-circular">
        <Tab value="overview">Overview</Tab>
        <Tab value="interviews">Interviews · {interviews.length}</Tab>
        <Tab value="offer">Offer</Tab>
        <Tab value="onboarding" disabled={!accepted}>
          Onboarding{accepted && tasks.length ? ` · ${doneCount}/${tasks.length}` : ''}
        </Tab>
      </TabList>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
          {tab === 'overview' && (
            <div className="bento">
              <GlassCard index={0} className="b-summary">
                <SectionTitle title="AI profile summary" action={<Sparkle20Filled className="ai-icon" />} />
                <p className="summary">{c.aiSummary || 'No summary yet — upload a resume with AI auto-fill to generate one.'}</p>
                {c.resumeUrl && (
                  <Button as="a" href={c.resumeUrl} target="_blank" icon={<DocumentPdf20Regular />} appearance="secondary" size="small">
                    {c.resumeFileName || 'Open resume'}
                  </Button>
                )}
              </GlassCard>
              <GlassCard index={1} className="b-facts">
                <SectionTitle title="Details" />
                <dl className="facts">
                  <dt>Current company</dt>
                  <dd>{c.currentCompany || '—'}</dd>
                  <dt>Experience</dt>
                  <dd>{c.experienceYears !== null ? `${c.experienceYears} years` : '—'}</dd>
                  <dt>Employment</dt>
                  <dd>{c.employmentType}</dd>
                  <dt>Start date</dt>
                  <dd>{formatDate(c.startDate)}</dd>
                  <dt>Hiring manager</dt>
                  <dd>{c.hiringManager || '—'}</dd>
                  <dt>Source</dt>
                  <dd>{c.source || '—'}</dd>
                </dl>
              </GlassCard>
              <GlassCard index={2} className="b-skills">
                <SectionTitle title="Skills" hint={skills.length ? `${skills.length} skills` : undefined} />
                {skills.length === 0 && <p className="muted">No skills captured.</p>}
                <div className="skill-cloud">
                  {skills.map((s, i) => (
                    <motion.span key={s} className="skill" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.03 }}>
                      {s}
                    </motion.span>
                  ))}
                </div>
              </GlassCard>
              <GlassCard index={3} className="b-ctc">
                <SectionTitle title="Compensation" />
                <div className="ctc-big tabular">{c.salary ? `₹ ${formatSalary(c.salary)}` : '—'}</div>
                <span className="muted small">{c.salary ? `₹ ${formatSalary(Math.round(c.salary / 12))} / month` : 'Not set'}</span>
                {!!c.salary && <StackedBar parts={BREAKUP.map((b) => ({ label: b.label, value: c.breakup[b.key], color: b.color }))} />}
              </GlassCard>
              {c.notes && (
                <GlassCard index={4} className="b-notes">
                  <SectionTitle title="Notes" />
                  <p className="pre">{c.notes}</p>
                </GlassCard>
              )}
            </div>
          )}

          {tab === 'interviews' && (
            <GlassCard>
              <SectionTitle
                title="Interview journey"
                hint="Tech 1 → Tech 2 → HR"
                action={
                  round && (
                    <Button appearance="primary" size="small" icon={<CalendarAdd20Regular />} onClick={() => setScheduling(true)}>
                      Schedule {round}
                    </Button>
                  )
                }
              />
              {interviews.length === 0 && <p className="muted">No interviews yet.</p>}
              <ol className="vtimeline">
                {interviews.map((i, idx) => (
                  <motion.li key={i.id} className={`vt-item r-${i.result.replace(' ', '').toLowerCase()}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.06 }}>
                    <span className="vt-dot" aria-hidden />
                    <div className="vt-card">
                      <div className="vt-head">
                        <Pill tone="brand">{i.round}</Pill>
                        <strong>{formatDateTime(i.scheduledStart)}</strong>
                        <span className="muted small">
                          {i.durationMinutes} min · {i.interviewerName}
                        </span>
                        <span className="grow" />
                        <Pill tone={i.result === 'Pass' ? 'ok' : i.result === 'Fail' ? 'bad' : i.result === 'Scheduled' ? 'brand' : 'warn'}>{i.result}</Pill>
                      </div>
                      {!!i.rating && (
                        <span className="rating" aria-label={`${i.rating} of 5 stars`}>
                          {Array.from({ length: 5 }, (_, n) => (
                            <Star16Filled key={n} className={n < (i.rating ?? 0) ? 'on' : 'off'} />
                          ))}
                        </span>
                      )}
                      {i.feedback && <p className="feedback">“{i.feedback}”</p>}
                      <div className="row-actions">
                        {i.meetingLink && i.result === 'Scheduled' && (
                          <Button as="a" href={i.meetingLink} target="_blank" size="small" icon={<Video16Regular />}>
                            Join
                          </Button>
                        )}
                        {i.result === 'Scheduled' && (
                          <Button size="small" appearance="primary" icon={<CheckmarkCircle20Regular />} onClick={() => setRecording(i)}>
                            Record result
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </GlassCard>
          )}

          {tab === 'offer' && (
            <div className="grid-2">
              <GlassCard>
                <SectionTitle title="Salary breakup" hint="As printed on the offer letter" />
                {c.salary ? (
                  <>
                    <StackedBar parts={BREAKUP.map((b) => ({ label: b.label, value: c.breakup[b.key], color: b.color }))} height={14} />
                    <table className="breakup">
                      <thead>
                        <tr>
                          <th>Component</th>
                          <th className="num">Annual</th>
                          <th className="num">Monthly</th>
                        </tr>
                      </thead>
                      <tbody>
                        {BREAKUP.filter((b) => c.breakup[b.key] > 0).map((b) => (
                          <tr key={b.key}>
                            <td>
                              <span className="legend-dot" style={{ background: b.color }} /> {b.label}
                            </td>
                            <td className="num">{formatSalary(c.breakup[b.key])}</td>
                            <td className="num">{formatSalary(Math.round(c.breakup[b.key] / 12))}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>Total CTC</td>
                          <td className="num">{formatSalary(c.salary)}</td>
                          <td className="num">{formatSalary(Math.round(c.salary / 12))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </>
                ) : (
                  <p className="muted">No compensation entered yet.</p>
                )}
              </GlassCard>
              <GlassCard>
                <SectionTitle title="Offer status" />
                <dl className="facts">
                  <dt>Status</dt>
                  <dd>
                    <StatusBadge status={c.status} />
                  </dd>
                  <dt>Sent</dt>
                  <dd>{formatDateTime(c.offerSentOn)}</dd>
                  <dt>Responded</dt>
                  <dd>{formatDateTime(c.respondedOn)}</dd>
                  <dt>Envelope</dt>
                  <dd className="mono">{c.envelopeId || '—'}</dd>
                </dl>
                {c.declineReason && (
                  <MessageBar intent="warning">
                    <MessageBarBody>
                      <MessageBarTitle>Decline reason</MessageBarTitle>
                      {c.declineReason}
                    </MessageBarBody>
                  </MessageBar>
                )}
                {c.signedOfferUrl && (
                  <Button as="a" href={c.signedOfferUrl} target="_blank" icon={<DocumentPdf20Regular />} appearance="primary">
                    {c.status === 'Declined' ? 'Open declined offer copy' : 'Open signed offer letter'}
                  </Button>
                )}
                {canSendOffer(c) && (
                  <Button icon={<Send20Filled />} onClick={() => setConfirmOffer(true)} disabled={busy || gaps.length > 0}>
                    {c.status === 'Selected' ? 'Send offer' : 'Re-send offer'}
                  </Button>
                )}
              </GlassCard>
            </div>
          )}

          {tab === 'onboarding' && accepted && (
            <GlassCard>
              <div className="onb-head">
                <ProgressRing value={tasks.length ? doneCount / tasks.length : 0} size={84} stroke={8} />
                <div className="grow">
                  <h3>Day-one readiness</h3>
                  <span className="muted">
                    {doneCount} of {tasks.length} tasks · joins {formatDate(c.startDate)}
                  </span>
                </div>
                {c.status === 'Accepted' && tasks.length > 0 && (
                  <Button
                    appearance="primary"
                    disabled={busy || doneCount < tasks.length}
                    onClick={() =>
                      run(async () => {
                        await setStatus(c.id, 'Onboarded');
                        setCelebrate(true);
                      }, ['Onboarding complete 🎉', `${c.fullName} is fully onboarded.`])
                    }
                  >
                    Mark as onboarded
                  </Button>
                )}
              </div>
              {tasks.length === 0 ? (
                <div className="stack">
                  <p className="muted">No checklist yet — it's created automatically when the offer is signed.</p>
                  <Button onClick={() => run(() => createDefaultTasks(c), ['Checklist created'])} disabled={busy}>
                    Create checklist now
                  </Button>
                </div>
              ) : (
                <div className="task-groups">
                  {TASK_CATEGORIES.map((cat) => {
                    const group = tasks.filter((t) => t.category === cat);
                    if (!group.length) return null;
                    return (
                      <section key={cat} className="task-group">
                        <h4>
                          <span className={`cat cat-${cat.replace(' ', '').toLowerCase()}`}>{cat}</span>
                          <span className="muted small">
                            {group.filter((t) => t.isDone).length}/{group.length}
                          </span>
                        </h4>
                        <ul>
                          {group.map((t) => {
                            const overdue = !t.isDone && t.dueDate && new Date(`${t.dueDate}T23:59:59`).getTime() < Date.now();
                            return (
                              <motion.li key={t.id} layout className={t.isDone ? 'done' : ''}>
                                <Checkbox
                                  checked={t.isDone}
                                  disabled={busy || c.status === 'Onboarded'}
                                  onChange={(_, d) => run(() => setTaskDone(t.id, Boolean(d.checked)))}
                                  label={t.title}
                                />
                                <span className={`muted small ${overdue ? 'overdue' : ''}`}>
                                  {t.owner} · {overdue ? 'overdue · ' : ''}
                                  {formatDate(t.dueDate)}
                                </span>
                              </motion.li>
                            );
                          })}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              )}
              {c.status === 'Onboarded' && <Link onClick={() => setCelebrate(true)}>🎉 Celebrate again</Link>}
            </GlassCard>
          )}
        </motion.div>
      </AnimatePresence>

      {round && scheduling && (
        <ScheduleDialog
          candidate={c}
          round={round}
          open
          onClose={() => setScheduling(false)}
          onDone={() => {
            setScheduling(false);
            setTab('interviews');
            void refresh();
          }}
        />
      )}
      {recording && (
        <ResultDialog
          interview={recording}
          candidateName={c.fullName}
          open
          onClose={() => setRecording(null)}
          onDone={(status) => {
            setRecording(null);
            if (status === 'Selected') setCelebrate(true);
            void refresh();
          }}
        />
      )}

      <Dialog open={confirmOffer} onOpenChange={(_, d) => setConfirmOffer(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Send offer letter?</DialogTitle>
            <DialogContent>
              An offer letter for <strong>{c.position}</strong> with a CTC of <strong>₹ {formatSalary(c.salary)}</strong> (full breakup included) will be
              generated and sent to <strong>{c.email}</strong> through DocuSign.
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmOffer(false)} disabled={busy}>
                Not yet
              </Button>
              <Button
                appearance="primary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await setStatus(c.id, 'Offer Requested');
                    setConfirmOffer(false);
                    setTab('offer');
                  }, ['Offer on its way', `DocuSign will email ${c.email}.`])
                }
              >
                {busy ? 'Sending…' : 'Send offer'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
