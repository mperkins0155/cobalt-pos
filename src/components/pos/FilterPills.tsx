import * as React from 'react';
import { cn } from '@/lib/utils';

interface FilterItem {
  key: string;
  label: string;
  count?: number;
}

interface FilterPillsProps {
  items: FilterItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

function FilterPills({ items, active, onChange, className }: FilterPillsProps) {
  return (
    <div
      className={cn(
        'flex gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none',
        className
      )}
    >
      {items.map((item) => {
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all min-h-[36px]',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card text-muted-foreground border border-border hover:bg-accent'
            )}
          >
            {item.label}
            {item.count != null && (
              <span
                className={cn(
                  'px-1.5 py-px rounded-full text-[11px] min-w-[18px] text-center',
                  isActive
                    ? 'bg-white/25'
                    : 'bg-muted'
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { FilterPills };
export type { FilterItem };
