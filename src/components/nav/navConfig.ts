// ============================================================
// CloudPos — Navigation Configuration
// Single source of truth for nav items across Sidebar, TopNav, BottomNav.
// Routes map to cobalt-pos pages. Will update as pages are extracted in Phase 0D.
// ============================================================

import {
  LayoutDashboard,
  ClipboardList,
  Grid3X3,
  ChefHat,
  BarChart3,
  Users,
  Package,
  Clock,
  CalendarDays,
  Settings,
  LogOut,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  /** If true, only shown on desktop sidebar (not mobile/tablet) */
  desktopOnly?: boolean;
  /** Minimum role needed to see this item */
  minRole?: 'owner' | 'manager' | 'cashier';
}

/** Primary nav items — visible across all nav variants (unless desktopOnly) */
export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { key: 'orders', label: 'Orders', path: '/orders', icon: ClipboardList },
  { key: 'tables', label: 'Tables', path: '/table-floor', icon: Grid3X3 },
  { key: 'kitchen', label: 'Kitchen', path: '/pos/tickets', icon: ChefHat },
  { key: 'reports', label: 'Reports', path: '/reports', icon: BarChart3, minRole: 'manager' },
  { key: 'reservations', label: 'Reservations', path: '/reservations', icon: CalendarDays, desktopOnly: true },
  { key: 'customers', label: 'Customers', path: '/customers', icon: Users, desktopOnly: true },
  { key: 'inventory', label: 'Inventory', path: '/inventory', icon: Package, desktopOnly: true, minRole: 'manager' },
  { key: 'history', label: 'History', path: '/history', icon: Clock, desktopOnly: true },
];

/** Utility nav — settings + logout, rendered separately in sidebar/topnav */
export const SETTINGS_ITEM: NavItem = {
  key: 'settings',
  label: 'Settings',
  path: '/settings',
  icon: Settings,
};

export const LOGOUT_ITEM = {
  key: 'logout',
  label: 'Log Out',
  icon: LogOut,
};

/** Filter nav items by role */
export function getNavItemsForRole(role: string): NavItem[] {
  const roleLevel: Record<string, number> = {
    owner: 3,
    manager: 2,
    cashier: 1,
    accountant: 1,
  };
  const userLevel = roleLevel[role] ?? 1;

  return NAV_ITEMS.filter((item) => {
    if (!item.minRole) return true;
    return userLevel >= (roleLevel[item.minRole] ?? 1);
  });
}

/** Mobile bottom nav shows max 5 non-desktopOnly items */
export function getMobileNavItems(role: string): NavItem[] {
  return getNavItemsForRole(role).filter((item) => !item.desktopOnly).slice(0, 5);
}
