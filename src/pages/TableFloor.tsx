import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutGrid, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TableService } from '@/services/tables';
import { toast } from '@/components/ui/sonner';
import type { DiningTable, Floor, TableStatus } from '@/types/database';

export default function TableFloor() {
  const navigate = useNavigate();
  const { organization, currentLocation } = useAuth();

  const [floors, setFloors] = useState<Floor[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingTableId, setUpdatingTableId] = useState<string | null>(null);
  const [creatingFloor, setCreatingFloor] = useState(false);
  const [creatingTable, setCreatingTable] = useState(false);

  const [selectedFloorId, setSelectedFloorId] = useState('all');
  const [newFloorName, setNewFloorName] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const [newTableFloorId, setNewTableFloorId] = useState('');

  const loadData = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const [floorsResult, tablesResult] = await Promise.all([
        TableService.listFloors(organization.id, currentLocation?.id),
        TableService.listTables({
          orgId: organization.id,
          locationId: currentLocation?.id,
          includeInactive: false,
        }),
      ]);
      setFloors(floorsResult);
      setTables(tablesResult);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load table floor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [organization?.id, currentLocation?.id]);

  const rotateStatus = async (table: DiningTable) => {
    const nextStatus: TableStatus =
      table.status === 'available'
        ? 'occupied'
        : table.status === 'occupied'
          ? 'reserved'
          : table.status === 'reserved'
            ? 'cleaning'
            : 'available';

    setUpdatingTableId(table.id);
    try {
      const updated = await TableService.setTableStatus(table.id, nextStatus);
      setTables(prev => prev.map(row => (row.id === table.id ? updated : row)));
    } catch (error) {
      console.error(error);
      toast.error('Failed to update table status');
    } finally {
      setUpdatingTableId(null);
    }
  };

  const createFloor = async () => {
    if (!organization || !currentLocation || !newFloorName.trim()) return;
    setCreatingFloor(true);
    try {
      const created = await TableService.createFloor({
        orgId: organization.id,
        locationId: currentLocation.id,
        name: newFloorName.trim(),
        sortOrder: floors.length,
      });
      setFloors(prev => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      setNewFloorName('');
      toast.success('Floor created');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create floor');
    } finally {
      setCreatingFloor(false);
    }
  };

  const createTable = async () => {
    if (!organization || !currentLocation || !newTableName.trim()) return;
    setCreatingTable(true);
    try {
      const created = await TableService.createTable({
        orgId: organization.id,
        locationId: currentLocation.id,
        floorId: newTableFloorId || undefined,
        name: newTableName.trim(),
        capacity: Math.max(1, Number(newTableCapacity) || 1),
      });
      setTables(prev => [...prev, created]);
      setNewTableName('');
      setNewTableCapacity('4');
      toast.success('Table created');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create table');
    } finally {
      setCreatingTable(false);
    }
  };

  const visibleTables = useMemo(
    () => tables.filter(table => selectedFloorId === 'all' || table.floor_id === selectedFloorId),
    [tables, selectedFloorId]
  );

  const floorNameById = useMemo(
    () => new Map(floors.map(floor => [floor.id, floor.name])),
    [floors]
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate('/settings')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Table Floor</h1>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" className="text-primary-foreground text-xs" onClick={() => navigate('/reservations')}>
            Reservations
          </Button>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto">
        {!currentLocation && (
          <Card className="mb-3">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">No location selected. Choose a location to manage floor layout.</p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Floor Setup</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={newFloorName} onChange={(e) => setNewFloorName(e.target.value)} placeholder="New floor name" />
            <Button onClick={createFloor} disabled={creatingFloor || !organization || !currentLocation}>
              {creatingFloor ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add Floor
            </Button>
            <Input value={newTableName} onChange={(e) => setNewTableName(e.target.value)} placeholder="New table name" />
            <Input type="number" min={1} value={newTableCapacity} onChange={(e) => setNewTableCapacity(e.target.value)} placeholder="Capacity" />
            <select
              value={newTableFloorId}
              onChange={(e) => setNewTableFloorId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm md:col-span-2"
            >
              <option value="">No floor</option>
              {floors.map((floor) => (
                <option key={floor.id} value={floor.id}>{floor.name}</option>
              ))}
            </select>
            <Button onClick={createTable} disabled={creatingTable || !organization || !currentLocation}>
              {creatingTable ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add Table
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Floor Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs text-muted-foreground">Tap a table to cycle status: available → occupied → reserved → cleaning.</p>
              <select
                value={selectedFloorId}
                onChange={(e) => setSelectedFloorId(e.target.value)}
                className="ml-auto h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="all">All floors</option>
                {floors.map((floor) => (
                  <option key={floor.id} value={floor.id}>{floor.name}</option>
                ))}
              </select>
            </div>

            {loading ? <div className="text-sm text-muted-foreground">Loading...</div> : null}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {visibleTables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => rotateStatus(table)}
                  className="border rounded-lg p-3 text-left bg-card hover:border-primary transition-colors"
                  disabled={updatingTableId === table.id}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">{table.name}</p>
                    <Badge variant={table.status === 'occupied' ? 'default' : 'secondary'}>{table.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {table.capacity} seats{table.floor_id ? ` • ${floorNameById.get(table.floor_id) || 'Floor'}` : ''}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
