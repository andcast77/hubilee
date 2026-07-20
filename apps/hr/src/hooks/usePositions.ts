import { useEffect, useState, useCallback } from 'react';
import { hrApi } from '@/lib/api/client';

export interface Position {
  id: string;
  name: string;
  description?: string;
  companyId?: string;
}

export function usePositions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await hrApi.get<{ positions: Position[] }>('/positions');
      setPositions(data.positions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  const getPositionById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await hrApi.get<{ position: Position }>(`/positions/${id}`);
      return data.position ?? null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return { positions, loading, error, refetch: fetchPositions, getPositionById };
} 