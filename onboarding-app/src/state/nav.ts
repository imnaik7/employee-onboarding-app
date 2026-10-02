export type Page = 'dashboard' | 'candidates' | 'interviews' | 'onboarding';
export type DetailTab = 'overview' | 'interviews' | 'offer' | 'onboarding';

export type View =
  | { page: Page }
  | { page: 'new' }
  | { page: 'edit'; id: number }
  | { page: 'detail'; id: number; tab?: DetailTab };

export type Navigate = (v: View) => void;

export const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  candidates: 'Candidates',
  interviews: 'Interviews',
  onboarding: 'Onboarding',
};
