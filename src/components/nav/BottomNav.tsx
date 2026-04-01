// ============================================================
// CloudPos — Mobile BottomNav (<640px)
// Source: CloudPos prototype BottomNav component
// 5-icon bottom tab bar with active dot indicator + safe area inset
// ============================================================

import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getMobileNavItems } from './navConfig';

interface BottomNavProps {
  userRole: string;
}

export function BottomNav({ userRole }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = getMobileNavItems(userRole);

  const isActive = (path: string) => {
    if (path === '/pos' && location.pathname === '/pos') return true;
    if (path === '/pos') return false;
    return location.pathname.startsWith(path);
  };

  return (
    <div
      className="flex bg-card border-t border-border shrink-0"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 6px)' }}
    >
      {navItems.map((item) => {
        const active = isActive(item.path);
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 min-h-[48px] transition-colors',
              active ? 'text-primary' : 'text-tertiary-foreground'
            )}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className={cn('h-5 w-5', active && 'text-primary')} />
            <span className={cn('text-[10px]', active ? 'font-bold' : 'font-medium')}>
              {item.label}
            </span>
            {active && (
              <div className="w-1 h-1 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
