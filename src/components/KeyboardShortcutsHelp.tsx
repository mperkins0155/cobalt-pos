// ============================================================
// CloudPos — Keyboard Shortcuts Help Overlay
// Phase 1A: Shows on '?' key press
// Last modified: V0.7.0.0 — see VERSION_LOG.md
// ============================================================

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

/** Render a key combo as styled kbd badges */
function KeyBadge({ combo }: { combo: string }) {
  const parts = combo.split('+').map((p) => {
    const labels: Record<string, string> = {
      ctrl: 'Ctrl',
      meta: '⌘',
      shift: 'Shift',
      escape: 'Esc',
      '/': '/',
      '?': '?',
    };
    return labels[p.toLowerCase()] || p.toUpperCase();
  });

  return (
    <span className="flex items-center gap-0.5">
      {parts.map((part, i) => (
        <span key={i}>
          <kbd className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded bg-muted border border-border text-[11px] font-mono font-semibold text-foreground">
            {part}
          </kbd>
          {i < parts.length - 1 && <span className="text-muted-foreground mx-0.5 text-xs">+</span>}
        </span>
      ))}
    </span>
  );
}

export function KeyboardShortcutsHelp({ open, onClose, shortcuts }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
          {shortcuts.map(({ key, description }) => (
            <div
              key={key}
              className="flex items-center justify-between py-2 px-1 rounded hover:bg-muted/50"
            >
              <span className="text-sm text-foreground">{description}</span>
              <KeyBadge combo={key} />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center pt-2">
          Press <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Esc</kbd> to close
        </p>
      </DialogContent>
    </Dialog>
  );
}
