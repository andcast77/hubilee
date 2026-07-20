'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTabs } from '@/hooks/ui/useTabs';
import { useHolidays } from '@/hooks/useHolidays';
import { 
  CalendarDays, 
  AlertTriangle, 
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  UserCheck,
  UserX,
  Timer,
  Bell
} from 'lucide-react';

// Components
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@hubilee/ui';

// Types
interface TimeEntry {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut: string;
  totalHours: number;
  overtimeHours: number;
  notes?: string;
  status: 'normal' | 'overtime' | 'absence' | 'holiday' | 'leave' | 'late' | 'remote' | 'break';
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  isRecurring: boolean;
}

interface CalendarDay {
  date: Date;
  timeEntry?: TimeEntry;
  holiday?: Holiday | null;
  isCurrentMonth: boolean;
  isToday: boolean;
}

// Mock data - Replace with real API calls
const mockTimeEntries: TimeEntry[] = [
  {
    id: '1',
    employeeId: 'emp1',
    date: '2024-01-15',
    clockIn: '08:00',
    clockOut: '17:00',
    totalHours: 8,
    overtimeHours: 0,
    notes: 'Día normal',
    status: 'normal'
  },
  {
    id: '2',
    employeeId: 'emp1',
    date: '2024-01-16',
    clockIn: '08:30',
    clockOut: '19:00',
    totalHours: 9.5,
    overtimeHours: 1.5,
    notes: 'Proyecto urgente',
    status: 'overtime'
  },
  {
    id: '3',
    employeeId: 'emp1',
    date: '2024-01-17',
    clockIn: '',
    clockOut: '',
    totalHours: 0,
    overtimeHours: 0,
    notes: 'Ausencia justificada',
    status: 'absence'
  },
  {
    id: '4',
    employeeId: 'emp2',
    date: '2024-01-15',
    clockIn: '08:15',
    clockOut: '17:00',
    totalHours: 7.75,
    overtimeHours: 0,
    notes: 'Llegada tarde',
    status: 'late'
  },
  {
    id: '5',
    employeeId: 'emp3',
    date: '2024-01-15',
    clockIn: '09:00',
    clockOut: '18:00',
    totalHours: 8,
    overtimeHours: 0,
    notes: 'Trabajo remoto',
    status: 'remote'
  },
  {
    id: '6',
    employeeId: 'emp4',
    date: '2024-01-15',
    clockIn: '08:00',
    clockOut: '',
    totalHours: 4,
    overtimeHours: 0,
    notes: 'En descanso',
    status: 'break'
  }
];

// Simple date utilities
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
};

const formatMonth = (date: Date): string => {
  return date.toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'long' 
  });
};

const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

const isSameMonth = (date1: Date, date2: Date): boolean => {
  return date1.getMonth() === date2.getMonth() && 
         date1.getFullYear() === date2.getFullYear();
};

const addMonths = (date: Date, months: number): Date => {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
};

const subMonths = (date: Date, months: number): Date => {
  return addMonths(date, -months);
};

const getDaysInMonth = (date: Date): Date[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: Date[] = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }
  
  return days;
};

