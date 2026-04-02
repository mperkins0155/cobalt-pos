// ============================================================
// CloudPos — AppShell
// Responsive layout wrapper. Renders:
//   Desktop: Sidebar (left) + header bar + content
//   Tablet:  TopNav (top) + content
//   Mobile:  MobileHeader (top) + content + BottomNav (bottom)
// Wraps the Outlet from react-router-dom.
// ============================================================

import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Cloud, Settings } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAuth } from '@/contexts/AuthContext';
import { CommandPalette } from '@/components/CommandPalette';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { BottomNav } from './BottomNav';
import { SETTINGS_ITEM } from './navConfig';

/** Page title derived from current route */
function usePageTitle(): string {
  const { pathname } = useLocation();
  const titles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/pos': 'POS Register',
    '/orders': 'Orders',
    '/history': 'History',
    '/table-floor': 'Tables',
    '/pos/tickets': 'Kitchen',
    '/reports': 'Reports',
    '/customers': 'Customers',
    '/staff': 'Staff',
    '/inventory': 'Inventory',
    '/settings': 'Settings',
    '/catalog': 'Catalog',
    '/reservations': 'Reservations',
    '/suppliers': 'Suppliers',
    '/purchasing': 'Purchasing',
    '/quotations': 'Quotations',
    '/expenses': 'Expenses',
    '/reports/closeout': 'Closeout',
  };

  if (titles[pathname]) return titles[pathname];

  for (const [path, title] of Object.entries(titles)) {
    if (pathname.startsWith(path)) return title;
  }

  return 'CloudPos';
}

export function AppShell() {
  const bp = useBreakpoint();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  const userName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User'
    : 'User';
  const userInitials = userName
    .split(' ')
    .map((name) => name[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const userRole = profile?.role || 'cashier';
  const pageTitle = usePageTitle();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const shortcuts = useMemo(
    () => [
      {
        key: 'ctrl+k',
        description: 'Open command palette',
        action: () => setPaletteOpen(true),
      },
      {
        key: 'meta+k',
        description: 'Open command palette',
        action: () => setPaletteOpen(true),
      },
      {
        key: '/',
        description: 'Open command palette',
        action: () => setPaletteOpen(true),
      },
      {
        key: '?',
        description: 'Show keyboard shortcuts help',
        action: () => setShortcutsOpen(true),
      },
      {
        key: 'n',
        description: 'Start a new order',
        action: () => navigate('/pos'),
      },
      {
        key: 'escape',
        description: 'Close open overlays',
        action: () => {
          setPaletteOpen(false);
          setShortcutsOpen(false);
        },
      },
    ],
    [navigate]
  );

  const { getDescriptions } = useKeyboardShortcuts({
    enabled: location.pathname !== '/login',
    shortcuts,
  });

  let layoutContent: JSX.Element;

  if (bp === 'mobile') {
    layoutContent = (
      <div className="w-full h-dvh flex flex-col overflow-hidden bg-background">
        <div className="flex items-center px-3.5 py-2.5 bg-card border-b border-border shrink-0">
          <Cloud className="h-5 w-5 text-primary" />
          <span className="text-[15px] font-extrabold ml-1.5 flex-1 tracking-tight">
            CloudPos
          </span>
          <button
            onClick={() => navigate(SETTINGS_ITEM.path)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-[18px] w-[18px]" />
          </button>
          <button
            className="relative p-2 text-muted-foreground hover:text-foreground transition-colors mr-1"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            <div className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-destructive border-2 border-card" />
          </button>
          <button
            onClick={handleLogout}
            aria-label={`${userName} — Log out`}
            className="w-7 h-7 rounded-full bg-warning text-warning-foreground flex items-center justify-center text-[10px] font-bold shrink-0"
          >
            {userInitials}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          <Outlet />
        </div>

        <BottomNav userRole={userRole} />
      </div>
    );
  } else if (bp === 'tablet') {
    layoutContent = (
      <div className="w-full h-dvh flex flex-col overflow-hidden bg-background">
        <TopNav
          userName={userName}
          userInitials={userInitials}
          userRole={userRole}
          onLogout={handleLogout}
        />
        <div className="flex-1 overflow-y-auto flex flex-col">
          <Outlet />
        </div>
      </div>
    );
  } else {
    layoutContent = (
      <div className="w-full h-dvh flex overflow-hidden bg-background">
        <Sidebar
          userName={userName}
          userInitials={userInitials}
          userRole={userRole}
          onLogout={handleLogout}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center px-7 h-[52px] bg-card border-b border-border shrink-0">
            <h2 className="text-[17px] font-bold flex-1">{pageTitle}</h2>

            <button
              className="relative p-2 text-muted-foreground hover:text-foreground transition-colors mr-3"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              <div className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-destructive border-2 border-card" />
            </button>

            <div className="flex items-center gap-2 px-1.5 pr-3 py-1 rounded-full bg-muted cursor-default">
              <div className="w-[30px] h-[30px] rounded-full bg-warning text-warning-foreground flex items-center justify-center text-[11px] font-bold">
                {userInitials}
              </div>
              <span className="text-[13px] font-semibold">{userName}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col">
            <Outlet />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {layoutContent}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <KeyboardShortcutsHelp
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        shortcuts={getDescriptions().filter((s) =>
          // Show ⌘+K on Mac, Ctrl+K elsewhere — hide the duplicate
          isMac ? s.key !== 'ctrl+k' : s.key !== 'meta+k'
        )}
      />
    </>
  );
}
