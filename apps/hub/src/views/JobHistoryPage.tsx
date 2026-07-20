"use client";

import { useJobHistory } from "@/hooks/useJobHistory";
import type { JobRunRecord } from "@/lib/api-client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from "@hubilee/ui";
import { Timer } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  success: "bg-green-100 text-green-800 border-green-300",
  error: "bg-red-100 text-red-800 border-red-300",
  running: "bg-blue-100 text-blue-800 border-blue-300",
};

const STATUS_LABELS: Record<string, string> = {
  success: "Exitoso",
  error: "Error",
  running: "En curso",
};

const JOB_NAME_LABELS: Record<string, string> = {
  "inventory-alert": "Alerta de stock bajo",
  "scheduled-report-daily": "Reporte diario",
  "scheduled-report-weekly": "Reporte semanal",
  "invoice-reminder": "Recordatorio de órdenes",
  backup: "Backup automático",
  "techservices-reminder": "Recordatorio TechServices",
};

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString("es", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(record: JobRunRecord): string {
  if (!record.finishedAt) return "—";
  const ms = record.finishedAt - record.startedAt;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function JobHistoryPage() {
  const { data, isLoading, isError } = useJobHistory(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Timer className="h-6 w-6 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historial de Jobs</h1>
          <p className="text-slate-500 text-sm">
            Últimas ejecuciones de los procesos automáticos
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ejecuciones recientes</CardTitle>
          <CardDescription>
            Se muestra el historial de los últimos 7 días almacenado en caché.
            {data && ` Total de registros: ${data.total}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          )}

          {isError && (
            <div className="py-8 text-center text-slate-500">
              No se pudo cargar el historial. Puede que no haya datos disponibles o que el caché no esté configurado.
            </div>
          )}

          {data && data.items.length === 0 && !isLoading && (
            <div className="py-8 text-center text-slate-500">
              No hay ejecuciones registradas aún.
            </div>
          )}

          {data && data.items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {JOB_NAME_LABELS[record.jobName] ?? record.jobName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STATUS_STYLES[record.status] ?? ""}
                      >
                        {STATUS_LABELS[record.status] ?? record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {formatDate(record.startedAt)}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {formatDuration(record)}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm max-w-xs truncate">
                      {record.status === "error" && record.error
                        ? <span className="text-red-600">{record.error}</span>
                        : record.meta
                          ? Object.entries(record.meta)
                              .filter(([, v]) => v !== null && v !== undefined)
                              .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                              .join(", ")
                          : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
