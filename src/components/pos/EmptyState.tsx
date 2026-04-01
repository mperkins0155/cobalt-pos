import * as React from 'react';
import { ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

function EmptyState({
  icon,
  title = 'No data found',
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
        {icon || <ClipboardList className="h-6 w-6 text-tertiary-foreground" />}
      </div>
      <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-[280px]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export { EmptyState };
