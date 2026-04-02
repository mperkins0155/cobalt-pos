import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface ShortcutEntry {
  key: string;
  description: string;
}

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
  shortcuts: ShortcutEntry[];
}

function KeyBadge({ combo }: { combo: string }) {
  const parts = combo.split('+').map((part) => {
    const labels: Record<string, string> = {
      ctrl: 'Ctrl',
      meta: 'Cmd',
      shift: 'Shift',
      escape: 'Esc',
      '/': '/',
      '?': '?',
    };
    return labels[part.toLowerCase()] || part.toUpperCase();
  });

  return (
    <span className="flex items-center gap-0.5">
      {parts.map((part, index) => (
        <span key={`${part}-${index}`}>
          <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-semibold text-foreground">
            {part}
          </kbd>
          {index < parts.length - 1 && (
            <span className="mx-0.5 text-xs text-muted-foreground">+</span>
          )}
        </span>
      ))}
    </span>
  );
}

export function KeyboardShortcutsHelp({
  open,
  onClose,
  shortcuts,
}: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-1.5 overflow-y-auto">
          {shortcuts.map(({ key, description }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded px-1 py-2 hover:bg-muted/50"
            >
              <span className="text-sm text-foreground">{description}</span>
              <KeyBadge combo={key} />
            </div>
          ))}
        </div>
        <p className="pt-2 text-center text-xs text-muted-foreground">
          Press{' '}
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
            Esc
          </kbd>{' '}
          to close
        </p>
      </DialogContent>
    </Dialog>
  );
}
