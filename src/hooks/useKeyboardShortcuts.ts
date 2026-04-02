import { useEffect, useCallback, useRef } from 'react';

export interface ShortcutDef {
  key: string;
  description: string;
  action: () => void;
  preventDefault?: boolean;
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: ShortcutDef[];
}

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isInputFocused(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  if (INPUT_TAGS.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  return false;
}

function parseKeyCombo(combo: string): {
  key: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
} {
  const parts = combo.toLowerCase().split('+');
  return {
    key: parts[parts.length - 1],
    ctrl: parts.includes('ctrl'),
    meta: parts.includes('meta'),
    shift: parts.includes('shift'),
  };
}

function matchesCombo(
  e: KeyboardEvent,
  combo: { key: string; ctrl: boolean; meta: boolean; shift: boolean }
): boolean {
  const eventKey = e.key.toLowerCase();
  const keyMatch = eventKey === combo.key;
  const ctrlMatch = combo.ctrl ? e.ctrlKey || e.metaKey : true;
  const metaMatch = combo.meta ? e.metaKey || e.ctrlKey : true;
  const shiftMatch = combo.shift ? e.shiftKey : true;

  if (!combo.ctrl && !combo.meta && !combo.shift) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return false;
  }

  return keyMatch && ctrlMatch && metaMatch && shiftMatch;
}

export function useKeyboardShortcuts({
  enabled = true,
  shortcuts,
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    for (const shortcut of shortcutsRef.current) {
      if (shortcut.enabled === false) continue;

      const combo = parseKeyCombo(shortcut.key);
      if (!matchesCombo(e, combo)) continue;

      if (combo.key !== 'escape' && isInputFocused(e)) {
        return;
      }

      if (shortcut.preventDefault !== false) {
        e.preventDefault();
      }

      shortcut.action();
      return;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  const getDescriptions = useCallback(
    () =>
      shortcutsRef.current
        .filter((shortcut) => shortcut.enabled !== false)
        .map(({ key, description }) => ({ key, description })),
    []
  );

  return { getDescriptions };
}
