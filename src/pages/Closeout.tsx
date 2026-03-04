import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ReportingService } from '@/services/reporting';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Lock } from 'lucide-react';
import type { CashShift } from '@/types/database';

export default function Closeout() {
  const navigate = useNavigate();
  const { organization, currentLocation, profile } = useAuth();
  const [shift, setShift] = useState<CashShift | null>(null);
  const [countedCash, setCountedCash] = useState('');
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    if (!organization || !currentLocation) return;
    ReportingService.getCurrentShift(organization.id, currentLocation.id)
      .then(setShift).catch(console.error).finally(() => setLoading(false));
  }, [organization, currentLocation]);

  const handleOpenShift = async () => {
    if (!organization || !currentLocation || !profile) return;
    const s = await ReportingService.openShift({
      orgId: organization.id, locationId: currentLocation.id,
      openedBy: profile.id, openingCash: 0,
    });
    setShift(s);
  };

  const handleClose = async () => {
    if (!shift || !profile) return;
    setClosing(true);
    try {
      const r = await ReportingService.closeShift({
        shiftId: shift.id, closedBy: profile.id,
        countedCash: parseFloat(countedCash) || 0,
      });
      setReport(r);
    } catch (err) { console.error(err); }
    finally { setClosing(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-lg font-bold">Cash Closeout (Z Report)</h1>
      </header>
      <div className="p-4 max-w-md mx-auto space-y-4">
        {loading ? <p>Loading...</p> : !shift ? (
          <Card><CardContent className="pt-4 text-center space-y-3">
            <p className="text-muted-foreground text-sm">No open shift</p>
            <Button onClick={handleOpenShift}>Open Shift</Button>
          </CardContent></Card>
        ) : report ? (
          <Card><CardHeader><CardTitle className="text-base">Closeout Complete</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span>Opening Cash</span><span>{formatCurrency(report.opening_cash)}</span></div>
              <div className="flex justify-between"><span>Cash Sales</span><span>{formatCurrency(report.cash_sales)}</span></div>
              <div className="flex justify-between"><span>Paid In</span><span>{formatCurrency(report.paid_in)}</span></div>
              <div className="flex justify-between"><span>Paid Out</span><span>-{formatCurrency(report.paid_out)}</span></div>
              <div className="flex justify-between font-medium"><span>Expected</span><span>{formatCurrency(report.expected_cash)}</span></div>
              <div className="flex justify-between font-medium"><span>Counted</span><span>{formatCurrency(report.counted_cash)}</span></div>
              <div className={`flex justify-between font-bold ${report.over_short >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <span>Over/Short</span><span>{formatCurrency(report.over_short)}</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card><CardHeader><CardTitle className="text-base">Close Shift</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Opened at {new Date(shift.opened_at).toLocaleString()}</p>
              <div><Label>Counted Cash</Label><Input type="number" step="0.01" value={countedCash} onChange={e => setCountedCash(e.target.value)} placeholder="0.00" /></div>
              <Button className="w-full" onClick={handleClose} disabled={closing}>
                <Lock className="h-4 w-4 mr-1" />{closing ? 'Closing...' : 'Close Shift & Print Z Report'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
