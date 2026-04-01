import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepperBarProps {
  steps: string[];
  current: number;
  className?: string;
}

function StepperBar({ steps, current, className }: StepperBarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 py-3 px-4 flex-wrap',
        className
      )}
    >
      {steps.map((step, i) => {
        const isDone = i < current;
        const isActive = i === current;

        return (
          <React.Fragment key={i}>
            <div
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                isActive && 'bg-primary text-primary-foreground',
                isDone && 'bg-success-tint text-success',
                !isActive && !isDone && 'text-tertiary-foreground'
              )}
            >
              {isDone ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span className="text-[11px]">{i + 1}</span>
              )}
              {/* Always show label on tablet+, only active on mobile */}
              <span className="hidden pos-tablet:inline">{step}</span>
              {isActive && <span className="pos-tablet:hidden">{step}</span>}
            </div>
            {i < steps.length - 1 && (
              <span className="text-xs text-tertiary-foreground">›</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export { StepperBar };
