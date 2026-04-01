import * as React from 'react';
import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NumPadProps {
  onKey: (digit: string) => void;
  onDelete: () => void;
  onSubmit?: () => void;
  className?: string;
}

function NumPad({ onKey, onDelete, onSubmit, className }: NumPadProps) {
  // Handle keyboard input when numpad is focused
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (/^[0-9]$/.test(e.key)) onKey(e.key);
      else if (e.key === 'Backspace') onDelete();
      else if (e.key === 'Enter' && onSubmit) onSubmit();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onKey, onDelete, onSubmit]);

  return (
    <div
      className={cn('grid grid-cols-3 gap-1 place-items-center', className)}
      role="group"
      aria-label="Number pad"
    >
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
        <NumKey key={n} label={String(n)} onPress={() => onKey(String(n))} />
      ))}
      {/* Bottom row: empty, 0, delete */}
      <div />
      <NumKey label="0" onPress={() => onKey('0')} />
      <NumKey label="delete" isDelete onPress={onDelete} />
    </div>
  );
}

interface NumKeyProps {
  label: string;
  isDelete?: boolean;
  onPress: () => void;
}

function NumKey({ label, isDelete, onPress }: NumKeyProps) {
  const [pressed, setPressed] = React.useState(false);

  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => {
        setPressed(false);
        onPress();
      }}
      onPointerLeave={() => setPressed(false)}
      aria-label={isDelete ? 'Delete' : label}
      className={cn(
        'w-[72px] h-14 rounded-md border-none flex items-center justify-center transition-all select-none',
        'min-h-[44px] min-w-[44px]', /* POS touch target */
        pressed ? 'bg-primary-tint scale-95' : 'bg-transparent hover:bg-muted',
        isDelete ? 'text-muted-foreground' : 'text-foreground text-2xl font-medium'
      )}
    >
      {isDelete ? <Delete className="h-5 w-5" /> : label}
    </button>
  );
}

export { NumPad };