export default function TimeEntriesOverviewPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [timeEntries] = useState<TimeEntry[]>(mockTimeEntries);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { activeTab } = useTabs('calendar');
  const { isHoliday } = useHolidays();

  // Calculate today's specific stats
  const today = new Date();
  const todayString = formatDate(today);
  const todayEntries = timeEntries.filter(entry => entry.date === todayString);
  
  const todayStats = {
    employeesWorking: todayEntries.filter(entry => entry.status === 'normal' || entry.status === 'overtime').length,
    tardiness: todayEntries.filter(entry => entry.status === 'late').length,
    absences: todayEntries.filter(entry => entry.status === 'absence').length,
    justifiedAbsences: todayEntries.filter(entry => entry.status === 'absence' && entry.notes?.includes('justificada')).length,
    unjustifiedAbsences: todayEntries.filter(entry => entry.status === 'absence' && !entry.notes?.includes('justificada')).length,
    employeesOnBreak: todayEntries.filter(entry => entry.status === 'break').length,
    remoteWorkers: todayEntries.filter(entry => entry.status === 'remote').length,
    totalEmployees: todayEntries.length,
    scheduleCompliance: todayEntries.length > 0 ? Math.max(0, 100 - (todayEntries.filter(entry => entry.status === 'late').length * 15)) : 100
  };

  // Generate calendar days
  const calendarDays: CalendarDay[] = getDaysInMonth(currentDate).map(date => {
    const foundEntry = timeEntries.find(entry => entry.date === formatDate(date));
    return {
      date,
      ...(foundEntry && { timeEntry: foundEntry }),
      holiday: isHoliday(date),
      isCurrentMonth: isSameMonth(date, currentDate),
      isToday: isToday(date)
    };
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-100 text-green-800 border-green-200';
      case 'overtime': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'absence': return 'bg-red-100 text-red-800 border-red-200';
      case 'holiday': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'leave': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'late': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'remote': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'break': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal': return '✓';
      case 'overtime': return '⚡';
      case 'absence': return '✗';
      case 'holiday': return '🎉';
      case 'leave': return '🏖️';
      case 'late': return '⏰';
      case 'remote': return '🏠';
      case 'break': return '☕';
      default: return '•';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Horas Trabajadas</h1>
            <p className="text-gray-600 mt-1">Control y seguimiento de horas laborales</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/time-entries/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Entrada
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="employee">Empleado</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue>Seleccionar empleado</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los empleados</SelectItem>
                <SelectItem value="emp1">Juan Pérez</SelectItem>
                <SelectItem value="emp2">María García</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Daily Report KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Trabajando Hoy */}
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Trabajando Hoy</p>
                  <p className="text-2xl font-bold text-gray-900">{todayStats.employeesWorking}</p>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
              <div className="mt-2">
                <Badge variant="default">
                  <UserCheck className="w-3 h-3 mr-1" />
                  Activos
                </Badge>
              </div>
            </div>
          </Card>

          {/* Tardanzas Hoy */}
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tardanzas Hoy</p>
                  <p className="text-2xl font-bold text-gray-900">{todayStats.tardiness}</p>
                </div>
                <Timer className="w-8 h-8 text-orange-500" />
              </div>
              <div className="mt-2">
                <Badge variant="secondary">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Atrasos
                </Badge>
              </div>
            </div>
          </Card>

          {/* Ausencias Hoy */}
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ausencias Hoy</p>
                  <p className="text-2xl font-bold text-gray-900">{todayStats.absences}</p>
                </div>
                <UserX className="w-8 h-8 text-red-500" />
              </div>
              <div className="mt-2">
                <Badge variant="destructive">
                  <UserX className="w-3 h-3 mr-1" />
                  {todayStats.justifiedAbsences} justificadas
                </Badge>
              </div>
            </div>
          </Card>

          {/* En Descanso Hoy */}
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">En Descanso Hoy</p>
                  <p className="text-2xl font-bold text-gray-900">{todayStats.employeesOnBreak}</p>
                </div>
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-600 text-lg">☕</span>
                </div>
              </div>
              <div className="mt-2">
                <Badge variant="outline">
                  <span className="text-xs">Pausa</span>
                </Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Alerts Section */}
        <Card>
          <div className="p-4">
            <div className="flex items-center mb-4">
              <Bell className="w-5 h-5 text-orange-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Alertas del Día</h3>
            </div>
            <div className="space-y-2">
              {todayStats.tardiness > 0 && (
                <div className="flex items-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-orange-500 mr-2" />
                  <span className="text-sm text-orange-700">
                    {todayStats.tardiness} empleado(s) llegaron tarde hoy
                  </span>
                </div>
              )}
              {todayStats.unjustifiedAbsences > 0 && (
                <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                  <UserX className="w-4 h-4 text-red-500 mr-2" />
                  <span className="text-sm text-red-700">
                    {todayStats.unjustifiedAbsences} ausencia(s) sin justificar
                  </span>
                </div>
              )}
              {timeEntries.reduce((sum, entry) => sum + entry.overtimeHours, 0) > 10 && (
                <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Timer className="w-4 h-4 text-blue-500 mr-2" />
                  <span className="text-sm text-blue-700">
                    {timeEntries.reduce((sum, entry) => sum + entry.overtimeHours, 0)}h de horas extra acumuladas
                  </span>
                </div>
              )}
              {todayStats.tardiness === 0 && todayStats.unjustifiedAbsences === 0 && timeEntries.reduce((sum, entry) => sum + entry.overtimeHours, 0) <= 10 && (
                <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                  <UserCheck className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm text-green-700">
                    ¡Excelente! No hay alertas pendientes
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue={activeTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendar">Vista de Calendario</TabsTrigger>
            <TabsTrigger value="table">Tabla Diaria</TabsTrigger>
            <TabsTrigger value="charts">Gráficos Semanales</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <div className="p-6">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h2 className="text-xl font-semibold">{formatMonth(currentDate)}</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Day headers */}
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}

                  {/* Calendar days */}
                  {calendarDays.map((day, index) => (
                    <div
                      key={index}
                      className={`
                        p-2 min-h-[80px] border rounded-lg cursor-pointer transition-colors
                        ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                        ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                        ${day.timeEntry || day.holiday ? 'hover:bg-blue-50' : 'hover:bg-gray-50'}
                      `}
                      onClick={() => {
                        setSelectedDay(day);
                        setIsDetailModalOpen(true);
                      }}
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {day.date.getDate()}
                      </div>
                      {day.timeEntry && (
                        <div className="mt-1">
                          <div className="text-xs text-gray-600">
                            {day.timeEntry.totalHours}h
                          </div>
                          <Badge 
                            className={`text-xs ${getStatusColor(day.timeEntry.status)}`}
                            variant="outline"
                          >
                            {getStatusIcon(day.timeEntry.status)}
                          </Badge>
                        </div>
                      )}
                      {day.holiday && (
                        <div className="mt-1">
                          <Badge 
                            className="bg-purple-100 text-purple-800 border-purple-200 text-xs"
                            variant="outline"
                          >
                            🎉 {day.holiday.name}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="table" className="space-y-4">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Entradas de Tiempo Diarias</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Salida</TableHead>
                      <TableHead>Horas Totales</TableHead>
                      <TableHead>Horas Extra</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell>Juan Pérez</TableCell>
                        <TableCell>{entry.clockIn || '-'}</TableCell>
                        <TableCell>{entry.clockOut || '-'}</TableCell>
                        <TableCell>{entry.totalHours}h</TableCell>
                        <TableCell>{entry.overtimeHours}h</TableCell>
                        <TableCell>
                          <Badge 
                            className={getStatusColor(entry.status)}
                            variant="outline"
                          >
                            {getStatusIcon(entry.status)} {entry.status === 'normal' ? 'Normal' : 
                                                           entry.status === 'overtime' ? 'Extra' :
                                                           entry.status === 'absence' ? 'Ausencia' :
                                                           entry.status === 'holiday' ? 'Vacaciones' :
                                                           entry.status === 'leave' ? 'Permiso' :
                                                           entry.status === 'late' ? 'Tarde' :
                                                           entry.status === 'remote' ? 'Remoto' :
                                                           entry.status === 'break' ? 'Descanso' : entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{entry.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="charts" className="space-y-4">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Gráfico de Horas Semanales</h3>
                <div className="h-64 flex items-end justify-center space-x-2">
                  {timeEntries.slice(0, 7).map((entry, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div 
                        className="w-8 bg-blue-500 rounded-t"
                        style={{ height: `${(entry.totalHours / 10) * 200}px` }}
                      ></div>
                      <div className="text-xs text-gray-600 mt-1">
                        {entry.date.split('-')[2]}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center text-sm text-gray-600 mt-4">
                  Horas trabajadas por día (últimos 7 días)
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDay && formatDate(selectedDay.date)}
            </DialogTitle>
          </DialogHeader>
          {selectedDay?.timeEntry || selectedDay?.holiday ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Entrada</Label>
                  <p className="text-sm text-gray-900">{selectedDay.timeEntry?.clockIn || 'No registrado'}</p>
                </div>
                <div>
                  <Label>Salida</Label>
                  <p className="text-sm text-gray-900">{selectedDay.timeEntry?.clockOut || 'No registrado'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Horas Totales</Label>
                  <p className="text-sm text-gray-900">{selectedDay.timeEntry?.totalHours}h</p>
                </div>
                <div>
                  <Label>Horas Extra</Label>
                  <p className="text-sm text-gray-900">{selectedDay.timeEntry?.overtimeHours}h</p>
                </div>
              </div>
              <div>
                <Label>Estado</Label>
                <Badge 
                  className={`mt-1 ${getStatusColor(selectedDay.timeEntry?.status || '')}`}
                  variant="outline"
                >
                  {getStatusIcon(selectedDay.timeEntry?.status || '')} {selectedDay.timeEntry?.status === 'normal' ? 'Normal' : 
                                                                   selectedDay.timeEntry?.status === 'overtime' ? 'Extra' :
                                                                   selectedDay.timeEntry?.status === 'absence' ? 'Ausencia' :
                                                                   selectedDay.timeEntry?.status === 'holiday' ? 'Vacaciones' :
                                                                   selectedDay.timeEntry?.status === 'leave' ? 'Permiso' :
                                                                   selectedDay.timeEntry?.status === 'late' ? 'Tarde' :
                                                                   selectedDay.timeEntry?.status === 'remote' ? 'Remoto' :
                                                                   selectedDay.timeEntry?.status === 'break' ? 'Descanso' : selectedDay.timeEntry?.status}
                </Badge>
              </div>
              {selectedDay.timeEntry?.notes && (
                <div>
                  <Label>Notas</Label>
                  <p className="text-sm text-gray-900">{selectedDay.timeEntry.notes}</p>
                </div>
              )}
              {selectedDay.holiday && (
                <div>
                  <Label>Día No Laboral</Label>
                  <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🎉</span>
                      <span className="font-medium text-purple-900">{selectedDay.holiday.name}</span>
                    </div>
                    {selectedDay.holiday.description && (
                      <p className="text-sm text-purple-700">{selectedDay.holiday.description}</p>
                    )}
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                        {selectedDay.holiday.isRecurring ? 'Recurrente (Anual)' : 'Día Único'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay entrada de tiempo para este día</p>
              <Button 
                className="mt-4"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  router.push('/time-entries/new');
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Entrada
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 
