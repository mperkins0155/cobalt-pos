import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/calculations';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

const orderTypeChartConfig = {
  dine_in: { label: 'Dine In', color: 'hsl(var(--primary))' },
  takeout: { label: 'Take Away', color: 'hsl(var(--warning))' },
  delivery: { label: 'Delivery', color: 'hsl(var(--success))' },
  in_store: { label: 'In Store', color: 'hsl(var(--chart-4))' },
} satisfies ChartConfig;

const barColors = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--chart-4))'];

export interface OrderTypeRevenuePoint {
  type: string;
  total: number;
  count: number;
}

export default function OrderTypeRevenueChart({
  data,
}: {
  data: OrderTypeRevenuePoint[];
}) {
  return (
    <ChartContainer config={orderTypeChartConfig} className="h-[280px] w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="type" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickFormatter={(value) => `$${value}`} tickLine={false} axisLine={false} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => (
                <span className="font-medium text-foreground">{formatCurrency(Number(value) || 0)}</span>
              )}
            />
          }
        />
        <Bar dataKey="total" radius={[8, 8, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={entry.type} fill={barColors[index % barColors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
