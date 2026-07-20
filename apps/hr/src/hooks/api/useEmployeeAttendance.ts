'use client';

import { useState, useEffect, useCallback } from 'react';
import { hrApi } from '@/lib/api/client';

interface AttendanceDay {
  date: Date;
  dayOfWeek: number;
  dayName: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  clockIn: Date | null;
  clockOut: Date | null;
  status: 'not_scheduled' | 'present' | 'late' | 'absent';
  isLate: boolean;
  hasIncident: boolean;
  notes: string;
  isWorkDay: boolean;
}

interface MonthlyKPIs {
  totalDays: number;
  workDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  incidents: number;
  totalHours: number;
}

interface EmployeeAttendanceData {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    position: string | null;
    department: string | null;
  };
  month: string;
  attendance: AttendanceDay[];
  kpis: MonthlyKPIs;
}

interface UseEmployeeAttendanceReturn {
  data: EmployeeAttendanceData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEmployeeAttendance(
  employeeId: string, 
  month?: string
): UseEmployeeAttendanceReturn {
  const [data, setData] = useState<EmployeeAttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!employeeId) return;

    try {
      setLoading(true);
      setError(null);

      const monthParam = month || new Date().toISOString().slice(0, 7); // YYYY-MM
      const result = await hrApi.get<{ attendance: Array<Record<string, unknown>>; employee?: EmployeeAttendanceData['employee']; kpis?: unknown }>(`/employees/${employeeId}/attendance?month=${monthParam}`);

      const attendanceWithDates: AttendanceDay[] = (result.attendance ?? []).map((day: any) => ({
        ...day,
        date: day.date ? new Date(day.date as string) : new Date(),
        clockIn: day.clockIn ? new Date(day.clockIn as string) : null,
        clockOut: day.clockOut ? new Date(day.clockOut as string) : null,
        dayOfWeek: day.dayOfWeek ?? 0,
        dayName: day.dayName ?? '',
        scheduledStart: day.scheduledStart ?? null,
        scheduledEnd: day.scheduledEnd ?? null,
        status: day.status ?? 'not_scheduled',
        isLate: day.isLate ?? false,
        hasIncident: day.hasIncident ?? false,
        notes: day.notes ?? '',
        isWorkDay: day.isWorkDay ?? false,
      }));

      const defaultKpis: MonthlyKPIs = { totalDays: 0, workDays: 0, presentDays: 0, lateDays: 0, absentDays: 0, incidents: 0, totalHours: 0 };
      const kpisData: MonthlyKPIs = result.kpis as MonthlyKPIs || defaultKpis;

      setData({
        employee: result.employee ?? { id: employeeId, firstName: '', lastName: '', position: null, department: null },
        month: monthParam,
        attendance: attendanceWithDates,
        kpis: kpisData,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [employeeId, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
} 