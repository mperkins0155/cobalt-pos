import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { v4 as uuid } from 'uuid';

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const orgId = uuid();
      const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await supabase.from('organizations').insert({ id: orgId, name: businessName, slug });
      const locId = uuid();
      await supabase.from('locations').insert({ id: locId, org_id: orgId, name: 'Main', is_default: true });
      await supabase.from('profiles').insert({ id: uuid(), user_id: user.id, org_id: orgId, role: 'owner', first_name: firstName, last_name: lastName, email: user.email });
      await supabase.from('tax_rates').insert({ id: uuid(), org_id: orgId, name: 'Default Tax', rate: 8.25, is_default: true, is_active: true });
      await supabase.from('tip_settings').insert({ id: uuid(), org_id: orgId, mode: 'suggested', suggested_percentages: [15,18,20,25] });
      // Seed reason codes
      const reasons = [
        { reason_type: 'refund', code: 'CUSTOMER_REQUEST', label: 'Customer request' },
        { reason_type: 'refund', code: 'DEFECTIVE', label: 'Defective item' },
        { reason_type: 'refund', code: 'WRONG_ITEM', label: 'Wrong item' },
        { reason_type: 'void', code: 'DUPLICATE', label: 'Duplicate order' },
        { reason_type: 'void', code: 'CUSTOMER_CHANGED_MIND', label: 'Customer changed mind' },
        { reason_type: 'inventory_adjustment', code: 'DAMAGE', label: 'Damaged' },
        { reason_type: 'inventory_adjustment', code: 'THEFT', label: 'Theft/shrinkage' },
        { reason_type: 'inventory_adjustment', code: 'COUNT', label: 'Physical count' },
      ];
      await supabase.from('reason_codes').insert(reasons.map(r => ({ id: uuid(), org_id: orgId, ...r })));
      await refreshProfile();
      navigate('/pos', { replace: true });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>Set Up Your Business</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>Business Name</Label><Input value={businessName} onChange={e => setBusinessName(e.target.value)} required /></div>
            <div><Label>Your First Name</Label><Input value={firstName} onChange={e => setFirstName(e.target.value)} required /></div>
            <div><Label>Your Last Name</Label><Input value={lastName} onChange={e => setLastName(e.target.value)} required /></div>
            <Button className="w-full" disabled={loading}>{loading ? 'Setting up...' : 'Get Started'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
