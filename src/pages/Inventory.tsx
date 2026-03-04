import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
export default function Inventory() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate('/pos')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-lg font-bold">Inventory</h1>
      </header>
      <div className="p-4"><p className="text-muted-foreground">Inventory management — stock levels, adjustments, low-stock alerts</p></div>
    </div>
  );
}
