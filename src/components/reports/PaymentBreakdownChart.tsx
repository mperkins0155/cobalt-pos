import { Cell, Pie, PieChart } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

const paymentChartConfig = {
  cash: { label: 'Cash', color: 'hsl(var(--success))' },
  card: { label: 'Card', color: 'hsl(var(--primary))' },
  other: { label: 'Other', color: 'hsl(var(--warning))' },
} satisfies ChartConfig;

const pieColors = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--chart-4))'];

export interface PaymentBreakdownPoint {
  tender_type: string;
  total: number;
  count: number;
}

export default function PaymentBreakdownChart({
  data,
}: {
  data: PaymentBreakdownPoint[];
}) {
  return (
    <ChartContainer config={paymentChartConfig} className="h-[280px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={data}
          dataKey="total"
          nameKey="tender_type"
          innerRadius={70}
          outerRadius={100}
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell key={entry.tender_type} fill={pieColors[index % pieColors.length]} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="tender_type" />} />
      </PieChart>
    </ChartContainer>
  );
}
