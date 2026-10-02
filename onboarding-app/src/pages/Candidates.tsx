import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Tab,
  TabList,
  ToggleButton,
} from '@fluentui/react-components';
import {
  ArrowSort16Regular,
  Board20Regular,
  ResizeLarge20Regular,
  ResizeSmall20Regular,
  PersonAdd20Regular,
  Search20Regular,
  TextBulletList20Regular,
} from '@fluentui/react-icons';
import { useAppData } from '../state/appDataContext';
import type { Navigate } from '../state/nav';
import { setStatus, type Candidate } from '../services/onboarding';
import { PipelineBoard } from '../components/PipelineBoard';
import type { ColumnId } from '../utils/pipeline';
import { StatusBadge } from '../components/StatusBadge';
import { GlassCard } from '../ui/GlassCard';
import { errorText, useToast } from '../hooks/useToast';
import { formatDate, formatSalary } from '../utils/format';
import { offerGaps } from '../utils/offer';

const ALL = 'All departments';
type SortKey = 'fullName' | 'position' | 'department' | 'startDate' | 'status' | 'salary' | 'modified';

interface PendingMove {
  c: Candidate;
  to: ColumnId;
}

export function Candidates({ onNavigate }: { onNavigate: Navigate }) {
  const { candidates, me, refresh } = useAppData();
  const notify = useToast();
  const [view, setView] = useState<'board' | 'list'>('board');
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState(ALL);
  const [mine, setMine] = useState(false);
  const [compact, setCompact] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'modified', dir: -1 });
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [busy, setBusy] = useState(false);

  const all = useMemo(() => candidates ?? [], [candidates]);
  const departments = useMemo(() => [ALL, ...Array.from(new Set(all.map((c) => c.department).filter(Boolean))).sort()], [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (c) =>
        (!q || [c.fullName, c.email, c.position, c.hiringManager, c.skills].some((v) => v.toLowerCase().includes(q))) &&
        (dept === ALL || c.department === dept) &&
        (!mine || (me && c.managerEmail.toLowerCase() === me.email)),
    );
  }, [all, query, dept, mine, me]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const av = a[sort.key] ?? '';
        const bv = b[sort.key] ?? '';
        return (typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))) * sort.dir;
      }),
    [filtered, sort],
  );

  const onMove = (c: Candidate, to: ColumnId) => {
    if (to === 'offer' || to === 'closed') {
      setPending({ c, to });
      return;
    }
    notify(
      'That move happens automatically',
      to === 'interviewing' || to === 'selected'
        ? 'Stages advance when interview results are recorded.'
        : 'Offer outcomes come back from DocuSign; onboarding completes from the checklist.',
      'info',
    );
  };

  const confirmMove = async () => {
    if (!pending) return;
    const { c, to } = pending;
    setBusy(true);
    try {
      if (to === 'offer') {
        await setStatus(c.id, 'Offer Requested');
        notify('Offer on its way', `DocuSign will email the offer letter to ${c.email}.`);
      } else {
        await setStatus(c.id, 'Not Selected');
        notify('Candidate closed', `${c.fullName} marked Not Selected.`, 'warning');
      }
      setPending(null);
      await refresh();
    } catch (err) {
      notify('Could not update the candidate', errorText(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const gaps = pending?.to === 'offer' ? offerGaps(pending.c) : [];
  const head = (key: SortKey, label: string) => (
    <th>
      <button
        className={`th-sort ${sort.key === key ? 'on' : ''}`}
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}
        aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
      >
        {label} <ArrowSort16Regular />
      </button>
    </th>
  );

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h2>Candidates</h2>
          <p className="muted">
            {filtered.length} of {all.length} · drag a card to <strong>Offer out</strong> to send an offer, or to <strong>Closed</strong> to reject
          </p>
        </div>
        <Button appearance="primary" icon={<PersonAdd20Regular />} onClick={() => onNavigate({ page: 'new' })}>
          New candidate
        </Button>
      </div>

      <GlassCard className="toolbar" padded={false}>
        <Input
          contentBefore={<Search20Regular />}
          placeholder="Search name, email, role, skill…"
          value={query}
          onChange={(_, d) => setQuery(d.value)}
          className="tb-search"
          appearance="filled-lighter"
        />
        <Dropdown value={dept} selectedOptions={[dept]} onOptionSelect={(_, d) => setDept(d.optionValue ?? ALL)} appearance="filled-lighter">
          {departments.map((d) => (
            <Option key={d} value={d}>
              {d}
            </Option>
          ))}
        </Dropdown>
        <ToggleButton checked={mine} onClick={() => setMine((m) => !m)} disabled={!me} shape="circular" size="small">
          My hires
        </ToggleButton>
        <span className="grow" />
        <ToggleButton
          appearance="subtle"
          checked={compact}
          onClick={() => setCompact((c) => !c)}
          icon={compact ? <ResizeSmall20Regular /> : <ResizeLarge20Regular />}
          aria-label="Toggle compact cards"
        />
        <TabList selectedValue={view} onTabSelect={(_, d) => setView(d.value as 'board' | 'list')} size="small" appearance="subtle-circular">
          <Tab value="board" icon={<Board20Regular />}>
            Board
          </Tab>
          <Tab value="list" icon={<TextBulletList20Regular />}>
            List
          </Tab>
        </TabList>
      </GlassCard>

      {view === 'board' ? (
        <PipelineBoard candidates={filtered} compact={compact} onOpen={(id) => onNavigate({ page: 'detail', id })} onMove={onMove} />
      ) : (
        <GlassCard padded={false} className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                {head('fullName', 'Candidate')}
                {head('position', 'Position')}
                {head('department', 'Department')}
                {head('salary', 'CTC')}
                {head('startDate', 'Start')}
                {head('status', 'Status')}
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 15) * 0.02 }}
                  onClick={() => onNavigate({ page: 'detail', id: c.id })}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onNavigate({ page: 'detail', id: c.id })}
                >
                  <td>
                    <span className="cell-person">
                      <Avatar name={c.fullName} size={28} color="colorful" />
                      <span>
                        <strong>{c.fullName}</strong>
                        <span className="muted small block">{c.email}</span>
                      </span>
                    </span>
                  </td>
                  <td>{c.position || '—'}</td>
                  <td>{c.department || '—'}</td>
                  <td className="tabular">{c.salary ? formatSalary(c.salary) : '—'}</td>
                  <td>{formatDate(c.startDate)}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {sorted.length === 0 && <p className="muted empty-note">No candidates match your filters.</p>}
        </GlassCard>
      )}

      <Dialog open={!!pending} onOpenChange={(_, d) => !d.open && !busy && setPending(null)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{pending?.to === 'offer' ? `Send offer to ${pending.c.fullName}?` : `Close ${pending?.c.fullName}?`}</DialogTitle>
            <DialogContent className="stack">
              {pending?.to === 'offer' ? (
                gaps.length ? (
                  <MessageBar intent="warning">
                    <MessageBarBody>
                      Complete the profile first — missing: {gaps.join(', ')}.
                    </MessageBarBody>
                  </MessageBar>
                ) : (
                  <span>
                    An offer letter for <strong>{pending.c.position}</strong> with a CTC of <strong>{formatSalary(pending.c.salary)}</strong> and the full
                    salary breakup will be sent to <strong>{pending.c.email}</strong> through DocuSign.
                  </span>
                )
              ) : (
                <span>The candidate will be marked <strong>Not Selected</strong> and leave the active pipeline.</span>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPending(null)} disabled={busy}>
                Cancel
              </Button>
              {pending?.to === 'offer' && gaps.length > 0 ? (
                <Button appearance="primary" onClick={() => pending && onNavigate({ page: 'edit', id: pending.c.id })}>
                  Complete profile
                </Button>
              ) : (
                <Button appearance="primary" onClick={confirmMove} disabled={busy}>
                  {busy ? 'Working…' : pending?.to === 'offer' ? 'Send offer' : 'Close candidate'}
                </Button>
              )}
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
