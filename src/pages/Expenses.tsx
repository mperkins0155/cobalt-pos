import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ExpenseService } from '@/services/expenses';
import { formatCurrency } from '@/lib/calculations';
import { DataTable } from '@/components/DataTable';
import { SearchBar, FilterPills, StatCard } from '@/components/pos';
import { expenseColumns } from '@/columns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { DollarSign, Plus, Loader2, Wallet, TrendingDown } from 'lucide-react';
import type { Expense, ExpenseCategory, ExpenseStatus } from '@/types/database';

export default function Expenses() {
  const { organization, currentLocation, profile } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const [expResult, catResult] = await Promise.all([
        ExpenseService.list({ orgId: organization.id, locationId: currentLocation?.id, limit: 200 }),
        ExpenseService.listCategories(organization.id),
      ]);
      setExpenses(expResult.expenses);
      setCategories(catResult);
      if (!categoryId && catResult.length > 0) setCategoryId(catResult[0].id);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [organization?.id, currentLocation?.id]);

  const totalAmount = useMemo(() => expenses.reduce((s, e) => s + e.total_amount, 0), [expenses]);
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: expenses.length };
    for (const e of expenses) c[e.status] = (c[e.status] || 0) + 1;
    return c;
  }, [expenses]);

  const filtered = useMemo(() => {
    let r = expenses;
    if (statusFilter !== 'all') r = r.filter((e) => e.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((e) =>
        (e.supplier?.name || '').toLowerCase().includes(q) ||
        (e.category?.name || '').toLowerCase().includes(q) ||
        (e.expense_number || '').toLowerCase().includes(q)
      );
    }
    return r;
  }, [expenses, statusFilter, search]);

  const addExpense = async () => {
    if (!organization) return;
    const num = Number(amount);
    if (Number.isNaN(num) || num <= 0) { toast.error('Enter a valid amount'); return; }
    setSubmitting(true);
    try {
      let useCatId = categoryId || undefined;
      if (categoryName.trim()) {
        const ensured = await ExpenseService.ensureCategory(organization.id, categoryName.trim());
        useCatId = ensured.id;
        if (!categories.find((c) => c.id === ensured.id)) {
          setCategories((prev) => [...prev, ensured].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }
      const created = await ExpenseService.create({
        orgId: organization.id,
        locationId: currentLocation?.id,
        categoryId: useCatId,
        subtotalAmount: num,
        expenseDate: date || new Date().toISOString().slice(0, 10),
        notes: notes.trim() || undefined,
        createdBy: profile?.id,
      });
      setExpenses((prev) => [created, ...prev]);
      toast.success('Expense recorded');
      setCategoryName(''); setAmount(''); setDate(''); setNotes('');
      setShowForm(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  const filterTabs = [
    { key: 'all', label: 'All', count: statusCounts.all || 0 },
    { key: 'draft', label: 'Draft', count: statusCounts.draft || 0 },
    { key: 'submitted', label: 'Submitted', count: statusCounts.submitted || 0 },
    { key: 'approved', label: 'Approved', count: statusCounts.approved || 0 },
    { key: 'paid', label: 'Paid', count: statusCounts.paid || 0 },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Expenses</h2>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Record Expense
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 pos-desktop:grid-cols-3">
        <StatCard icon={<DollarSign className="h-4 w-4" />} label="Total" value={formatCurrency(totalAmount)} accent="primary" />
        <StatCard icon={<TrendingDown className="h-4 w-4" />} label="This Month" value={formatCurrency(
          expenses.filter((e) => new Date(e.expense_date).getMonth() === new Date().getMonth()).reduce((s, e) => s + e.total_amount, 0)
        )} accent="warning" />
      </div>

      {showForm && (
        <Card className="mb-4">
          <CardHeader className="pb-2"><CardTitle className="text-sm">New Expense</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 pos-tablet:grid-cols-3 pos-desktop:grid-cols-6">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Or new category" />
            <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
            <Button onClick={addExpense} disabled={submitting}>
              {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
              Add
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 space-y-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search vendor, category, or expense #" />
        <FilterPills items={filterTabs} active={statusFilter} onChange={setStatusFilter} />
      </div>

      <DataTable
        columns={expenseColumns}
        data={filtered}
        loading={loading}
        rowKey={(r) => r.id}
        emptyTitle="No expenses found"
        emptyDescription="Record an expense to get started."
        emptyIcon={<Wallet className="h-10 w-10" />}
      />
    </div>
  );
}
