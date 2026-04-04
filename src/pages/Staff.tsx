import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { DataTable } from '@/components/DataTable';
import { SearchBar } from '@/components/pos';
import { staffColumns } from '@/columns';
import { Users } from 'lucide-react';
import type { Profile } from '@/types/database';

export default function Staff() {
  const { organization } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('org_id', organization.id)
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

  const filtered = search.trim()
    ? profiles.filter((p) => {
        const q = search.toLowerCase();
        const name = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
        return name.includes(q) || (p.email || '').toLowerCase().includes(q) || p.role.includes(q);
      })
    : profiles;

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Staff</h2>
          <span className="ml-2 rounded-md bg-primary-tint px-2.5 py-1 text-xs font-semibold text-primary">
            {profiles.filter((p) => p.is_active).length} active
          </span>
        </div>
      </div>

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, or role" />
      </div>

      <DataTable
        columns={staffColumns}
        data={filtered}
        loading={loading}
        rowKey={(r) => r.id}
        emptyTitle="No staff members"
        emptyDescription="Staff members will appear here once profiles are created."
        emptyIcon={<Users className="h-10 w-10" />}
        pageSize={15}
      />
    </div>
  );
}
