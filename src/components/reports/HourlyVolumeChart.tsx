import { Bar, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/calculations';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

const hourlyChartConfig = {
  orders: { label: 'Orders', color: 'hsl(var(--primary))' },
  revenue: { label: 'Revenue', color: 'hsl(var(--success))' },
} satisfies ChartConfig;

export interface HourlyVolumePoint {
  hour: string;
  orders: number;
  revenue: number;
}

export default function HourlyVolumeChart({
  data,
}: {
  data: HourlyVolumePoint[];
}) {
  return (
    <ChartContainer config={hourlyChartConfig} className="h-[300px] w-full">
      <LineChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis yAxisId="left" allowDecimals={false} tickLine={false} axisLine={false} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `$${value}`} tickLine={false} axisLine={false} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) =>
                name === 'revenue'
                  ? <span className="font-medium text-foreground">{formatCurrency(Number(value) || 0)}</span>
                  : <span className="font-medium text-foreground">{value}</span>
              }
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar yAxisId="left" dataKey="orders" fill="var(--color-orders)" radius={[6, 6, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ChartContainer>
  );
}
