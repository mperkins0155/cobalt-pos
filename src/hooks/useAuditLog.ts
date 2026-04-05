// ============================================================
// CloudPos — useAuditLog hook
// Phase 11: Thin wrapper so call sites don't repeat orgId/userId plumbing.
// Last modified: V0.8.0.0 — see VERSION_LOG.md
// ============================================================

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuditService } from '@/services/audit';

interface LogParams {
  actionType: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Returns a `log()` function pre-wired with the current user's orgId and userId.
 * Failures are swallowed — audit logging must never block the primary user action.
 */
export function useAuditLog() {
  const { organization, user } = useAuth();

  const log = useCallback(
    async (params: LogParams) => {
      if (!organization?.id || !user?.id) return;
      try {
        await AuditService.log({
          orgId: organization.id,
          actorUserId: user.id,
          ...params,
        });
      } catch (err) {
        // Audit failures must never surface to the user
        console.warn('[AuditLog] Failed to write audit entry:', err);
      }
    },
    [organization?.id, user?.id]
  );

  return { log };
}
