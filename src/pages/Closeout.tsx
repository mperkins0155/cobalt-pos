// ============================================================
// CloudPos — Closeout / Z-Report Page
// Phase 0D: Enhanced from cobalt-pos Closeout with CloudPos design
// Data: ReportingService.getCurrentShift() + closeShift()
// Last modified: V0.6.3.0 — see VERSION_LOG.md
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ReportingService, type CloseoutReport } from '@/services/reporting';
import { formatCurrency } from '@/lib/calculations';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/pos';
import { ArrowLeft, Lock, FileText, CheckCircle, Loader2 } from 'lucide-react';
import type { CashShift } from '@/types/database';

export default function Closeout() {
  const navigate = useNavigate();
  const { organization, currentLocation, profile } = useAuth();
  const [shift, setShift] = useState<CashShift | null>(null);
  const [countedCash, setCountedCash] = useState('');
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [report, setReport] = useState<CloseoutReport | null>(null);

  useEffect(() => {
    if (!organization || !currentLocation) return;
    ReportingService.getCurrentShift(organization.id, currentLocation.id)
      .then(setShift)
      .catch((err: unknown) => { console.error(err); toast.error('Failed to load shift data'); })
      .finally(() => setLoading(false));
  }, [organization, currentLocation]);

  const handleOpenShift = async () => {
    if (!organization || !currentLocation || !profile) return;
    const s = await ReportingService.openShift({
      orgId: organization.id,
      locationId: currentLocation.id,
      openedBy: profile.id,
      openingCash: 0,
    });
    setShift(s);
  };

  const handleClose = async () => {
    if (!shift || !profile) return;
    setClosing(true);
    try {
      const r = await ReportingService.closeShift({
        shiftId: shift.id,
        closedBy: profile.id,
        countedCash: parseFloat(countedCash) || 0,
      });
      setReport(r);
    } catch (err) {
      console.error(err);
      toast.error('Failed to close shift');
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-3 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Reports
      </Button>

      <div className="flex items-center gap-2 mb-5">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Z-Report / Closeout</h2>
      </div>

      <div className="max-w-md">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
        ) : !shift ? (
          /* No open shift */
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <EmptyState
                icon={<Lock className="h-10 w-10" />}
                title="No open shift"
                description="Open a cash shift to start tracking today's register."
              />
              <Button onClick={handleOpenShift} className="mt-2">
                Open Shift
              </Button>
            </CardContent>
          </Card>
        ) : report ? (
          /* Closeout complete */
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                Closeout Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <ReportLine label="Gross Sales" value={formatCurrency(report.gross_sales)} />
              <ReportLine label="Net Sales" value={formatCurrency(report.net_sales)} />
              <ReportLine label="Tax Collected" value={formatCurrency(report.tax_collected)} />
              <ReportLine label="Tips" value={formatCurrency(report.tips)} />
              <div className="border-t border-border my-2" />
              <ReportLine label="Opening Cash" value={formatCurrency(report.opening_cash)} />
              <ReportLine label="Cash Sales" value={formatCurrency(report.cash_sales)} />
              <ReportLine label="Paid In" value={formatCurrency(report.paid_in)} />
              <ReportLine label="Paid Out" value={`-${formatCurrency(report.paid_out)}`} />
              <div className="border-t border-border my-2" />
              <ReportLine label="Expected" value={formatCurrency(report.expected_cash)} bold />
              <ReportLine label="Counted" value={formatCurrency(report.counted_cash)} bold />
              <div
                className={`flex justify-between font-bold text-base pt-1 ${
                  report.over_short >= 0 ? 'text-success' : 'text-destructive'
                }`}
              >
                <span>Over/Short</span>
                <span>{report.over_short >= 0 ? '+' : ''}{formatCurrency(report.over_short)}</span>
              </div>
              {report.payment_breakdown && report.payment_breakdown.length > 0 && (
                <>
                  <div className="border-t border-border my-2" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Payments</p>
                  {report.payment_breakdown.map((p) => (
                    <ReportLine
                      key={p.tender_type}
                      label={`${p.tender_type} (${p.count})`}
                      value={formatCurrency(p.total)}
                    />
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Close shift form */
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Close Shift</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Shift opened at{' '}
                {new Date(shift.opened_at).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
              <div>
                <Label htmlFor="counted-cash" className="text-sm font-medium">
                  Counted Cash in Drawer
                </Label>
                <Input
                  id="counted-cash"
                  type="number"
                  step="0.01"
                  min="0"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <Button className="w-full" onClick={handleClose} disabled={closing}>
                {closing ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4 mr-1.5" />
                )}
                {closing ? 'Closing...' : 'Close Shift & Generate Z-Report'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/** Reusable line in the Z-Report */
function ReportLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''} capitalize`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
