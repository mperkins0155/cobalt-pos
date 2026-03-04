import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/calculations';
import { ExpenseService } from '@/services/expenses';
import { toast } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import type { Expense, ExpenseCategory, ExpenseStatus } from '@/types/database';

export default function Expenses() {
  const navigate = useNavigate();
  const { organization, currentLocation, profile } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [category, setCategory] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const [expenseResult, categoryResult] = await Promise.all([
        ExpenseService.list({ orgId: organization.id, locationId: currentLocation?.id, limit: 200 }),
        ExpenseService.listCategories(organization.id),
      ]);
      setExpenses(expenseResult.expenses);
      setCategories(categoryResult);
      if (!categoryId && categoryResult.length > 0) {
        setCategoryId(categoryResult[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [organization?.id, currentLocation?.id]);

  const totalExpenses = useMemo(() => expenses.reduce((sum, expense) => sum + expense.total_amount, 0), [expenses]);

  const addExpense = async () => {
    if (!organization) return;
    const numericAmount = Number(amount);
    if ((!category.trim() && !categoryId) || Number.isNaN(numericAmount) || numericAmount <= 0) return;

    setSubmitting(true);
    try {
      let useCategoryId = categoryId || undefined;
      if (category.trim()) {
        const ensured = await ExpenseService.ensureCategory(organization.id, category.trim());
        useCategoryId = ensured.id;
        if (!categories.find(item => item.id === ensured.id)) {
          setCategories(prev => [...prev, ensured].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }
      const created = await ExpenseService.create({
        orgId: organization.id,
        locationId: currentLocation?.id,
        categoryId: useCategoryId,
        subtotalAmount: numericAmount,
        expenseDate: date || new Date().toISOString().slice(0, 10),
        notes: notes.trim() || undefined,
        createdBy: profile?.id,
      });
      setExpenses(prev => [created, ...prev]);
      toast.success('Expense recorded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to record expense');
    } finally {
      setSubmitting(false);
    }

    setCategory('');
    setAmount('');
    setDate('');
    setNotes('');
  };

  const setStatus = async (expense: Expense, status: ExpenseStatus) => {
    setUpdatingId(expense.id);
    try {
      const updated = await ExpenseService.setStatus(expense.id, status);
      setExpenses(prev => prev.map(row => (row.id === expense.id ? updated : row)));
      toast.success(`Expense marked ${status}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update expense');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate('/settings')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Expenses</h1>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" className="text-primary-foreground text-xs" onClick={() => navigate('/quotations')}>
            Quotations
          </Button>
        </div>
      </header>

      <div className="p-4 max-w-3xl mx-auto space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Record Expense</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" />
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select category (optional)</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
            <Button onClick={addExpense} disabled={submitting || !organization}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Logged Expenses ({formatCurrency(totalExpenses)})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            {!loading && expenses.length === 0 ? <p className="text-sm text-muted-foreground">No expenses found.</p> : null}
            {expenses.map((expense) => (
              <div key={expense.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{expense.category?.name || 'Uncategorized'}</p>
                    <p className="text-xs text-muted-foreground">{expense.expense_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(expense.total_amount)}</p>
                    <Badge variant={expense.status === 'paid' ? 'default' : 'secondary'}>{expense.status}</Badge>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {expense.status === 'draft' && (
                    <Button size="sm" variant="outline" disabled={updatingId === expense.id} onClick={() => setStatus(expense, 'submitted')}>Submit</Button>
                  )}
                  {expense.status === 'submitted' && (
                    <Button size="sm" variant="outline" disabled={updatingId === expense.id} onClick={() => setStatus(expense, 'approved')}>Approve</Button>
                  )}
                  {expense.status === 'approved' && (
                    <Button size="sm" disabled={updatingId === expense.id} onClick={() => setStatus(expense, 'paid')}>Mark Paid</Button>
                  )}
                  {expense.status !== 'paid' && expense.status !== 'void' && (
                    <Button size="sm" variant="outline" disabled={updatingId === expense.id} onClick={() => setStatus(expense, 'void')}>Void</Button>
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
