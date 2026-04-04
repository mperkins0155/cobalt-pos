import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
} from 'date-fns';

export interface DateRange {
  label: string;
  from: Date;
  to: Date;
}

export function getDateRanges(): DateRange[] {
  const now = new Date();

  return [
    { label: 'Today', from: startOfDay(now), to: endOfDay(now) },
    { label: 'Yesterday', from: startOfDay(subDays(now, 1)), to: endOfDay(subDays(now, 1)) },
    { label: 'This Week', from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now) },
    {
      label: 'Last Week',
      from: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
      to: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
    },
    { label: 'This Month', from: startOfMonth(now), to: endOfDay(now) },
    {
      label: 'Last Month',
      from: startOfMonth(subMonths(now, 1)),
      to: endOfMonth(subMonths(now, 1)),
    },
    { label: 'Last 7 Days', from: startOfDay(subDays(now, 6)), to: endOfDay(now) },
    { label: 'Last 30 Days', from: startOfDay(subDays(now, 29)), to: endOfDay(now) },
  ];
}

/** Format a DateRange for display */
export function formatDateRange(range: DateRange): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(range.from)} – ${fmt(range.to)}`;
}
