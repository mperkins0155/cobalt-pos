// ============================================================
// CloudPos — Table Floor Plan
// Phase 0D: Enhanced from cobalt-pos TableFloor + prototype TablePage
// Data: TableService.listFloors() + TableService.listTables()
// Last modified: V0.6.3.0 — see VERSION_LOG.md
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FilterPills, EmptyState } from '@/components/pos';
import { TableService } from '@/services/tables';
import { toast } from '@/components/ui/sonner';
import { Grid3X3, Users } from 'lucide-react';
import type { DiningTable, Floor, TableStatus } from '@/types/database';

/** Status color config matching prototype */
const STATUS_CONFIG: Record<TableStatus, { label: string; bg: string; border: string; text: string }> = {
  available:  { label: 'Available',   bg: 'bg-card',                border: 'border-border',     text: 'text-success' },
  occupied:   { label: 'Occupied',    bg: 'bg-warning-tint',        border: 'border-warning/40', text: 'text-warning' },
  reserved:   { label: 'Reserved',    bg: 'bg-card dark:bg-card',   border: 'border-primary/40', text: 'text-primary' },
  cleaning:   { label: 'Cleaning',    bg: 'bg-muted',               border: 'border-border',     text: 'text-muted-foreground' },
  inactive:   { label: 'Inactive',    bg: 'bg-muted/50',            border: 'border-border/50',  text: 'text-muted-foreground' },
};

export default function TableFloor() {
  const { organization, currentLocation } = useAuth();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState('all');

  const loadData = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const [floorsRes, tablesRes] = await Promise.all([
        TableService.listFloors(organization.id, currentLocation?.id),
        TableService.listTables({
          orgId: organization.id,
          locationId: currentLocation?.id,
          includeInactive: false,
        }),
      ]);
      setFloors(floorsRes);
      setTables(tablesRes);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [organization?.id, currentLocation?.id]);

  // Cycle status on tap
  const rotateStatus = async (table: DiningTable) => {
    const next: TableStatus =
      table.status === 'available' ? 'occupied'
        : table.status === 'occupied' ? 'reserved'
          : table.status === 'reserved' ? 'cleaning'
            : 'available';

    setUpdatingId(table.id);
    try {
      const updated = await TableService.setTableStatus(table.id, next);
      setTables((prev) => prev.map((t) => (t.id === table.id ? updated : t)));
    } catch (err) {
      console.error(err);
      toast.error('Failed to update table');
    } finally {
      setUpdatingId(null);
    }
  };

  // Floor filter tabs
  const floorTabs = useMemo(() => {
    const all = { key: 'all', label: 'All Floors', count: tables.length };
    const perFloor = floors.map((f) => ({
      key: f.id,
      label: f.name,
      count: tables.filter((t) => t.floor_id === f.id).length,
    }));
    return [all, ...perFloor];
  }, [floors, tables]);

  const visible = useMemo(
    () => tables.filter((t) => selectedFloor === 'all' || t.floor_id === selectedFloor),
    [tables, selectedFloor]
  );

  // Status summary counts
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of visible) c[t.status] = (c[t.status] || 0) + 1;
    return c;
  }, [visible]);

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      {/* Header + legend */}
      <div className="flex flex-col pos-tablet:flex-row pos-tablet:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Tables</h2>
        </div>
        {/* Status legend */}
        <div className="flex items-center gap-3 text-xs">
          {(['available', 'occupied', 'reserved', 'cleaning'] as TableStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                s === 'available' ? 'bg-success'
                  : s === 'occupied' ? 'bg-warning'
                    : s === 'reserved' ? 'bg-primary'
                      : 'bg-muted-foreground'
              }`} />
              <span className="text-muted-foreground">
                {STATUS_CONFIG[s].label}
                {statusCounts[s] ? ` (${statusCounts[s]})` : ''}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Floor tabs */}
      {floors.length > 0 && (
        <FilterPills
          items={floorTabs}
          active={selectedFloor}
          onChange={setSelectedFloor}
          className="mb-4"
        />
      )}

      {/* Table grid */}
      {loading ? (
        <div className="grid grid-cols-2 pos-tablet:grid-cols-3 pos-desktop:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Grid3X3 className="h-10 w-10" />}
          title="No tables"
          description="Add tables from your settings to start managing your floor."
        />
      ) : (
        <div className="grid grid-cols-2 pos-tablet:grid-cols-3 pos-desktop:grid-cols-5 gap-3 pb-20 pos-tablet:pb-4">
          {visible.map((table) => {
            const cfg = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
            const isUpdating = updatingId === table.id;
            return (
              <button
                key={table.id}
                onClick={() => rotateStatus(table)}
                disabled={isUpdating}
                className={`
                  relative rounded-xl border-2 p-4 text-left transition-all
                  ${cfg.bg} ${cfg.border}
                  hover:shadow-pos disabled:opacity-60
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-foreground">{table.name}</span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 font-semibold border-0 ${cfg.text}`}
                  >
                    {cfg.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{table.capacity} seats</span>
                </div>
                {/* Chair dots visual */}
                <div className="flex gap-1 mt-2.5">
                  {Array.from({ length: Math.min(table.capacity, 8) }).map((_, i) => (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        table.status === 'available' ? 'bg-success/40'
                          : table.status === 'occupied' ? 'bg-warning/40'
                            : table.status === 'reserved' ? 'bg-primary/40'
                              : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                  {table.capacity > 8 && (
                    <span className="text-[10px] text-muted-foreground">+{table.capacity - 8}</span>
                  )}
                </div>
                {isUpdating && (
                  <div className="absolute inset-0 bg-background/50 rounded-xl flex items-center justify-center">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
