import { supabase } from '@/lib/supabase';
import type { AuditLog } from '@/types/database';

export const AuditService = {
  /** Log an action */
  async log(params: {
    orgId: string;
    actorUserId: string;
    actionType: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await supabase.from('audit_logs').insert({
      org_id: params.orgId,
      actor_user_id: params.actorUserId,
      action_type: params.actionType,
      entity_type: params.entityType,
      entity_id: params.entityId,
      metadata: params.metadata || {},
    });
  },

  /** Get audit logs with pagination */
  async list(params: {
    orgId: string;
    actionType?: string;
    entityType?: string;
    entityId?: string;
    actorUserId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; count: number }> {
    let query = supabase
      .from('audit_logs')
      .select('*, actor:profiles!audit_logs_actor_user_id_fkey(first_name, last_name, role)', { count: 'exact' })
      .eq('org_id', params.orgId)
      .order('created_at', { ascending: false });

    if (params.actionType) query = query.eq('action_type', params.actionType);
    if (params.entityType) query = query.eq('entity_type', params.entityType);
    if (params.entityId) query = query.eq('entity_id', params.entityId);
    if (params.actorUserId) query = query.eq('actor_user_id', params.actorUserId);
    if (params.dateFrom) query = query.gte('created_at', params.dateFrom);
    if (params.dateTo) query = query.lte('created_at', params.dateTo);

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;
    return { logs: (data || []) as AuditLog[], count: count || 0 };
  },
};
