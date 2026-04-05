// ============================================================
// CloudPos — New Reservation Modal
// Phase 9: Reservation creation form in a shadcn Dialog
// Last modified: V0.7.3.0 — see VERSION_LOG.md
// ============================================================

import { useState } from 'react';
import { Loader2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReservationService } from '@/services/reservations';
import { TableService } from '@/services/tables';
import { toast } from '@/components/ui/sonner';
import type { DiningTable, Reservation } from '@/types/database';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  locationId?: string;
  tables: DiningTable[];
  onCreated: (reservation: Reservation) => void;
}

function defaultDateTime() {
  const d = new Date(Date.now() + 60 * 60 * 1000); // +1 hour
  // Format to datetime-local string (YYYY-MM-DDTHH:mm)
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewReservationModal({ open, onOpenChange, orgId, locationId, tables, onCreated }: Props) {
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [dateTime, setDateTime] = useState(defaultDateTime);
  const [tableId, setTableId] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [duration, setDuration] = useState(90);
  const [saving, setSaving] = useState(false);

  // Only offer available tables for new reservations
  const availableTables = tables.filter((t) => t.status === 'available' || t.status === 'reserved');

  const canSubmit = guestName.trim().length > 0 && dateTime.length > 0 && partySize >= 1;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const reservation = await ReservationService.create({
        orgId,
        locationId,
        tableId: tableId || undefined,
        customerName: guestName.trim(),
        customerPhone: phone.trim() || undefined,
        customerEmail: email.trim() || undefined,
        partySize,
        reservedFor: new Date(dateTime).toISOString(),
        durationMinutes: duration,
        specialRequests: specialRequests.trim() || undefined,
        status: 'pending',
      });

      // Mark the table as reserved if one was assigned
      if (reservation.table_id) {
        await TableService.setTableStatus(reservation.table_id, 'reserved');
      }

      onCreated(reservation);
      toast.success(`Reservation created for ${guestName.trim()}`);
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create reservation');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setGuestName('');
    setPhone('');
    setEmail('');
    setPartySize(2);
    setDateTime(defaultDateTime());
    setTableId('');
    setSpecialRequests('');
    setDuration(90);
    onOpenChange(false);
  };

  const adjustParty = (delta: number) => {
    setPartySize((prev) => Math.max(1, Math.min(20, prev + delta)));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Reservation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Guest name */}
          <div className="space-y-1.5">
            <Label htmlFor="guest-name">Guest name <span className="text-destructive">*</span></Label>
            <Input
              id="guest-name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g. Sarah Johnson"
              autoFocus
            />
          </div>

          {/* Phone + Email row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Date/time + party size row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="datetime">Date & time <span className="text-destructive">*</span></Label>
              <Input
                id="datetime"
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Party size</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => adjustParty(-1)}
                  disabled={partySize <= 1}
                  aria-label="Decrease party size"
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-8 text-center text-sm font-semibold tabular-nums">
                  {partySize}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => adjustParty(1)}
                  disabled={partySize >= 20}
                  aria-label="Increase party size"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Table + Duration row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Table</Label>
              <Select value={tableId} onValueChange={setTableId}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign table (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No table assigned</SelectItem>
                  {availableTables.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} — {t.capacity} seats
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="150">2.5 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Special requests */}
          <div className="space-y-1.5">
            <Label htmlFor="requests">Special requests</Label>
            <Textarea
              id="requests"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Allergies, high chair, birthday, etc."
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating…
              </>
            ) : (
              'Create reservation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
