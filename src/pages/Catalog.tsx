import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Upload, Download } from 'lucide-react';
export default function Catalog() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate('/pos')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-lg font-bold">Catalog</h1>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="sm" className="text-primary-foreground text-xs"><Upload className="h-4 w-4 mr-1" />Import</Button>
          <Button variant="ghost" size="sm" className="text-primary-foreground text-xs"><Plus className="h-4 w-4 mr-1" />Add Item</Button>
        </div>
      </header>
      <div className="p-4"><p className="text-muted-foreground">Catalog management — items, categories, modifiers, import/export</p></div>
    </div>
  );
}
