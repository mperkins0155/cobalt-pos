// ============================================================
// CloudPos — Tablet TopNav (640–1079px)
// Source: CloudPos prototype TopNav component
// Horizontal bar with logo + icon tabs + notification bell + user avatar
// ============================================================

import { useLocation, useNavigate } from 'react-router-dom';
import { Cloud, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getNavItemsForRole,
  SETTINGS_ITEM,
} from './navConfig';

interface TopNavProps {
  userName: string;
  userInitials: string;
  userRole: string;
  onLogout: () => void;
}

export function TopNav({ userName, userInitials, userRole, onLogout }: TopNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = getNavItemsForRole(userRole).filter((item) => !item.desktopOnly);

  const isActive = (path: string) => {
    if (path === '/pos' && location.pathname === '/pos') return true;
    if (path === '/pos') return false;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex items-center px-4 bg-card border-b border-border h-[50px] gap-1 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-1.5 mr-3">
        <Cloud className="h-5 w-5 text-primary" />
        <span className="text-[15px] font-extrabold text-foreground tracking-tight">
          CloudPos
        </span>
      </div>

      {/* Nav items */}
      {navItems.map((item) => {
        const active = isActive(item.path);
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-[7px] rounded-sm text-xs font-medium transition-colors min-h-[36px]',
              active
                ? 'bg-primary-tint text-primary font-semibold'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            <span>{item.label}</span>
          </button>
        );
      })}

      <div className="flex-1" />

      {/* Settings */}
      <button
        onClick={() => navigate(SETTINGS_ITEM.path)}
        className={cn(
          'flex items-center gap-1 px-2.5 py-[7px] rounded-sm transition-colors mr-1',
          isActive(SETTINGS_ITEM.path)
            ? 'bg-primary-tint text-primary'
            : 'text-muted-foreground hover:bg-accent'
        )}
        aria-label="Settings"
      >
        <SETTINGS_ITEM.icon className="h-[18px] w-[18px]" />
      </button>

      {/* Notification bell */}
      <button
        className="relative p-2 text-muted-foreground hover:text-foreground transition-colors mr-2"
        aria-label="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" />
        <div className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-destructive border-2 border-card" />
      </button>

      {/* User avatar / logout */}
      <button
        onClick={onLogout}
        aria-label={`${userName} — Log out`}
        className="w-[30px] h-[30px] rounded-full bg-warning text-warning-foreground flex items-center justify-center text-[11px] font-bold shrink-0 hover:ring-2 hover:ring-ring transition-all"
      >
        {userInitials}
      </button>
    </div>
  );
}
