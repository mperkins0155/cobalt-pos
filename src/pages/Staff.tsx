// ============================================================
// CloudPos — Staff Page
// Phase 0D: Extracted from prototype StaffPage
// Data: Supabase profiles table query
// Last modified: V0.6.3.0 — see VERSION_LOG.md
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/pos';
import { Users } from 'lucide-react';
import type { Profile, AppRole } from '@/types/database';

const ROLE_STYLES: Record<AppRole, { bg: string; text: string }> = {
  owner: { bg: 'bg-warning-tint', text: 'text-warning' },
  manager: { bg: 'bg-warning-tint', text: 'text-warning' },
  cashier: { bg: 'bg-primary-tint', text: 'text-primary' },
  accountant: { bg: 'bg-success-tint', text: 'text-success' },
};

function getInitials(p: Profile): string {
  const first = p.first_name?.[0] || '';
  const last = p.last_name?.[0] || '';
  return (first + last).toUpperCase() || '??';
}

function getFullName(p: Profile): string {
  return `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unnamed';
}

const AVATAR_COLORS = [
  'from-warning to-warning/70',
  'from-primary to-primary/70',
  'from-success to-success/70',
  'from-destructive to-destructive/70',
  'from-[#9B59B6] to-[#9B59B6]/70',
];

export default function Staff() {
  const { organization } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('org_id', organization.id)
          .eq('is_active', true)
          .order('role', { ascending: true });

        if (error) throw error;
        setProfiles((data || []) as Profile[]);
      } catch (err) {
        console.error('Staff load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [organization]);

  const activeCount = profiles.filter((p) => p.is_active).length;

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-card">
          <Users className="h-[18px] w-[18px] text-foreground" />
          <span className="text-[15px] font-bold">Staff</span>
        </div>
        <div className="flex-1" />
        <div className="px-4 py-2.5 rounded-md bg-primary-tint text-sm">
          <span className="text-muted-foreground">Active:</span>{' '}
          <span className="font-bold text-primary">
            {activeCount}/{profiles.length}
          </span>
        </div>
      </div>

      {/* Staff grid */}
      {loading ? (
        <div className="grid pos-tablet:grid-cols-2 pos-desktop:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[180px] rounded-lg" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState
          title="No staff members"
          description="Staff members will appear here once profiles are created."
        />
      ) : (
        <div className="grid pos-tablet:grid-cols-2 pos-desktop:grid-cols-3 gap-3">
          {profiles.map((emp, idx) => {
            const roleStyle = ROLE_STYLES[emp.role] || ROLE_STYLES.cashier;
            const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];

            return (
              <div
                key={emp.id}
                className="bg-card rounded-lg border border-border p-4 relative overflow-hidden"
              >
                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary to-success" />

                {/* Header: avatar + name + role */}
                <div className="flex items-center gap-3 mb-3.5">
                  <div
                    className={`w-11 h-11 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-sm font-bold text-white shrink-0`}
                  >
                    {getInitials(emp)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold text-foreground truncate">
                      {getFullName(emp)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${roleStyle.bg} ${roleStyle.text}`}
                      >
                        {emp.role.charAt(0).toUpperCase() + emp.role.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact info */}
                {emp.email && (
                  <div className="text-xs text-muted-foreground mb-1 truncate">
                    {emp.email}
                  </div>
                )}
                {emp.phone && (
                  <div className="text-xs text-muted-foreground mb-3 truncate">
                    {emp.phone}
                  </div>
                )}

                {/* Member since */}
                <div className="text-[11px] text-tertiary-foreground">
                  Member since{' '}
                  {new Date(emp.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
