import type { NavigationTab } from '../types/pos';

/** Path segment for each main screen — e.g. /suppliers */
export const TAB_PATHS: Record<NavigationTab, string> = {
  register: '/register',
  inventory: '/inventory',
  transfers: '/transfers',
  orders: '/orders',
  customers: '/customers',
  suppliers: '/suppliers',
  users: '/users',
  reports: '/reports',
  financial: '/financial',
  expenses: '/expenses',
  'other-income': '/other-income',
  branches: '/branches',
  'setup-categories': '/setup/categories',
  'setup-units': '/setup/units',
  'setup-system-log': '/setup/system-log',
};

export const LOGIN_PATH = '/login';

const PATH_TO_TAB = Object.fromEntries(
  Object.entries(TAB_PATHS).map(([tab, path]) => [path, tab as NavigationTab])
) as Record<string, NavigationTab>;

export function tabToPath(tab: NavigationTab): string {
  return TAB_PATHS[tab] || TAB_PATHS.register;
}

export function pathToTab(pathname: string): NavigationTab | null {
  const path = (pathname || '/').replace(/\/+$/, '') || '/';
  if (path === '/' || path === '') return 'register';
  return PATH_TO_TAB[path] || null;
}

export function isAppPath(pathname: string): boolean {
  const path = (pathname || '/').replace(/\/+$/, '') || '/';
  return path === '/' || path === LOGIN_PATH || path in PATH_TO_TAB;
}

export function navigateToPath(path: string, replace = false): void {
  if (typeof window === 'undefined') return;
  const current = window.location.pathname;
  if (current === path) return;
  if (replace) {
    window.history.replaceState(null, '', path);
  } else {
    window.history.pushState(null, '', path);
  }
}
