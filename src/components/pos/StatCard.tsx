import * as React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type StatAccent = 'primary' | 'success' | 'warning' | 'destructive';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: StatAccent;
  className?: string;
}

const accentStyles: Record<StatAccent, { icon: string; value: string }> = {
  primary: { icon: 'bg-primary-tint text-primary', value: 'text-primary' },
  success: { icon: 'bg-success-tint text-success', value: 'text-success' },
  warning: { icon: 'bg-warning-tint text-warning', value: 'text-warning' },
  destructive: { icon: 'bg-destructive-tint text-destructive', value: 'text-destructive' },
};

function StatCard({
  icon,
  label,
  value,
  accent = 'primary',
  className,
}: StatCardProps) {
  const styles = accentStyles[accent];

  return (
    <Card className={cn('flex-1 min-w-0 p-4 border', className)}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-muted-foreground font-medium truncate">
          {label}
        </span>
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
            styles.icon
          )}
        >
          {icon}
        </div>
      </div>
      <span
        className={cn(
          'text-2xl font-extrabold tracking-tight',
          styles.value
        )}
      >
        {value}
      </span>
    </Card>
  );
}

export { StatCard };
export type { StatAccent };
