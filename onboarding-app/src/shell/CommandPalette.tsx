import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Avatar } from '@fluentui/react-components';
import {
  Board20Regular,
  CalendarPerson20Regular,
  Home20Regular,
  PersonAdd20Regular,
  Rocket20Regular,
  Search20Regular,
  WeatherMoon20Regular,
} from '@fluentui/react-icons';
import { useAppData } from '../state/appDataContext';
import type { Navigate } from '../state/nav';
import { StatusBadge } from '../components/StatusBadge';

interface Item {
  id: string;
  group: 'Actions' | 'Navigate' | 'Candidates';
  label: string;
  hint?: string;
  icon: ReactNode;
  keywords: string;
  run: () => void;
}

/** Subsequence fuzzy match with a score favouring contiguous / word-start hits. */
function score(query: string, text: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const idx = t.indexOf(q);
  if (idx >= 0) return 100 - idx + (idx === 0 || t[idx - 1] === ' ' ? 50 : 0);
  let ti = 0;
  let s = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found < 0) return 0;
    s += found === ti ? 3 : 1;
    ti = found + 1;
  }
  return s;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: Navigate;
  onToggleTheme: () => void;
}

export function CommandPalette({ open, onClose, onNavigate, onToggleTheme }: Props) {
  const { candidates } = useAppData();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset when the palette opens (state adjusted during render instead of in an effect)
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQ('');
      setSel(0);
    }
  }

  const items = useMemo<Item[]>(() => {
    const go = (fn: () => void) => () => {
      onClose();
      fn();
    };
    const base: Item[] = [
      { id: 'new', group: 'Actions', label: 'New candidate', hint: 'Upload a resume', icon: <PersonAdd20Regular />, keywords: 'add create resume upload', run: go(() => onNavigate({ page: 'new' })) },
      { id: 'theme', group: 'Actions', label: 'Toggle dark / light theme', icon: <WeatherMoon20Regular />, keywords: 'theme dark light mode', run: go(onToggleTheme) },
      { id: 'dash', group: 'Navigate', label: 'Dashboard', icon: <Home20Regular />, keywords: 'home overview kpi', run: go(() => onNavigate({ page: 'dashboard' })) },
      { id: 'cands', group: 'Navigate', label: 'Candidates', icon: <Board20Regular />, keywords: 'pipeline board kanban', run: go(() => onNavigate({ page: 'candidates' })) },
      { id: 'ivs', group: 'Navigate', label: 'Interviews', icon: <CalendarPerson20Regular />, keywords: 'schedule feedback agenda', run: go(() => onNavigate({ page: 'interviews' })) },
      { id: 'onb', group: 'Navigate', label: 'Onboarding', icon: <Rocket20Regular />, keywords: 'joiners checklist', run: go(() => onNavigate({ page: 'onboarding' })) },
    ];
    const people: Item[] = (candidates ?? []).map((c) => ({
      id: `c${c.id}`,
      group: 'Candidates',
      label: c.fullName,
      hint: [c.position, c.department].filter(Boolean).join(' · '),
      icon: <Avatar name={c.fullName} size={24} color="colorful" />,
      keywords: `${c.email} ${c.position} ${c.department} ${c.status} ${c.skills}`,
      run: go(() => onNavigate({ page: 'detail', id: c.id })),
    }));
    return [...base, ...people];
  }, [candidates, onClose, onNavigate, onToggleTheme]);

  const results = useMemo(() => {
    const scored = items
      .map((it) => ({ it, s: Math.max(score(q, it.label) * 2, score(q, it.keywords)) }))
      .filter((x) => x.s > 0);
    if (q) scored.sort((a, b) => b.s - a.s);
    return scored.slice(0, 40).map((x) => x.it);
  }, [items, q]);

  const statusFor = (id: string) => candidates?.find((c) => `c${c.id}` === id)?.status;

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      results[sel]?.run();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  let lastGroup = '';
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="palette-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            className="palette"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="palette-input">
              <Search20Regular />
              <input
                ref={inputRef}
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSel(0);
                }}
                onKeyDown={onKey}
                placeholder="Search candidates, pages and actions…"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={results[sel] ? `pi-${results[sel].id}` : undefined}
              />
              <kbd>Esc</kbd>
            </div>
            <div className="palette-list" id="palette-list" role="listbox" ref={listRef}>
              {results.length === 0 && <p className="muted palette-empty">No matches for “{q}”</p>}
              {results.map((it, i) => {
                const header = it.group !== lastGroup ? it.group : null;
                lastGroup = it.group;
                const status = it.group === 'Candidates' ? statusFor(it.id) : undefined;
                return (
                  <div key={it.id}>
                    {header && <div className="palette-group">{header}</div>}
                    <button
                      id={`pi-${it.id}`}
                      data-idx={i}
                      role="option"
                      aria-selected={i === sel}
                      className={`palette-item ${i === sel ? 'sel' : ''}`}
                      onMouseMove={() => setSel(i)}
                      onClick={it.run}
                    >
                      <span className="palette-icon">{it.icon}</span>
                      <span className="grow">
                        <span className="palette-label">{it.label}</span>
                        {it.hint && <span className="muted small"> {it.hint}</span>}
                      </span>
                      {status && <StatusBadge status={status} />}
                      {i === sel && <kbd>↵</kbd>}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="palette-foot muted small">
              <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
              <span><kbd>↵</kbd> open</span>
              <span><kbd>Esc</kbd> close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
