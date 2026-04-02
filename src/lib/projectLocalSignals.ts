export interface LocalProjectSignal {
  workspace: string;
  runSummary?: string;
  lastRunAt?: string;
  runWarnings?: number;
  logName?: string;
  currentVersion?: string;
  nextPhase?: string;
  docSummary?: string;
}

export const projectLocalSignals: Record<string, LocalProjectSignal> = {
  'cobalt-pos-2026-03-04': {
    workspace: 'cobalt-pos-2026-03-04',
    logName: 'cobalt-pos-env.log',
    runSummary: 'Vite dev server active on http://127.0.0.1:5180 with recent HMR reloads.',
    lastRunAt: '2026-04-01T22:59:05-05:00',
    runWarnings: 0,
    currentVersion: 'V1.2.0.0-Production',
    nextPhase: 'Phase 7 — UX polish + launch hardening',
    docSummary:
      'Financial hardening completed; production build, lint, typecheck, and tests are green.',
  },
  'two7-cmc-platform': {
    workspace: 'two7-cmc-platform',
    logName: 'suite-home-env.log',
    runSummary: 'Next.js suite-home and suite-pos dev servers are active with recent sign-in traffic.',
    lastRunAt: '2026-04-01T22:42:00-05:00',
    runWarnings: 1,
    nextPhase: 'Turn suite stubs into working modules with auth, data, and navigation flows',
    docSummary:
      'Shared contracts and identity migration exist; most suite apps are still integration targets.',
  },
};
