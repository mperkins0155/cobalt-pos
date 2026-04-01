import * as React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ value, onChange, placeholder = 'Search…', className }, ref) => {
    return (
      <div role="search" className={cn('relative', className)}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="pl-9 h-11"
        />
      </div>
    );
  }
);
SearchBar.displayName = 'SearchBar';

export { SearchBar };
