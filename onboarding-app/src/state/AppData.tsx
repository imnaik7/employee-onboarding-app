import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { listCandidates, listInterviews, listTasks, type Candidate, type Interview, type OnboardingTask } from '../services/onboarding';
import { getCurrentUser, type CurrentUser } from '../services/currentUser';
import { AppDataContext } from './appDataContext';

/** Loads all onboarding data once and shares it; pages call refresh() after a write. */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  // Fetches everything; state is only set in the promise callbacks (never synchronously)
  const load = useCallback(
    () =>
      Promise.all([listCandidates(), listInterviews(), listTasks()])
        .then(([c, i, t]) => {
          setCandidates(c);
          setInterviews(i);
          setTasks(t);
          setError('');
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
        .finally(() => {
          setNow(Date.now());
          setLoading(false);
        }),
    [],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  useEffect(() => {
    load().catch(() => undefined);
    // The user lookup is cosmetic (avatar, "my" filters) — never block the app on it
    getCurrentUser().then(setMe).catch(() => setMe(null));
  }, [load]);

  const byId = useMemo(() => new Map((candidates ?? []).map((c) => [c.id, c])), [candidates]);

  return (
    <AppDataContext.Provider value={{ candidates, interviews, tasks, me, error, loading, now, refresh, byId }}>{children}</AppDataContext.Provider>
  );
}
