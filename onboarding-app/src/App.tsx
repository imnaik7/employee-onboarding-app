import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { FluentProvider, MessageBar, MessageBarBody, Toaster } from '@fluentui/react-components';
import { darkTheme, lightTheme } from './theme/brand';
import { AppDataProvider } from './state/AppData';
import { useAppData } from './state/appDataContext';
import { PAGE_TITLES, type Page, type View } from './state/nav';
import { TOASTER_ID } from './hooks/useToast';
import { Aura } from './shell/Aura';
import { Sidebar } from './shell/Sidebar';
import { TopBar } from './shell/TopBar';
import { CommandPalette } from './shell/CommandPalette';
import { PageSkeleton } from './ui/Skeletons';
import { Dashboard } from './pages/Dashboard';
import { Candidates } from './pages/Candidates';
import { CandidateForm } from './pages/CandidateForm';
import { CandidateDetail } from './pages/CandidateDetail';
import { Interviews } from './pages/Interviews';
import { Onboarding } from './pages/Onboarding';
import './styles/tokens.css';
import './App.css';

function readPref(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

function Shell({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
  const { candidates, interviews, error, now } = useAppData();
  const [view, setView] = useState<View>({ page: 'dashboard' });
  const [collapsed, setCollapsed] = useState(() => readPref('onb-sidebar', 'open') === 'collapsed');
  const [paletteOpen, setPaletteOpen] = useState(false);

  const navigate = useCallback((v: View) => {
    setView(v);
    document.querySelector('.main')?.scrollTo({ top: 0 });
  }, []);

  // Ctrl/⌘+K opens the command palette anywhere; "/" too when not typing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName ?? '');
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const active: Page = view.page === 'new' || view.page === 'edit' || view.page === 'detail' ? 'candidates' : view.page;
  const name = (id: number) => candidates?.find((c) => c.id === id)?.fullName ?? 'Candidate';

  const crumbs = useMemo(() => {
    const root = { label: PAGE_TITLES[active], onClick: () => navigate({ page: active }) };
    if (view.page === 'new') return [root, { label: 'New candidate' }];
    if (view.page === 'edit') return [root, { label: name(view.id), onClick: () => navigate({ page: 'detail', id: view.id }) }, { label: 'Edit' }];
    if (view.page === 'detail') return [root, { label: name(view.id) }];
    return [{ label: PAGE_TITLES[active] }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, active, candidates]);

  const awaiting = interviews.filter((i) => i.result === 'Scheduled' && new Date(i.scheduledStart).getTime() < now).length;
  const badges: Partial<Record<Page, number>> = {
    interviews: awaiting,
    candidates: candidates?.filter((c) => c.status === 'Selected').length ?? 0,
  };

  let content;
  if (!candidates) {
    content = error ? (
      <div className="page">
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      </div>
    ) : (
      <PageSkeleton />
    );
  } else if (view.page === 'dashboard') content = <Dashboard onNavigate={navigate} />;
  else if (view.page === 'candidates') content = <Candidates onNavigate={navigate} />;
  else if (view.page === 'interviews') content = <Interviews onNavigate={navigate} />;
  else if (view.page === 'onboarding') content = <Onboarding onNavigate={navigate} />;
  else if (view.page === 'new' || view.page === 'edit') {
    const existing = view.page === 'edit' ? candidates.find((c) => c.id === view.id) : undefined;
    content = <CandidateForm key={view.page === 'edit' ? view.id : 'new'} existing={existing} onNavigate={navigate} />;
  } else if (view.page === 'detail') content = <CandidateDetail key={view.id} id={view.id} initialTab={view.tab} onNavigate={navigate} />;

  const viewKey = view.page === 'detail' || view.page === 'edit' ? `${view.page}-${view.id}` : view.page;

  return (
    <div className="app">
      <Aura />
      <Sidebar
        active={active}
        collapsed={collapsed}
        onToggle={() => {
          setCollapsed((c) => {
            writePref('onb-sidebar', c ? 'open' : 'collapsed');
            return !c;
          });
        }}
        onNavigate={navigate}
        badges={badges}
      />
      <div className="workspace">
        <TopBar crumbs={crumbs} dark={dark} onToggleTheme={onToggleTheme} onOpenPalette={() => setPaletteOpen(true)} onNavigate={navigate} />
        <main className="main">
          <AnimatePresence mode="wait">
            <motion.div
              key={viewKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {content}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={navigate} onToggleTheme={onToggleTheme} />
    </div>
  );
}

export default function App() {
  const [dark, setDark] = useState(() => readPref('onb-theme', 'dark') === 'dark');
  const toggle = useCallback(() => {
    setDark((d) => {
      writePref('onb-theme', d ? 'light' : 'dark');
      return !d;
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);

  return (
    <MotionConfig reducedMotion="user">
      <FluentProvider theme={dark ? darkTheme : lightTheme}>
        <AppDataProvider>
          <Shell dark={dark} onToggleTheme={toggle} />
        </AppDataProvider>
        <Toaster toasterId={TOASTER_ID} position="bottom-end" pauseOnHover />
      </FluentProvider>
    </MotionConfig>
  );
}
