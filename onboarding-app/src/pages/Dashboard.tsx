import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Avatar, Button } from '@fluentui/react-components';
import {
  ArrowDownRight16Regular,
  ArrowRight16Regular,
  ArrowUpRight16Regular,
  CalendarClock20Regular,
  PersonAdd20Regular,
  Sparkle20Filled,
  Video16Regular,
} from '@fluentui/react-icons';
import { useAppData } from '../state/appDataContext';
import type { Navigate } from '../state/nav';
import { STATUSES, type Candidate, type CandidateStatus } from '../services/onboarding';
import { GlassCard, Pill, SectionTitle } from '../ui/GlassCard';
import { CountUp } from '../ui/CountUp';
import { Donut, Sparkline } from '../ui/charts';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate, relativeDays } from '../utils/format';

const STATUS_COLOR: Record<CandidateStatus, string> = {
  Applied: '#64748b',
  Interviewing: '#6366f1',
  'Not Selected': '#475569',
  Selected: '#14b8a6',
  'Offer Requested': '#f59e0b',
  'Offer Sent': '#fbbf24',
  Accepted: '#22c55e',
  Declined: '#ef4444',
  Expired: '#94a3b8',
  Onboarded: '#a855f7',
};

const WEEK = 7 * 86_400_000;

/** Count items per week for the last `weeks` weeks (oldest → newest). */
function weekly<T>(items: T[], date: (t: T) => string, now: number, weeks = 8): number[] {
  const out = new Array<number>(weeks).fill(0);
  for (const it of items) {
    const d = date(it);
    if (!d) continue;
    const ago = Math.floor((now - new Date(d).getTime()) / WEEK);
    if (ago >= 0 && ago < weeks) out[weeks - 1 - ago]! += 1;
  }
  return out;
}

