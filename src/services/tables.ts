import { supabase } from '@/lib/supabase';
import type { Floor, DiningTable, TableStatus } from '@/types/database';
import { v4 as uuid } from 'uuid';

export const TableService = {
  async getFloorById(id: string): Promise<Floor> {
    const { data, error } = await supabase.from('dining_floors').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Floor;
  },

  async createFloor(params: {
    orgId: string;
    locationId: string;
    name: string;
    code?: string;
    sortOrder?: number;
    isActive?: boolean;
  }): Promise<Floor> {
    const { data, error } = await supabase
      .from('dining_floors')
      .insert({
        id: uuid(),
        org_id: params.orgId,
        location_id: params.locationId,
        name: params.name,
        sort_order: params.sortOrder ?? 0,
        is_active: params.isActive ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Floor;
  },

  async updateFloor(id: string, updates: Partial<Floor>): Promise<Floor> {
    const { data, error } = await supabase
      .from('dining_floors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Floor;
  },

  async deleteFloor(id: string): Promise<void> {
    const { error } = await supabase.from('dining_floors').delete().eq('id', id);
    if (error) throw error;
  },

  async listFloors(orgId: string, locationId?: string): Promise<Floor[]> {
    let query = supabase
      .from('dining_floors')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (locationId) query = query.eq('location_id', locationId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Floor[];
  },

  async getTableById(id: string): Promise<DiningTable> {
    const { data, error } = await supabase
      .from('dining_tables')
      .select('*, floor:dining_floors(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as DiningTable;
  },

  async createTable(params: {
    orgId: string;
    locationId: string;
    name: string;
    floorId?: string;
    capacity?: number;
    status?: TableStatus;
    shape?: DiningTable['shape'];
    xPos?: number;
    yPos?: number;
    isActive?: boolean;
  }): Promise<DiningTable> {
    const { data, error } = await supabase
      .from('dining_tables')
      .insert({
        id: uuid(),
        org_id: params.orgId,
        location_id: params.locationId,
        floor_id: params.floorId,
        name: params.name,
        capacity: params.capacity ?? 2,
        status: params.status ?? 'available',
        shape: params.shape,
        position_x: params.xPos,
        position_y: params.yPos,
        is_active: params.isActive ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return data as DiningTable;
  },

  async updateTable(id: string, updates: Partial<DiningTable>): Promise<DiningTable> {
    const { data, error } = await supabase
      .from('dining_tables')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as DiningTable;
  },

  async deleteTable(id: string): Promise<void> {
    const { error } = await supabase.from('dining_tables').delete().eq('id', id);
    if (error) throw error;
  },

  async setTableStatus(id: string, status: TableStatus): Promise<DiningTable> {
    return this.updateTable(id, { status });
  },

  async listTables(params: {
    orgId: string;
    locationId?: string;
    floorId?: string;
    status?: TableStatus;
    includeInactive?: boolean;
  }): Promise<DiningTable[]> {
    let query = supabase
      .from('dining_tables')
      .select('*, floor:dining_floors(id, name, sort_order)')
      .eq('org_id', params.orgId)
      .order('name', { ascending: true });

    if (params.locationId) query = query.eq('location_id', params.locationId);
    if (params.floorId) query = query.eq('floor_id', params.floorId);
    if (params.status) query = query.eq('status', params.status);
    if (!params.includeInactive) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as DiningTable[];
  },

  async getFloorLayout(orgId: string, locationId: string): Promise<Floor[]> {
    const [floors, tables] = await Promise.all([
      this.listFloors(orgId, locationId),
      this.listTables({ orgId, locationId }),
    ]);

    return floors.map(floor => ({
      ...floor,
      tables: tables.filter(table => table.floor_id === floor.id),
    })) as Floor[];
  },
};
