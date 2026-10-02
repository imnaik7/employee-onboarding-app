import { createContext, useContext } from 'react';
import type { Candidate, Interview, OnboardingTask } from '../services/onboarding';
import type { CurrentUser } from '../services/currentUser';

export interface AppData {
  candidates: Candidate[] | null;
  interviews: Interview[];
  tasks: OnboardingTask[];
  me: CurrentUser | null;
  error: string;
  loading: boolean;
  /** Timestamp of the last data load — use instead of Date.now() during render */
  now: number;
  refresh: () => Promise<void>;
  byId: Map<number, Candidate>;
}

export const AppDataContext = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const v = useContext(AppDataContext);
  if (!v) throw new Error('useAppData must be used inside AppDataProvider');
  return v;
}
