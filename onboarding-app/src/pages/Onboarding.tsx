import { useMemo, useState } from 'react';
import { Avatar, ToggleButton } from '@fluentui/react-components';
import { Rocket24Regular } from '@fluentui/react-icons';
import { useAppData } from '../state/appDataContext';
import type { Navigate } from '../state/nav';
import { StatusBadge } from '../components/StatusBadge';
import { GlassCard } from '../ui/GlassCard';
import { ProgressRing } from '../ui/charts';
import { formatDate } from '../utils/format';

export function Onboarding({ onNavigate }: { onNavigate: Navigate }) {
  const { candidates, tasks, me, now } = useAppData();
  const [mine, setMine] = useState(false);

  const joiners = useMemo(
    () =>
      (candidates ?? [])
        .filter((c) => c.status === 'Accepted' || c.status === 'Onboarded')
        .filter((c) => !mine || (me && c.managerEmail.toLowerCase() === me.email))
        .sort((a, b) => (a.startDate || '9999').localeCompare(b.startDate || '9999')),
    [candidates, mine, me],
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Onboarding</h2>
          <p className="muted">New joiners and how ready they are for day one</p>
        </div>
        <ToggleButton checked={mine} onClick={() => setMine((m) => !m)} disabled={!me} shape="circular">
          My joiners
        </ToggleButton>
      </div>

      {joiners.length === 0 && (
        <GlassCard className="empty-note">
          <Rocket24Regular /> No accepted offers yet — joiners appear here once a candidate signs.
        </GlassCard>
      )}

      <div className="joiner-grid">
        {joiners.map((c, i) => {
          const mineTasks = tasks.filter((t) => t.candidateId === c.id);
          const done = mineTasks.filter((t) => t.isDone).length;
          const overdue = mineTasks.filter((t) => !t.isDone && t.dueDate && new Date(`${t.dueDate}T23:59:59`).getTime() < now).length;
          const days = c.startDate ? Math.ceil((new Date(`${c.startDate}T00:00:00`).getTime() - now) / 86_400_000) : null;
          return (
            <GlassCard key={c.id} index={i} interactive className={`joiner ${overdue ? 'has-overdue' : ''}`} onClick={() => onNavigate({ page: 'detail', id: c.id, tab: 'onboarding' })}>
              <div className="joiner-top">
                <Avatar name={c.fullName} size={48} color="colorful" />
                <div className="grow">
                  <strong>{c.fullName}</strong>
                  <span className="muted small block">{c.position}</span>
                </div>
                <ProgressRing value={mineTasks.length ? done / mineTasks.length : 0} size={60} />
              </div>
              <div className="joiner-foot">
                <StatusBadge status={c.status} />
                {overdue > 0 && <span className="overdue-chip">{overdue} overdue</span>}
                <span className="grow" />
                {days !== null && (
                  <span className="countdown-chip">{c.status === 'Onboarded' ? `Joined ${formatDate(c.startDate)}` : days <= 0 ? 'Joins today' : `Joins in ${days} day${days === 1 ? '' : 's'}`}</span>
                )}
              </div>
              <span className="muted small">{mineTasks.length ? `${done}/${mineTasks.length} tasks done` : 'Checklist pending'}</span>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
