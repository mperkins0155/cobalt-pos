// ============================================================
// CloudPos — Keyboard Shortcuts Hook
// Phase 1A: Modeled on Enterprise POS useKeyboardShortcuts
// Input-aware: won't fire when focused on text fields
// Last modified: V0.7.0.0 — see VERSION_LOG.md
// ============================================================

import { useEffect, useCallback, useRef } from 'react';

export interface ShortcutDef {
  /** Key combo: 'n', 'ctrl+k', 'meta+k', 'escape', '1'-'9', '?' */
  key: string;
  /** Human-readable description for help overlay */
  description: string;
  /** Handler function */
  action: () => void;
  /** If true, calls e.preventDefault() */
  preventDefault?: boolean;
  /** Enabled state — defaults to true */
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  /** Master enable/disable for all shortcuts */
  enabled?: boolean;
  /** Shortcuts definitions */
  shortcuts: ShortcutDef[];
}

/** Elements that should suppress shortcut firing */
const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isInputFocused(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement;
  if (!target) return false;
  if (INPUT_TAGS.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  // Allow Escape to fire even in inputs (for closing modals)
  return false;
}

function parseKeyCombo(combo: string): { key: string; ctrl: boolean; meta: boolean; shift: boolean } {
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
  const ctrlMatch = combo.ctrl ? (e.ctrlKey || e.metaKey) : true;
  const metaMatch = combo.meta ? (e.metaKey || e.ctrlKey) : true;
  const shiftMatch = combo.shift ? e.shiftKey : true;

  // If no modifiers required, ensure none are pressed (except for special keys)
  if (!combo.ctrl && !combo.meta && !combo.shift) {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
  }

  return keyMatch && ctrlMatch && metaMatch && shiftMatch;
}

export function useKeyboardShortcuts({ enabled = true, shortcuts }: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    for (const shortcut of shortcutsRef.current) {
      if (shortcut.enabled === false) continue;

      const combo = parseKeyCombo(shortcut.key);

      if (matchesCombo(e, combo)) {
        // Allow Escape to always fire (for closing modals)
        // Block other shortcuts when focused on input
        if (combo.key !== 'escape' && isInputFocused(e)) {
          return;
        }

        if (shortcut.preventDefault !== false) {
          e.preventDefault();
        }

        shortcut.action();
        return;
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  /** Get all active shortcut descriptions for help overlay */
  const getDescriptions = useCallback(() => {
    return shortcutsRef.current
      .filter((s) => s.enabled !== false)
      .map((s) => ({ key: s.key, description: s.description }));
  }, []);

  return { getDescriptions };
}
