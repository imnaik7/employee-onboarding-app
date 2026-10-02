import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Avatar, Button, Tab, TabList } from '@fluentui/react-components';
import { CheckmarkCircle20Regular, Clock20Regular, Video16Regular } from '@fluentui/react-icons';
import { useAppData } from '../state/appDataContext';
import type { Navigate } from '../state/nav';
import type { Interview } from '../services/onboarding';
import { ResultDialog } from '../components/InterviewDialogs';
import { GlassCard, Pill } from '../ui/GlassCard';
import { formatDateTime } from '../utils/format';

type View = 'agenda' | 'awaiting' | 'done';

function dayLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1 && diff < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function Interviews({ onNavigate }: { onNavigate: Navigate }) {
  const { interviews, byId, refresh, now } = useAppData();
  const [view, setView] = useState<View>('agenda');
  const [recording, setRecording] = useState<Interview | null>(null);

  const groups = useMemo(() => {
    const upcoming = interviews.filter((i) => i.result === 'Scheduled' && new Date(i.scheduledStart).getTime() >= now).sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
    const byDay = new Map<string, Interview[]>();
    for (const i of upcoming) {
      const k = dayLabel(new Date(i.scheduledStart));
      byDay.set(k, [...(byDay.get(k) ?? []), i]);
    }
    return {
      upcoming,
      byDay: [...byDay.entries()],
      awaiting: interviews.filter((i) => i.result === 'Scheduled' && new Date(i.scheduledStart).getTime() < now).sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart)),
      done: interviews.filter((i) => i.result !== 'Scheduled').sort((a, b) => b.scheduledStart.localeCompare(a.scheduledStart)),
    };
  }, [interviews, now]);

  const row = (i: Interview, idx: number, awaiting = false) => {
    const c = byId.get(i.candidateId);
    const start = new Date(i.scheduledStart);
    return (
      <motion.li key={i.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 12) * 0.04 }} className={`ag-item ${awaiting ? 'awaiting' : ''}`}>
        <div className="ag-time tabular">
          <strong>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
          <span className="muted small">{i.durationMinutes}m</span>
        </div>
        <span className="ag-rail" aria-hidden />
        <button className="ag-card" onClick={() => c && onNavigate({ page: 'detail', id: c.id, tab: 'interviews' })}>
          <Avatar name={c?.fullName ?? '?'} size={36} color="colorful" />
          <span className="grow">
            <strong>{c?.fullName ?? `Candidate #${i.candidateId}`}</strong>
            <span className="muted small block">
              {c?.position} · with {i.interviewerName}
              {awaiting ? ` · ${formatDateTime(i.scheduledStart)}` : ''}
            </span>
          </span>
          <Pill tone="brand">{i.round}</Pill>
        </button>
        <div className="ag-actions">
          {i.meetingLink && !awaiting && (
            <Button as="a" href={i.meetingLink} target="_blank" size="small" icon={<Video16Regular />}>
              Join
            </Button>
          )}
          <Button size="small" appearance={awaiting ? 'primary' : 'secondary'} icon={<CheckmarkCircle20Regular />} onClick={() => setRecording(i)}>
            Result
          </Button>
        </div>
      </motion.li>
    );
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Interviews</h2>
          <p className="muted">Tech 1 → Tech 2 → HR · schedule rounds from a candidate's profile</p>
        </div>
      </div>

      <TabList selectedValue={view} onTabSelect={(_, d) => setView(d.value as View)} appearance="subtle-circular">
        <Tab value="agenda">Agenda · {groups.upcoming.length}</Tab>
        <Tab value="awaiting">
          Awaiting feedback · {groups.awaiting.length} {groups.awaiting.length > 0 && <span className="pulse-dot" aria-hidden />}
        </Tab>
        <Tab value="done">Completed · {groups.done.length}</Tab>
      </TabList>

      {view === 'agenda' && (
        <>
          {groups.byDay.length === 0 && <GlassCard className="empty-note"><Clock20Regular /> No upcoming interviews.</GlassCard>}
          {groups.byDay.map(([day, items]) => (
            <GlassCard key={day}>
              <h3 className="ag-day">
                {day} <span className="muted small">{items.length} interview{items.length > 1 ? 's' : ''}</span>
              </h3>
              <ol className="agenda-list">{items.map((i, idx) => row(i, idx))}</ol>
            </GlassCard>
          ))}
        </>
      )}

      {view === 'awaiting' && (
        <GlassCard className="awaiting-card">
          {groups.awaiting.length === 0 ? <p className="muted">All feedback is in ✨</p> : <ol className="agenda-list">{groups.awaiting.map((i, idx) => row(i, idx, true))}</ol>}
        </GlassCard>
      )}

      {view === 'done' && (
        <GlassCard padded={false} className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Round</th>
                <th>When</th>
                <th>Interviewer</th>
                <th>Rating</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {groups.done.map((i) => {
                const c = byId.get(i.candidateId);
                return (
                  <tr key={i.id} tabIndex={0} onClick={() => c && onNavigate({ page: 'detail', id: c.id, tab: 'interviews' })}>
                    <td>
                      <span className="cell-person">
                        <Avatar name={c?.fullName} size={24} color="colorful" />
                        {c?.fullName}
                      </span>
                    </td>
                    <td>{i.round}</td>
                    <td>{formatDateTime(i.scheduledStart)}</td>
                    <td>{i.interviewerName}</td>
                    <td className="stars-cell">{i.rating ? '★'.repeat(i.rating) + '☆'.repeat(5 - i.rating) : '—'}</td>
                    <td>
                      <Pill tone={i.result === 'Pass' ? 'ok' : i.result === 'Fail' ? 'bad' : 'warn'}>{i.result}</Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {groups.done.length === 0 && <p className="muted empty-note">No completed interviews yet.</p>}
        </GlassCard>
      )}

      {recording && (
        <ResultDialog
          interview={recording}
          candidateName={byId.get(recording.candidateId)?.fullName}
          open
          onClose={() => setRecording(null)}
          onDone={() => {
            setRecording(null);
            void refresh();
          }}
        />
      )}
    </div>
  );
}
