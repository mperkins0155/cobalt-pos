// ============================================================
// CloudPos — useBreakpoint Hook
// Source: CloudPos prototype useBreakpoint()
// Breakpoints: mobile < 640 | tablet 640–1079 | desktop ≥ 1080
// ============================================================

import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

function getBreakpoint(): Breakpoint {
  const w = window.innerWidth;
  if (w < 640) return 'mobile';
  if (w < 1080) return 'tablet';
  return 'desktop';
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(getBreakpoint);

  useEffect(() => {
    const handler = () => setBp(getBreakpoint());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return bp;
}
