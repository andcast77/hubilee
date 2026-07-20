"use client";

import { useState } from "react";
import { useUser } from "@/hooks/useUser";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import type { AuditLogEntry, AuditLogFilters } from "@/lib/api-client";
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
  Button,
} from "@hubilee/ui";
import { Shield, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";

const ENTITY_TYPE_LABELS: Record<string, string> = {
  auth: "Autenticación",
  user: "Usuario",
  sale: "Venta",
  inventoryTransfer: "Transferencia",
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN_SUCCESS: "bg-green-100 text-green-800 border-green-300",
  LOGIN_FAILED: "bg-red-100 text-red-800 border-red-300",
  LOGOUT: "bg-slate-100 text-slate-700 border-slate-300",
  USER_CREATED: "bg-blue-100 text-blue-800 border-blue-300",
  USER_UPDATED: "bg-yellow-100 text-yellow-800 border-yellow-300",
  USER_DELETED: "bg-red-100 text-red-800 border-red-300",
  SALE_CREATED: "bg-green-100 text-green-800 border-green-300",
  SALE_CANCELLED: "bg-orange-100 text-orange-800 border-orange-300",
  SALE_REFUNDED: "bg-purple-100 text-purple-800 border-purple-300",
  INVENTORY_TRANSFER_CREATED: "bg-blue-100 text-blue-800 border-blue-300",
  INVENTORY_TRANSFER_COMPLETED: "bg-green-100 text-green-800 border-green-300",
  INVENTORY_TRANSFER_CANCELLED: "bg-orange-100 text-orange-800 border-orange-300",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function userDisplayName(entry: AuditLogEntry) {
  if (!entry.user) return entry.userId ?? "—";
  const name = [entry.user.firstName, entry.user.lastName].filter(Boolean).join(" ").trim();
  return name || entry.user.email;
}

function JsonDiff({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">{label}</p>
      <pre className="text-xs bg-slate-50 rounded p-2 overflow-auto max-h-40 border border-slate-200">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function AuditLogRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasDiff = entry.before != null || entry.after != null;

  return (
    <>
      <TableRow className="hover:bg-slate-50">
        <TableCell className="text-xs text-slate-500 whitespace-nowrap">{formatDate(entry.createdAt)}</TableCell>
        <TableCell>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ACTION_COLORS[entry.action] ?? "bg-slate-100 text-slate-700 border-slate-300"}`}>
            {entry.action}
          </span>
        </TableCell>
        <TableCell className="text-sm">{userDisplayName(entry)}</TableCell>
        <TableCell className="text-sm text-slate-600">{ENTITY_TYPE_LABELS[entry.entityType] ?? entry.entityType}</TableCell>
        <TableCell className="text-xs text-slate-500 font-mono">{entry.entityId ?? "—"}</TableCell>
        <TableCell className="text-xs text-slate-500">{entry.ipAddress ?? "—"}</TableCell>
        <TableCell>
          {hasDiff && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((e) => !e)}
              className="h-6 px-2 text-xs"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <span className="ml-1">Detalle</span>
            </Button>
          )}
        </TableCell>
      </TableRow>
      {expanded && hasDiff && (
        <TableRow>
          <TableCell colSpan={7} className="bg-slate-50 px-6 py-3">
            <JsonDiff label="Antes" value={entry.before} />
            <JsonDiff label="Después" value={entry.after} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

const ENTITY_TYPES = ["", "auth", "user", "sale", "inventoryTransfer"];

export function AuditLogPage() {
  const { data: user } = useUser();
  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1, pageSize: 20 });
  const { data, isLoading, error } = useAuditLogs(filters);

  const isAdmin = user?.membershipRole === "OWNER" || user?.membershipRole === "ADMIN";

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Acceso denegado. Solo owners y administradores pueden ver el registro de auditoría.</p>
        </div>
      </div>
    );
  }

  const pagination = data?.pagination;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Registro de Auditoría</h1>
          <p className="text-slate-500 text-sm">Historial de acciones críticas en tu empresa</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de entidad</label>
              <select
                className="w-full rounded-md border border-slate-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={filters.entityType ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value || undefined, page: 1 }))}
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t ? (ENTITY_TYPE_LABELS[t] ?? t) : "Todos"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Acción</label>
              <input
                type="text"
                placeholder="Ej: LOGIN_SUCCESS"
                className="w-full rounded-md border border-slate-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={filters.action ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value || undefined, page: 1 }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Desde</label>
              <input
                type="date"
                className="w-full rounded-md border border-slate-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={filters.dateFrom ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined, page: 1 }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Hasta</label>
              <input
                type="date"
                className="w-full rounded-md border border-slate-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={filters.dateTo ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined, page: 1 }))}
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({ page: 1, pageSize: 20 })}
            >
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Eventos</CardTitle>
              {pagination && (
                <CardDescription>
                  {pagination.total} evento{pagination.total !== 1 ? "s" : ""} encontrado{pagination.total !== 1 ? "s" : ""}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-3 text-slate-500 text-sm">Cargando registros...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">Error al cargar los registros de auditoría.</p>
              </div>
            </div>
          ) : !data?.items.length ? (
            <div className="p-6 text-center text-slate-500 text-sm">No se encontraron registros para los filtros seleccionados.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Acción</TableHead>
                    <TableHead className="text-xs">Usuario</TableHead>
                    <TableHead className="text-xs">Entidad</TableHead>
                    <TableHead className="text-xs">ID</TableHead>
                    <TableHead className="text-xs">IP</TableHead>
                    <TableHead className="text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((entry) => (
                    <AuditLogRow key={entry.id} entry={entry} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginación */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                Página {pagination.page} de {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
