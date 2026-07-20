'use client'

import { useState, useEffect, useCallback } from 'react'
import { hrApi } from '@/lib/api/client'

export interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  inactiveEmployees: number
  suspendedEmployees: number
  totalRoles: number
  totalDepartments: number
  todayScheduled: number
  todayActive: number
  todayPresent: number
  registeredHoursToday: number
  weeklyAttendanceRate: number
  isWorkDay: boolean
  workDayReason?: string
}

export interface WeeklyAttendancePoint {
  date: string
  scheduled: number
  present: number
}

export interface DepartmentAttendancePoint {
  departmentId: string | null
  departmentName: string
  scheduled: number
  present: number
}

interface DashboardData {
  stats: DashboardStats
  weeklyAttendance: WeeklyAttendancePoint[]
  departmentAttendance: DepartmentAttendancePoint[]
  departmentStats: { name: string; count: number }[]
  recentActivity: unknown[]
  company: { name: string }
}

function mapApiToDashboardStats(res: Record<string, unknown>): DashboardData {
  const todayActive = typeof res.todayActive === 'number' ? res.todayActive : 0
  return {
    stats: {
      totalEmployees: typeof res.totalEmployees === 'number' ? res.totalEmployees : 0,
      activeEmployees: todayActive,
      inactiveEmployees: 0,
      suspendedEmployees: 0,
      totalRoles: 0,
      totalDepartments: 0,
      todayScheduled: typeof res.todayScheduled === 'number' ? res.todayScheduled : 0,
      todayActive,
      todayPresent: typeof res.todayPresent === 'number' ? res.todayPresent : 0,
      registeredHoursToday: typeof res.registeredHoursToday === 'number' ? res.registeredHoursToday : 0,
      weeklyAttendanceRate: typeof res.weeklyAttendanceRate === 'number' ? res.weeklyAttendanceRate : 0,
      isWorkDay: res.isWorkDay !== false,
      workDayReason: typeof res.workDayReason === 'string' ? res.workDayReason : undefined,
    },
    weeklyAttendance: Array.isArray(res.weeklyAttendance) ? (res.weeklyAttendance as WeeklyAttendancePoint[]) : [],
    departmentAttendance: Array.isArray(res.departmentAttendance)
      ? (res.departmentAttendance as DepartmentAttendancePoint[])
      : [],
    departmentStats: [],
    recentActivity: [],
    company: { name: '' },
  }
}

export function useDashboardStats() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = (await hrApi.get<Record<string, unknown>>('/dashboard/stats')) as Record<string, unknown>
      setData(mapApiToDashboardStats(result))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    const h = () => {
      fetchStats()
    }
    window.addEventListener('hr-dashboard-refresh', h)
    return () => window.removeEventListener('hr-dashboard-refresh', h)
  }, [fetchStats])

  return {
    stats: data?.stats,
    weeklyAttendance: data?.weeklyAttendance ?? [],
    departmentAttendance: data?.departmentAttendance ?? [],
    departmentStats: data?.departmentStats || [],
    recentActivity: data?.recentActivity || [],
    company: data?.company,
    loading,
    error,
    refetch: fetchStats,
  }
}
