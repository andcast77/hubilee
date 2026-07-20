import { useState, useEffect, useCallback } from 'react';
import { hrApi } from '@/lib/api/client';

interface TimeEntry {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  totalHours: number | null;
  breakTime: number | null;
  overtime: number | null;
  notes: string | null;
  source: 'MANUAL' | 'BIOMETRIC' | 'IMPORT';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CORRECTED';
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    position: string | null;
    department: string | null;
  };
}

interface TimeEntriesResponse {
  timeEntries: TimeEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

interface UseTimeEntriesOptions {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useTimeEntries(options: UseTimeEntriesOptions = {}) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [stats, setStats] = useState<TimeEntriesResponse['stats'] | null>(null);
  const [pagination, setPagination] = useState<TimeEntriesResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.employeeId) params.append('employeeId', options.employeeId);
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);
      if (options.status) params.append('status', options.status);
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());

      const data = await hrApi.get<{ timeEntries: TimeEntry[]; stats?: TimeEntriesResponse['stats']; pagination?: TimeEntriesResponse['pagination'] }>(`/time-entries?${params}`);
      setTimeEntries(data.timeEntries || []);
      setStats(data.stats ?? null);
      setPagination(data.pagination ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [options.employeeId, options.startDate, options.endDate, options.status, options.page, options.limit]);

  const createTimeEntry = async (timeEntryData: {
    employeeId: string;
    date: string;
    clockIn?: string;
    clockOut?: string;
    totalHours?: number;
    breakTime?: number;
    overtime?: number;
    notes?: string;
    source?: 'MANUAL' | 'BIOMETRIC' | 'IMPORT';
  }) => {
    try {
      const newTimeEntry = await hrApi.post<TimeEntry>('/time-entries', timeEntryData);
      setTimeEntries(prev => [newTimeEntry, ...prev]);
      return newTimeEntry;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Error desconocido');
    }
  };

  const updateTimeEntry = async (id: string, updates: {
    clockIn?: string;
    clockOut?: string;
    totalHours?: number;
    breakTime?: number;
    overtime?: number;
    notes?: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CORRECTED';
  }) => {
    try {
      const updatedTimeEntry = await hrApi.put<TimeEntry>(`/time-entries/${id}`, updates);
      setTimeEntries(prev => 
        prev.map(entry => 
          entry.id === id ? updatedTimeEntry : entry
        )
      );
      return updatedTimeEntry;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Error desconocido');
    }
  };

  const deleteTimeEntry = async (id: string) => {
    try {
      await hrApi.delete(`/time-entries/${id}`);
      setTimeEntries(prev => prev.filter(entry => entry.id !== id));
    } catch (err) {
      throw err instanceof Error ? err : new Error('Error desconocido');
    }
  };

  useEffect(() => {
    fetchTimeEntries();
  }, [options.employeeId, options.startDate, options.endDate, options.status, options.page, options.limit, fetchTimeEntries]);

  return {
    timeEntries,
    stats,
    pagination,
    loading,
    error,
    refetch: fetchTimeEntries,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
  };
} 