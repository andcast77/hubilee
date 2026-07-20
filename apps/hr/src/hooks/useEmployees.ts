'use client';

import { useState, useEffect } from 'react';
import { hrApi } from '@/lib/api/client';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  position: string | null;
  department: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  dateJoined: string | null;
  idNumber: string;
  user: {
    id: string;
    email: string;
  } | null;
}

interface EmployeesResponse {
  employees: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
}

interface UseEmployeesOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  department?: string;
}

export function useEmployees(options: UseEmployeesOptions = {}) {
  const [data, setData] = useState<EmployeesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { page = 1, limit = 10, search = '', status = '', department = '' } = options;

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(search && { search }),
          ...(status && { status }),
          ...(department && { department }),
        });

        const result = await hrApi.get<{ employees: Employee[]; total: number; page: number; limit: number }>(`/employees?${params}`);
        setData({
          employees: result.employees || [],
          pagination: {
            page: result.page ?? 1,
            limit: result.limit ?? 10,
            total: result.total ?? 0,
            totalPages: result.limit ? Math.ceil((result.total ?? 0) / result.limit) : 0,
          },
          stats: { total: result.total ?? 0, active: 0, inactive: 0 },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [page, limit, search, status, department]);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(status && { status }),
      ...(department && { department }),
    });
    try {
      const result = await hrApi.get<{ employees: Employee[]; total: number; page: number; limit: number }>(`/employees?${params}`);
      setData({
        employees: result.employees || [],
        pagination: {
          page: result.page ?? 1,
          limit: result.limit ?? 10,
          total: result.total ?? 0,
          totalPages: result.limit ? Math.ceil((result.total ?? 0) / result.limit) : 0,
        },
        stats: { total: result.total ?? 0, active: 0, inactive: 0 },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return {
    employees: data?.employees || [],
    pagination: data?.pagination,
    stats: data?.stats,
    loading,
    error,
    refetch,
  };
} 