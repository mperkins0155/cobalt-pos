import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getDateRanges, formatDateRange, type DateRange } from '@/lib/dateRanges';

interface DateRangePickerProps {
  value: DateRange | null;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const ranges = getDateRanges();
  const [selectedLabel, setSelectedLabel] = useState(value?.label || 'Last 30 Days');

  const handleChange = (label: string) => {
    setSelectedLabel(label);
    const range = ranges.find((r) => r.label === label);
    if (range) onChange(range);
  };

  return (
    <Select value={selectedLabel} onValueChange={handleChange}>
      <SelectTrigger className={className}>
        <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
        <SelectValue>
          {value ? formatDateRange(value) : selectedLabel}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ranges.map((range) => (
          <SelectItem key={range.label} value={range.label}>
            <div className="flex flex-col">
              <span className="font-medium">{range.label}</span>
              <span className="text-xs text-muted-foreground">{formatDateRange(range)}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
