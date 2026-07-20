'use client'

import { Card } from '@hubilee/ui'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type WeeklyPoint = { date: string; scheduled: number; present: number }
type DeptPoint = {
  departmentId: string | null
  departmentName: string
  scheduled: number
  present: number
}

interface AttendanceTrendChartProps {
  weeklyAttendance: WeeklyPoint[]
  departmentAttendance: DeptPoint[]
}

function tooltipPresentScheduled(value: unknown, name: unknown): [number, string] {
  const n = typeof value === 'number' ? value : Number(value) || 0
  const key = typeof name === 'string' ? name : String(name)
  return [n, key === 'present' ? 'Presente' : 'Programado']
}

export function AttendanceTrendChart({ weeklyAttendance, departmentAttendance }: AttendanceTrendChartProps) {
  const lineData = weeklyAttendance.map((r) => ({
    ...r,
    label: r.date.slice(5),
  }))

  const barData = departmentAttendance
    .filter((d) => d.scheduled > 0 || d.present > 0)
    .map((d) => ({
      name: d.departmentName.length > 18 ? `${d.departmentName.slice(0, 16)}…` : d.departmentName,
      present: d.present,
      scheduled: d.scheduled,
    }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Asistencia semanal (presente / programado)</h3>
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={tooltipPresentScheduled} />
              <Legend formatter={(v) => (v === 'present' ? 'Presente' : 'Programado')} />
              <Line type="monotone" dataKey="present" stroke="#16a34a" strokeWidth={2} dot={false} name="present" />
              <Line type="monotone" dataKey="scheduled" stroke="#2563eb" strokeWidth={2} dot={false} name="scheduled" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Por departamento (hoy)</h3>
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 32 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={48} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={tooltipPresentScheduled} />
              <Legend formatter={(v) => (v === 'present' ? 'Presente' : 'Programado')} />
              <Bar dataKey="present" fill="#16a34a" name="present" radius={[4, 4, 0, 0]} />
              <Bar dataKey="scheduled" fill="#93c5fd" name="scheduled" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
