import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Tooltip } from '@fluentui/react-components';
import {
  Board24Regular,
  CalendarPerson24Regular,
  ChevronDoubleLeft20Regular,
  ChevronDoubleRight20Regular,
  Home24Regular,
  PersonAdd24Regular,
  Rocket24Regular,
} from '@fluentui/react-icons';
import { COMPANY } from '../services/emailTemplate';
import { APP_VERSION } from '../utils/format';
import type { Navigate, Page } from '../state/nav';

const NAV: { page: Page; label: string; icon: ReactNode }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: <Home24Regular /> },
  { page: 'candidates', label: 'Candidates', icon: <Board24Regular /> },
  { page: 'interviews', label: 'Interviews', icon: <CalendarPerson24Regular /> },
  { page: 'onboarding', label: 'Onboarding', icon: <Rocket24Regular /> },
];

interface Props {
  active: Page;
  collapsed: boolean;
  onToggle: () => void;
  onNavigate: Navigate;
  badges: Partial<Record<Page, number>>;
}

export function Sidebar({ active, collapsed, onToggle, onNavigate, badges }: Props) {
  const item = (n: (typeof NAV)[number]) => {
    const isActive = n.page === active;
    const btn = (
      <button
        key={n.page}
        className={`nav-item ${isActive ? 'active' : ''}`}
        onClick={() => onNavigate({ page: n.page })}
        aria-current={isActive ? 'page' : undefined}
        aria-label={collapsed ? n.label : undefined}
      >
        {isActive && <motion.span layoutId="nav-active" className="nav-active" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
        <span className="nav-icon">{n.icon}</span>
        {!collapsed && <span className="nav-label">{n.label}</span>}
        {!!badges[n.page] && <span className={`nav-badge ${collapsed ? 'dot' : ''}`}>{collapsed ? '' : badges[n.page]}</span>}
      </button>
    );
    return collapsed ? (
      <Tooltip key={n.page} content={`${n.label}${badges[n.page] ? ` (${badges[n.page]})` : ''}`} relationship="label" positioning="after">
        {btn}
      </Tooltip>
    ) : (
      btn
    );
  };

  return (
    <motion.aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} animate={{ width: collapsed ? 72 : 248 }} transition={{ type: 'spring', stiffness: 300, damping: 32 }}>
      <div className="brand">
        <div className="brand-mark" aria-hidden>
          <span>⚡</span>
        </div>
        {!collapsed && (
          <div className="brand-text">
            <strong>{COMPANY}</strong>
            <span>Talent &amp; Onboarding</span>
          </div>
        )}
      </div>

      <nav aria-label="Main">{NAV.map(item)}</nav>

      <button className="cta" onClick={() => onNavigate({ page: 'new' })} aria-label="Add candidate">
        <PersonAdd24Regular />
        {!collapsed && <span>Add candidate</span>}
      </button>

      <div className="sidebar-foot">
        {!collapsed && <span className="muted small">v{APP_VERSION}</span>}
        <button className="icon-btn" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronDoubleRight20Regular /> : <ChevronDoubleLeft20Regular />}
        </button>
      </div>
    </motion.aside>
  );
}
