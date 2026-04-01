// ============================================================
// CloudPos — Change Table Modal
// Phase 0D: Extracted from prototype ChangeTableContent
// Data: TableService.listTables() + TableService.updateTable()
// Last modified: V0.6.3.0 — see VERSION_LOG.md
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TableService } from '@/services/tables';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { DiningTable } from '@/types/database';

interface ChangeTableProps {
  open: boolean;
  onClose: () => void;
  currentTableId: string;
  currentTableName: string;
  /** Called after successful table change with the new table */
  onChanged?: (newTable: DiningTable) => void;
}

export function ChangeTableModal({
  open,
  onClose,
  currentTableId,
  currentTableName,
  onChanged,
}: ChangeTableProps) {
  const { organization, currentLocation } = useAuth();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !organization) return;
    setLoading(true);
    setSelectedId(null);
    TableService.listTables({
      orgId: organization.id,
      locationId: currentLocation?.id,
      includeInactive: false,
    })
      .then((all) => {
        // Only show available tables (exclude current)
        setTables(all.filter((t) => t.status === 'available' && t.id !== currentTableId));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, organization, currentLocation, currentTableId]);

  const handleConfirm = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      // Free the old table
      await TableService.setTableStatus(currentTableId, 'available');
      // Occupy the new table
      const newTable = await TableService.setTableStatus(selectedId, 'occupied');
      toast.success(`Moved to ${newTable.name}`);
      onChanged?.(newTable);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to change table');
    } finally {
      setSaving(false);
    }
  };

  const selectedTable = tables.find((t) => t.id === selectedId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Table</DialogTitle>
        </DialogHeader>

        {/* Visual: Current → New */}
        <div className="flex items-center justify-center gap-3 py-3">
          <div className="bg-warning-tint border border-warning/30 rounded-lg px-4 py-2 text-center">
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="text-sm font-bold text-foreground">{currentTableName}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          <div
            className={`rounded-lg px-4 py-2 text-center border ${
              selectedTable
                ? 'bg-success-tint border-success/30'
                : 'bg-muted border-border'
            }`}
          >
            <p className="text-xs text-muted-foreground">New</p>
            <p className="text-sm font-bold text-foreground">
              {selectedTable?.name || '—'}
            </p>
          </div>
        </div>

        {/* Available tables grid */}
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading tables...</p>
        ) : tables.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No available tables</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {tables.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`rounded-lg border p-2 text-center transition-all ${
                  selectedId === t.id
                    ? 'border-primary bg-primary-tint'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <p className="text-sm font-semibold">{t.name}</p>
                <Badge variant="secondary" className="text-[10px] mt-1">
                  {t.capacity} seats
                </Badge>
              </button>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedId || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Confirm Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
