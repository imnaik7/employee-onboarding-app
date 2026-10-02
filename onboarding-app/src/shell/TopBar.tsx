import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Avatar,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Tooltip,
} from '@fluentui/react-components';
import {
  Alert24Regular,
  CheckmarkCircle20Filled,
  ChevronRight16Regular,
  DismissCircle20Filled,
  Clock20Regular,
  Search20Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
} from '@fluentui/react-icons';
import { useAppData } from '../state/appDataContext';
import type { Navigate } from '../state/nav';
import { relativeDays } from '../utils/format';

interface Crumb {
  label: string;
  onClick?: () => void;
}

interface Props {
  crumbs: Crumb[];
  dark: boolean;
  onToggleTheme: () => void;
  onOpenPalette: () => void;
  onNavigate: Navigate;
}

interface Note {
  key: string;
  icon: 'ok' | 'bad' | 'wait';
  text: string;
  when: string;
  go: () => void;
}

export function TopBar({ crumbs, dark, onToggleTheme, onOpenPalette, onNavigate }: Props) {
  const { candidates, interviews, me, byId, now } = useAppData();

  // Notifications derived from recent data: offer outcomes in the last 7 days + interviews awaiting feedback
  const notes = useMemo<Note[]>(() => {
    const out: Note[] = [];
    const weekAgo = now - 7 * 86_400_000;
    for (const c of candidates ?? []) {
      if (!c.respondedOn || new Date(c.respondedOn).getTime() < weekAgo) continue;
      if (c.status === 'Accepted' || c.status === 'Onboarded')
        out.push({ key: `a${c.id}`, icon: 'ok', text: `${c.fullName} signed the offer`, when: c.respondedOn, go: () => onNavigate({ page: 'detail', id: c.id }) });
      if (c.status === 'Declined')
        out.push({ key: `d${c.id}`, icon: 'bad', text: `${c.fullName} declined the offer`, when: c.respondedOn, go: () => onNavigate({ page: 'detail', id: c.id, tab: 'offer' }) });
    }
    for (const i of interviews) {
      if (i.result === 'Scheduled' && new Date(i.scheduledStart).getTime() < now) {
        const c = byId.get(i.candidateId);
        out.push({ key: `i${i.id}`, icon: 'wait', text: `Feedback pending: ${c?.fullName ?? 'candidate'} · ${i.round}`, when: i.scheduledStart, go: () => onNavigate({ page: 'interviews' }) });
      }
    }
    return out.sort((a, b) => b.when.localeCompare(a.when)).slice(0, 8);
  }, [candidates, interviews, byId, onNavigate, now]);

  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

  return (
    <header className="topbar">
      <nav className="crumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i} className="crumb">
            {i > 0 && <ChevronRight16Regular className="muted" />}
            {c.onClick ? (
              <button onClick={c.onClick}>{c.label}</button>
            ) : (
              <span aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      <button className="search-pill" onClick={onOpenPalette} aria-label="Search and commands">
        <Search20Regular />
        <span>Search candidates, actions…</span>
        <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>

      <div className="topbar-actions">
        <Popover positioning="below-end" withArrow>
          <PopoverTrigger disableButtonEnhancement>
            <button className="icon-btn bell" aria-label={`Notifications (${notes.length})`}>
              <Alert24Regular />
              <AnimatePresence>
                {notes.length > 0 && (
                  <motion.span className="bell-dot" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    {notes.length}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </PopoverTrigger>
          <PopoverSurface className="notes">
            <strong>Notifications</strong>
            {notes.length === 0 && <p className="muted small">You're all caught up ✨</p>}
            {notes.map((n) => (
              <button key={n.key} className="note" onClick={n.go}>
                {n.icon === 'ok' ? (
                  <CheckmarkCircle20Filled className="c-ok" />
                ) : n.icon === 'bad' ? (
                  <DismissCircle20Filled className="c-bad" />
                ) : (
                  <Clock20Regular className="c-warn" />
                )}
                <span className="grow">{n.text}</span>
                <span className="muted small">{relativeDays(n.when)}</span>
              </button>
            ))}
          </PopoverSurface>
        </Popover>

        <Tooltip content={dark ? 'Light theme' : 'Dark theme'} relationship="label">
          <button className="icon-btn" onClick={onToggleTheme}>
            {dark ? <WeatherSunny20Regular /> : <WeatherMoon20Regular />}
          </button>
        </Tooltip>

        <Tooltip content={me ? `${me.name} · ${me.email}` : 'Signed in'} relationship="label">
          <span className="me">
            <Avatar name={me?.name ?? ''} size={32} color="colorful" />
          </span>
        </Tooltip>
      </div>
    </header>
  );
}