function Delta({ series }: { series: number[] }) {
  const cur = series[series.length - 1] ?? 0;
  const prev = series[series.length - 2] ?? 0;
  const diff = cur - prev;
  if (!cur && !prev) return <span className="delta flat">no change</span>;
  return (
    <span className={`delta ${diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'}`}>
      {diff > 0 ? <ArrowUpRight16Regular /> : diff < 0 ? <ArrowDownRight16Regular /> : null}
      {diff > 0 ? '+' : ''}
      {diff} this week
    </span>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function EmptyNote({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="empty-note">
      {icon}
      <span>{text}</span>
    </div>
  );
}

export function Dashboard({ onNavigate }: { onNavigate: Navigate }) {
  const { candidates: all, interviews, me, byId, now } = useAppData();

  const m = useMemo(() => {
    const candidates = all ?? [];
    const count = (...s: CandidateStatus[]) => candidates.filter((c) => s.includes(c.status)).length;
    const accepted = count('Accepted', 'Onboarded');
    const declined = count('Declined');
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86_400_000);
    return {
      total: candidates.length,
      inInterviews: count('Interviewing'),
      offersOut: count('Offer Requested', 'Offer Sent'),
      rate: accepted + declined ? Math.round((accepted / (accepted + declined)) * 100) : 0,
      newSeries: weekly(candidates, (c) => c.created, now),
      ivSeries: weekly(interviews, (i) => i.scheduledStart, now),
      sentSeries: weekly(candidates, (c) => c.offerSentOn, now),
      acceptSeries: weekly(
        candidates.filter((c) => c.status === 'Accepted' || c.status === 'Onboarded'),
        (c) => c.respondedOn,
        now,
      ),
      todays: interviews
        .filter((i) => i.result === 'Scheduled' && new Date(i.scheduledStart) >= today && new Date(i.scheduledStart) < tomorrow)
        .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart)),
      awaiting: interviews.filter((i) => i.result === 'Scheduled' && new Date(i.scheduledStart).getTime() < now),
      readyForOffer: candidates.filter((c) => c.status === 'Selected'),
      joiners: candidates
        .filter((c) => (c.status === 'Accepted' || c.status === 'Onboarded') && c.startDate && new Date(`${c.startDate}T00:00:00`) >= today)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .slice(0, 8),
      recent: [...candidates].sort((a, b) => b.modified.localeCompare(a.modified)).slice(0, 6),
      donut: STATUSES.map((s) => ({ label: s, value: count(s), color: STATUS_COLOR[s] })),
      funnel: [
        { label: 'Resumes', value: candidates.length },
        { label: 'Interviewed', value: candidates.length - count('Applied') },
        { label: 'Selected', value: count('Selected', 'Offer Requested', 'Offer Sent', 'Accepted', 'Declined', 'Expired', 'Onboarded') },
        { label: 'Offered', value: count('Offer Sent', 'Accepted', 'Declined', 'Expired', 'Onboarded') },
        { label: 'Accepted', value: accepted },
        { label: 'Onboarded', value: count('Onboarded') },
      ],
    };
  }, [all, interviews, now]);

  const first = me?.name?.split(/\s+/)[0] ?? '';
  const open = (c: Candidate) => onNavigate({ page: 'detail', id: c.id });
  const funnelMax = Math.max(1, m.funnel[0]!.value);

  return (
    <div className="page">
      <GlassCard className="hero" padded={false}>
        <div className="hero-inner">
          <div>
            <span className="eyebrow">
              <Sparkle20Filled /> {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <h1>
              {greeting()}
              {first ? `, ${first}` : ''} <span className="wave">👋</span>
            </h1>
            <p className="hero-sub">
              {m.todays.length ? `${m.todays.length} interview${m.todays.length > 1 ? 's' : ''} today` : 'No interviews today'} ·{' '}
              {m.awaiting.length} awaiting feedback · {m.readyForOffer.length} ready for an offer
            </p>
          </div>
          <div className="hero-actions">
            <Button appearance="primary" size="large" icon={<PersonAdd20Regular />} onClick={() => onNavigate({ page: 'new' })}>
              New candidate
            </Button>
            <Button size="large" appearance="secondary" onClick={() => onNavigate({ page: 'candidates' })}>
              Open pipeline
            </Button>
          </div>
        </div>
      </GlassCard>

      <div className="kpi-grid">
        {[
          { label: 'Candidates', value: m.total, series: m.newSeries, hint: 'new resumes' },
          { label: 'In interviews', value: m.inInterviews, series: m.ivSeries, hint: 'interviews' },
          { label: 'Offers out', value: m.offersOut, series: m.sentSeries, hint: 'offers sent' },
          { label: 'Acceptance rate', value: m.rate, suffix: '%', series: m.acceptSeries, hint: 'accepted' },
        ].map((k, i) => (
          <GlassCard key={k.label} index={i} className="kpi">
            <span className="kpi-label">{k.label}</span>
            <div className="kpi-row">
              <span className="kpi-value">
                <CountUp value={k.value} suffix={k.suffix} />
              </span>
              <Sparkline values={k.series} />
            </div>
            <span className="kpi-foot">
              <Delta series={k.series} /> <span className="muted">{k.hint}</span>
            </span>
          </GlassCard>
        ))}
      </div>

      <div className="grid-3">
        <GlassCard index={4} className="span-2">
          <SectionTitle title="Hiring funnel" hint="Stage-to-stage conversion" />
          <div className="funnel">
            {m.funnel.map((f, i) => {
              const prev = i ? m.funnel[i - 1]!.value : 0;
              const conv = i && prev ? Math.round((f.value / prev) * 100) : null;
              return (
                <div key={f.label} className="funnel-row">
                  <span className="funnel-label">{f.label}</span>
                  <div className="funnel-track">
                    <motion.div
                      className="funnel-bar"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max((f.value / funnelMax) * 100, f.value ? 6 : 0)}%` }}
                      transition={{ duration: 0.9, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <span>{f.value}</span>
                    </motion.div>
                  </div>
                  <span className="funnel-conv tabular">{conv !== null ? `${conv}%` : ''}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard index={5}>
          <SectionTitle title="Pipeline mix" />
          <div className="donut-wrap">
            <Donut
              slices={m.donut}
              center={
                <>
                  <strong>
                    <CountUp value={m.total} />
                  </strong>
                  <span className="muted small">total</span>
                </>
              }
            />
            <ul className="legend">
              {m.donut
                .filter((d) => d.value > 0)
                .map((d) => (
                  <li key={d.label}>
                    <span className="legend-dot" style={{ background: d.color }} />
                    <span className="grow">{d.label}</span>
                    <strong className="tabular">{d.value}</strong>
                  </li>
                ))}
            </ul>
          </div>
        </GlassCard>
      </div>

      <div className="grid-3">
        <GlassCard index={6}>
          <SectionTitle title="Today" hint={`${m.todays.length} interview${m.todays.length === 1 ? '' : 's'}`} />
          {m.todays.length === 0 && <EmptyNote icon={<CalendarClock20Regular />} text="Your day is clear." />}
          <ul className="agenda">
            {m.todays.map((i) => {
              const c = byId.get(i.candidateId);
              return (
                <li key={i.id}>
                  <span className="agenda-time tabular">
                    {new Date(i.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button className="agenda-body" onClick={() => c && open(c)}>
                    <strong>{c?.fullName ?? 'Candidate'}</strong>
                    <span className="muted small">
                      {i.round} · {i.interviewerName}
                    </span>
                  </button>
                  {i.meetingLink && (
                    <a className="join" href={i.meetingLink} target="_blank" rel="noreferrer" aria-label="Join meeting">
                      <Video16Regular /> Join
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </GlassCard>

        <GlassCard index={7}>
          <SectionTitle
            title="Needs action"
            hint={`${m.awaiting.length + m.readyForOffer.length} items`}
            action={
              <Button appearance="transparent" size="small" icon={<ArrowRight16Regular />} iconPosition="after" onClick={() => onNavigate({ page: 'interviews' })}>
                All
              </Button>
            }
          />
          {m.awaiting.length + m.readyForOffer.length === 0 && <EmptyNote icon={<Sparkle20Filled />} text="Nothing waiting on you." />}
          <ul className="list">
            {m.awaiting.slice(0, 4).map((i) => {
              const c = byId.get(i.candidateId);
              return (
                <li key={`i${i.id}`}>
                  <button className="row" onClick={() => c && onNavigate({ page: 'detail', id: c.id, tab: 'interviews' })}>
                    <Avatar name={c?.fullName} size={28} color="colorful" />
                    <span className="grow">
                      <strong>{c?.fullName}</strong>
                      <span className="muted small"> · {i.round} feedback</span>
                    </span>
                    <Pill tone="warn">Feedback</Pill>
                  </button>
                </li>
              );
            })}
            {m.readyForOffer.slice(0, 4).map((c) => (
              <li key={`c${c.id}`}>
                <button className="row" onClick={() => onNavigate({ page: 'detail', id: c.id, tab: 'offer' })}>
                  <Avatar name={c.fullName} size={28} color="colorful" />
                  <span className="grow">
                    <strong>{c.fullName}</strong>
                    <span className="muted small"> · {c.position}</span>
                  </span>
                  <Pill tone="ok">Send offer</Pill>
                </button>
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard index={8}>
          <SectionTitle title="Recent activity" />
          <ul className="list">
            {m.recent.map((c) => (
              <li key={c.id}>
                <button className="row" onClick={() => open(c)}>
                  <Avatar name={c.fullName} size={28} color="colorful" />
                  <span className="grow">
                    <strong>{c.fullName}</strong>
                    <span className="muted small"> · {relativeDays(c.modified)}</span>
                  </span>
                  <StatusBadge status={c.status} />
                </button>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>

      {m.joiners.length > 0 && (
        <section>
          <SectionTitle title="Upcoming joiners" hint="Accepted offers by start date" />
          <div className="carousel">
            {m.joiners.map((c, i) => {
              const days = Math.ceil((new Date(`${c.startDate}T00:00:00`).getTime() - now) / 86_400_000);
              return (
                <GlassCard key={c.id} index={i} interactive className="joiner-chip" onClick={() => open(c)}>
                  <Avatar name={c.fullName} size={40} color="colorful" />
                  <div className="grow">
                    <strong>{c.fullName}</strong>
                    <span className="muted small block">{c.position}</span>
                    <span className="muted small">{formatDate(c.startDate)}</span>
                  </div>
                  <span className="countdown">
                    <strong>{days <= 0 ? 'Today' : days}</strong>
                    {days > 0 && <span className="small muted">{days === 1 ? 'day' : 'days'}</span>}
                  </span>
                </GlassCard>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
