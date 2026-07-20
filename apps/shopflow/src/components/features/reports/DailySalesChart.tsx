'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@hubilee/ui'
import { useDailySales } from '@/hooks/useReports'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/format'
import { format } from 'date-fns'

interface DailySalesChartProps {
  days?: number
  storeId?: string | null
}

export function DailySalesChart({ days = 30, storeId }: DailySalesChartProps) {
  const { data, isLoading } = useDailySales(days, storeId)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ventas Diarias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            Cargando...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ventas Diarias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No hay datos disponibles
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((item) => ({
    date: format(new Date(item.date), 'MMM dd'),
    ventas: item.sales,
    ingresos: item.revenue,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas Diarias ({days} días)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip
              formatter={(value, name) => {
                if (typeof value !== 'number') return value
                if (name === 'ingresos') {
                  return formatCurrency(value)
                }
                return value
              }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="ventas"
              stroke="#8884d8"
              name="Ventas"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="ingresos"
              stroke="#82ca9d"
              name="Ingresos"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

