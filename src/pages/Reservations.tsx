import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ReservationService } from '@/services/reservations';
import { TableService } from '@/services/tables';
import { toast } from '@/components/ui/sonner';
import type { DiningTable, Reservation, ReservationStatus } from '@/types/database';

export default function Reservations() {
  const navigate = useNavigate();
  const { organization, currentLocation } = useAuth();

  const [guestName, setGuestName] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [dateTime, setDateTime] = useState(new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16));
  const [selectedTableId, setSelectedTableId] = useState('');
  const [phone, setPhone] = useState('');

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const tableNameById = useMemo(
    () => new Map(tables.map(table => [table.id, table.name])),
    [tables]
  );

  const loadData = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const [reservationsResult, tablesResult] = await Promise.all([
        ReservationService.list({
          orgId: organization.id,
          locationId: currentLocation?.id,
          limit: 200,
        }),
        TableService.listTables({
          orgId: organization.id,
          locationId: currentLocation?.id,
          includeInactive: false,
        }),
      ]);
      setReservations(reservationsResult.reservations);
      setTables(tablesResult);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [organization?.id, currentLocation?.id]);

  const addReservation = async () => {
    if (!organization) return;
    if (!guestName.trim() || !dateTime) return;

    setCreating(true);
    try {
      const created = await ReservationService.create({
        orgId: organization.id,
        locationId: currentLocation?.id,
        tableId: selectedTableId || undefined,
        customerName: guestName.trim(),
        customerPhone: phone.trim() || undefined,
        partySize,
        reservedFor: new Date(dateTime).toISOString(),
        status: 'pending',
      });
      setReservations(prev => [created, ...prev]);
      if (created.table_id) {
        await TableService.setTableStatus(created.table_id, 'reserved');
      }
      toast.success('Reservation created');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create reservation');
    } finally {
      setCreating(false);
    }

    setGuestName('');
    setPhone('');
    setSelectedTableId('');
    setPartySize(2);
    setDateTime(new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16));
  };

  const updateStatus = async (reservation: Reservation, status: ReservationStatus) => {
    setUpdatingId(reservation.id);
    try {
      const updated = await ReservationService.setStatus(reservation.id, status);
      setReservations(prev => prev.map(row => (row.id === reservation.id ? updated : row)));

      if (reservation.table_id) {
        if (status === 'seated') await TableService.setTableStatus(reservation.table_id, 'occupied');
        if (status === 'completed' || status === 'cancelled' || status === 'no_show') {
          await TableService.setTableStatus(reservation.table_id, 'available');
        }
      }
      toast.success(`Reservation marked ${status}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update reservation');
    } finally {
      setUpdatingId(null);
    }
  };

  const statusTone = (status: ReservationStatus) => {
    if (status === 'seated' || status === 'completed') return 'default';
    if (status === 'cancelled' || status === 'no_show') return 'destructive';
    return 'secondary';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate('/settings')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Reservations</h1>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" className="text-primary-foreground text-xs" onClick={() => navigate('/table-floor')}>
            Table Floor
          </Button>
        </div>
      </header>

      <div className="p-4 max-w-3xl mx-auto space-y-3">
        {!currentLocation && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">No location selected. Reservation actions need a location context.</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">New Reservation</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Guest name" />
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" />
            <Input type="number" min={1} value={partySize} onChange={(e) => setPartySize(Number(e.target.value) || 1)} placeholder="Party size" />
            <Input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} />
            <select
              value={selectedTableId}
              onChange={(e) => setSelectedTableId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">No table</option>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name} ({table.status})
                </option>
              ))}
            </select>
            <Button onClick={addReservation} disabled={creating || !organization}>
              {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : reservations.length === 0 ? (
              <div className="text-sm text-muted-foreground">No reservations found.</div>
            ) : reservations.map((reservation) => (
              <div key={reservation.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{reservation.customer_name || 'Guest'}</p>
                    <p className="text-xs text-muted-foreground">
                      Party of {reservation.party_size} • {new Date(reservation.reserved_for).toLocaleString()}
                      {reservation.table_id ? ` • Table ${tableNameById.get(reservation.table_id) || reservation.table_id}` : ''}
                    </p>
                  </div>
                  <Badge variant={statusTone(reservation.status)}>{reservation.status}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {reservation.status === 'pending' && (
                    <>
                      <Button size="sm" variant="outline" disabled={updatingId === reservation.id} onClick={() => updateStatus(reservation, 'confirmed')}>Confirm</Button>
                      <Button size="sm" disabled={updatingId === reservation.id} onClick={() => updateStatus(reservation, 'seated')}>Seat</Button>
                      <Button size="sm" variant="outline" disabled={updatingId === reservation.id} onClick={() => updateStatus(reservation, 'cancelled')}>Cancel</Button>
                    </>
                  )}
                  {reservation.status === 'confirmed' && (
                    <>
                      <Button size="sm" disabled={updatingId === reservation.id} onClick={() => updateStatus(reservation, 'seated')}>Seat</Button>
                      <Button size="sm" variant="outline" disabled={updatingId === reservation.id} onClick={() => updateStatus(reservation, 'no_show')}>No Show</Button>
                    </>
                  )}
                  {reservation.status === 'seated' && (
                    <Button size="sm" disabled={updatingId === reservation.id} onClick={() => updateStatus(reservation, 'completed')}>Complete</Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
