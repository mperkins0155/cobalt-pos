// ============================================================
// CloudPos — Desktop Sidebar (≥1080px)
// Source: CloudPos prototype Sidebar component
// Full-height left sidebar with icon + label nav, user card at bottom
// ============================================================

import { useLocation, useNavigate } from 'react-router-dom';
import { Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getNavItemsForRole,
  SETTINGS_ITEM,
  LOGOUT_ITEM,
} from './navConfig';

interface SidebarProps {
  userName: string;
  userInitials: string;
  userRole: string;
  onLogout: () => void;
}

export function Sidebar({ userName, userInitials, userRole, onLogout }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = getNavItemsForRole(userRole);

  const isActive = (path: string) => {
    if (path === '/pos' && location.pathname === '/pos') return true;
    if (path === '/pos') return false; // don't match /pos/tickets etc for dashboard
    return location.pathname.startsWith(path);
  };

  return (
    <div className="w-[230px] bg-card border-r border-border flex flex-col shrink-0 h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 pt-5 pb-4">
        <Cloud className="h-6 w-6 text-primary" />
        <span className="text-lg font-extrabold text-foreground tracking-tight">
          CloudPos
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2.5 space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-primary-tint text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom: Settings + Logout */}
      <div className="px-2.5 pb-2 border-t border-border pt-2">
        <button
          onClick={() => navigate(SETTINGS_ITEM.path)}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
            isActive(SETTINGS_ITEM.path)
              ? 'bg-primary-tint text-primary font-semibold'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <SETTINGS_ITEM.icon className="h-[18px] w-[18px]" />
          <span>{SETTINGS_ITEM.label}</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-destructive hover:bg-destructive-tint transition-colors"
        >
          <LOGOUT_ITEM.icon className="h-[18px] w-[18px]" />
          <span>{LOGOUT_ITEM.label}</span>
        </button>
      </div>

      {/* User card */}
      <div className="flex items-center gap-2 px-4 py-3.5 border-t border-border">
        <div className="w-8 h-8 rounded-full bg-warning text-warning-foreground flex items-center justify-center text-xs font-bold shrink-0">
          {userInitials}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-foreground truncate">{userName}</div>
          <div className="text-[10px] text-muted-foreground capitalize">{userRole}</div>
        </div>
      </div>
    </div>
  );
}
