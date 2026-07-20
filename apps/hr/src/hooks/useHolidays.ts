import { useState, useEffect } from 'react';
import { hrApi } from '@/lib/api/client';

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  isRecurring: boolean;
}

export function useHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await hrApi.get<{ holidays: Holiday[] }>('/holidays');
      setHolidays(data.holidays || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const isHoliday = (date: Date): Holiday | null => {
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Check for exact date match
    const exactMatch = holidays.find(holiday => {
      const holidayDate = new Date(holiday.date).toISOString().split('T')[0];
      return holidayDate === dateString;
    });
    
    if (exactMatch) return exactMatch;
    
    // Check for recurring holidays (same month and day)
    const recurringMatch = holidays.find(holiday => {
      if (!holiday.isRecurring) return false;
      
      const holidayDate = new Date(holiday.date);
      return holidayDate.getMonth() === date.getMonth() && 
             holidayDate.getDate() === date.getDate();
    });
    
    return recurringMatch || null;
  };

  const getHolidaysForMonth = (year: number, month: number): Holiday[] => {
    return holidays.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      
      if (holiday.isRecurring) {
        // For recurring holidays, check if month and day match
        return holidayDate.getMonth() === month;
      } else {
        // For non-recurring holidays, check exact year, month, and day
        return holidayDate.getFullYear() === year && 
               holidayDate.getMonth() === month;
      }
    });
  };

  return {
    holidays,
    loading,
    error,
    isHoliday,
    getHolidaysForMonth,
    refetch: fetchHolidays
  };
} 