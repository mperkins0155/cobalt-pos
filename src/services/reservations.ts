import { supabase } from '@/lib/supabase';
import type { Reservation, ReservationStatus } from '@/types/database';
import { v4 as uuid } from 'uuid';

function normalizeReservation(row: any): Reservation {
  return {
    ...row,
    customer_name: row.customer_name ?? row.guest_name,
    customer_phone: row.customer_phone ?? row.guest_phone,
    customer_email: row.customer_email ?? row.guest_email,
  } as Reservation;
}

export const ReservationService = {
  async getById(id: string): Promise<Reservation> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*, customer_name:guest_name, customer_phone:guest_phone, customer_email:guest_email, table:dining_tables(*), customer:pos_customers(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return normalizeReservation(data);
  },

  async create(params: {
    orgId: string;
    locationId?: string;
    floorId?: string;
    tableId?: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    partySize: number;
    reservedFor: string;
    reservationNumber?: string;
    status?: ReservationStatus;
    source?: Reservation['source'];
    durationMinutes?: number;
    specialRequests?: string;
    updatedBy?: string;
    notes?: string;
    createdBy?: string;
  }): Promise<Reservation> {
    const { data, error } = await supabase
      .from('reservations')
      .insert({
        id: uuid(),
        org_id: params.orgId,
        location_id: params.locationId,
        floor_id: params.floorId,
        table_id: params.tableId,
        customer_id: params.customerId,
        guest_name: params.customerName,
        guest_phone: params.customerPhone,
        guest_email: params.customerEmail,
        reservation_number: params.reservationNumber || `RSV-${Date.now()}`,
        party_size: params.partySize,
        reserved_for: params.reservedFor,
        status: params.status || 'pending',
        source: params.source || 'walk_in',
        duration_minutes: params.durationMinutes || 90,
        special_requests: params.specialRequests,
        notes: params.notes,
        created_by: params.createdBy,
        updated_by: params.updatedBy,
      })
      .select()
      .single();
    if (error) throw error;
    return normalizeReservation(data);
  },

  async update(id: string, updates: Partial<Reservation>): Promise<Reservation> {
    const { data, error } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return normalizeReservation(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (error) throw error;
  },

  async setStatus(id: string, status: ReservationStatus): Promise<Reservation> {
    const updates: Record<string, unknown> = { status };
    if (status === 'seated') updates.seated_at = new Date().toISOString();
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    if (status === 'cancelled' || status === 'no_show') updates.cancelled_at = new Date().toISOString();
    return this.update(id, updates as Partial<Reservation>);
  },

  async list(params: {
    orgId: string;
    locationId?: string;
    floorId?: string;
    tableId?: string;
    status?: ReservationStatus;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ reservations: Reservation[]; count: number }> {
    let query = supabase
      .from('reservations')
      .select('*, customer_name:guest_name, customer_phone:guest_phone, customer_email:guest_email, table:dining_tables(name, capacity, status), customer:pos_customers(first_name, last_name, phone)', { count: 'exact' })
      .eq('org_id', params.orgId)
      .order('reserved_for', { ascending: true });

    if (params.locationId) query = query.eq('location_id', params.locationId);
    if (params.floorId) query = query.eq('floor_id', params.floorId);
    if (params.tableId) query = query.eq('table_id', params.tableId);
    if (params.status) query = query.eq('status', params.status);
    if (params.dateFrom) query = query.gte('reserved_for', params.dateFrom);
    if (params.dateTo) query = query.lte('reserved_for', params.dateTo);

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;
    return { reservations: (data || []).map(normalizeReservation), count: count || 0 };
  },

  async listUpcoming(orgId: string, locationId?: string, limit: number = 25): Promise<Reservation[]> {
    let query = supabase
      .from('reservations')
      .select('*, customer_name:guest_name, customer_phone:guest_phone, customer_email:guest_email, table:dining_tables(name, capacity, status)')
      .eq('org_id', orgId)
      .in('status', ['pending', 'confirmed', 'seated'])
      .gte('reserved_for', new Date().toISOString())
      .order('reserved_for', { ascending: true })
      .limit(limit);

    if (locationId) query = query.eq('location_id', locationId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(normalizeReservation);
  },
};
