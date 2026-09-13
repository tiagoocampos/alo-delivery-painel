import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatDateOnlyShort, formatPrice } from "@/lib/utils-api"
import type { DashboardRevenuePoint } from "@/types"

interface RevenueChartProps {
  data: DashboardRevenuePoint[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data.map((point) => ({
    label: formatDateOnlyShort(point.date),
    total: point.totalRevenue,
  }))

  return (
    <div className="h-64 w-full text-primary">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value: number) => formatPrice(value)}
          />
          <Tooltip
            cursor={{ fill: "var(--color-muted)" }}
            formatter={(value) => [formatPrice(Number(value ?? 0)), "Faturamento"]}
          />
          <Bar dataKey="total" fill="currentColor" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
