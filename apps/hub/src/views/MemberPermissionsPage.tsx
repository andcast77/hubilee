"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useMemberModules, useUpdateMemberModules } from "@/hooks/useMemberModules";
import { useMemberRoles, useUpdateMemberRoles } from "@/hooks/useMemberRoles";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import {
  AppBreadcrumb,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Switch,
  Label,
} from "@hubilee/ui";
import { ArrowLeft, Shield, Package, CheckCircle, XCircle } from "lucide-react";
import type { MemberModuleItem, MemberRoleItem } from "@/lib/api-client";

const MODULE_LABELS: Record<string, string> = {
  workify: "Workify (RRHH)",
  shopflow: "Shopflow (Ventas)",
  techservices: "Tech Services",
};

export function MemberPermissionsPage() {
  const router = useRouter();
  const params = useParams();
  const memberId =
    typeof params.memberId === "string"
      ? params.memberId
      : Array.isArray(params.memberId)
        ? params.memberId[0]
        : undefined;

  const { data: user } = useUser();
  const companyId = user?.companyId;

  const isAdmin =
    user?.membershipRole === "OWNER" || user?.membershipRole === "ADMIN";

  const { data: members } = useCompanyMembers(companyId);
  const member = members?.find((m) => m.id === memberId);

  const { data: modules, isLoading: modulesLoading } = useMemberModules(
    companyId,
    memberId
  );

  const { data: roles, isLoading: rolesLoading } = useMemberRoles(
    companyId,
    memberId
  );

  const updateModules = useUpdateMemberModules(companyId ?? "", memberId ?? "");
  const updateRoles = useUpdateMemberRoles(companyId ?? "", memberId ?? "");

  const [modulesSaving, setModulesSaving] = useState(false);
  const [rolesSaving, setRolesSaving] = useState(false);
  const [modulesError, setModulesError] = useState<string | null>(null);
  const [rolesError, setRolesError] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            Solo el propietario o administrador puede gestionar permisos.
          </p>
        </div>
      </div>
    );
  }

  async function handleModuleToggle(item: MemberModuleItem, enabled: boolean) {
    if (!modules) return;
    setModulesError(null);
    setModulesSaving(true);
    try {
      const updated = modules.map((m) => ({
        moduleId: m.moduleId,
        enabled: m.moduleId === item.moduleId ? enabled : m.enabled,
      }));
      await updateModules.mutateAsync(updated);
    } catch (e: unknown) {
      setModulesError(
        e instanceof Error ? e.message : "Error al actualizar módulos"
      );
    } finally {
      setModulesSaving(false);
    }
  }

  async function handleRoleToggle(item: MemberRoleItem, assigned: boolean) {
    if (!roles) return;
    setRolesError(null);
    setRolesSaving(true);
    try {
      const updated = roles
        .filter((r) => (r.roleId === item.roleId ? assigned : r.assigned))
        .map((r) => r.roleId);
      await updateRoles.mutateAsync(updated);
    } catch (e: unknown) {
      setRolesError(
        e instanceof Error ? e.message : "Error al actualizar roles"
      );
    } finally {
      setRolesSaving(false);
    }
  }

  const memberName = member?.name ?? "Miembro";
  const memberRole = member?.membershipRole ?? "";

  return (
    <div className="p-6 space-y-6">
      <AppBreadcrumb
        items={[
          { label: "Miembros", href: "/dashboard/members" },
          { label: memberName },
          { label: "Permisos" },
        ]}
        Link={Link}
      />
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/members")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Permisos de {memberName}
          </h1>
          <p className="text-slate-600 text-sm">
            Gestiona módulos y roles para este miembro
          </p>
        </div>
        {memberRole && (
          <Badge variant="outline" className="ml-auto">
            {memberRole}
          </Badge>
        )}
      </div>

      {/* Nivel 2: Módulos por usuario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-600" />
            Módulos habilitados (Nivel 2)
          </CardTitle>
          <CardDescription>
            Controla a qué módulos tiene acceso este miembro. Si no hay una
            configuración individual, se hereda la configuración de la empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {modulesLoading ? (
            <p className="text-slate-500 text-sm">Cargando módulos...</p>
          ) : !modules || modules.length === 0 ? (
            <p className="text-slate-500 text-sm">
              No hay módulos disponibles.
            </p>
          ) : (
            <div className="space-y-4">
              {modulesError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {modulesError}
                </div>
              )}
              {modules.map((mod) => (
                <div
                  key={mod.moduleId}
                  className="flex items-center justify-between py-2 border-b last:border-b-0"
                >
                  <div>
                    <Label className="font-medium cursor-default">
                      {MODULE_LABELS[mod.key] ?? mod.name}
                    </Label>
                    <p className="text-xs text-slate-500">{mod.key}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {mod.enabled ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-slate-300" />
                    )}
                    <Switch
                      checked={mod.enabled}
                      disabled={modulesSaving}
                      onCheckedChange={(checked: boolean) =>
                        handleModuleToggle(mod, checked)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nivel 3: Roles predefinidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            Roles y permisos (Nivel 3)
          </CardTitle>
          <CardDescription>
            Asigna roles predefinidos de la empresa. Cada rol otorga un
            conjunto específico de permisos sobre acciones del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rolesLoading ? (
            <p className="text-slate-500 text-sm">Cargando roles...</p>
          ) : !roles || roles.length === 0 ? (
            <p className="text-slate-500 text-sm">
              No hay roles definidos para esta empresa.
            </p>
          ) : (
            <div className="space-y-4">
              {rolesError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {rolesError}
                </div>
              )}
              {roles.map((role) => (
                <div
                  key={role.roleId}
                  className="flex items-center justify-between py-2 border-b last:border-b-0"
                >
                  <div>
                    <Label className="font-medium cursor-default">
                      {role.name}
                    </Label>
                    {role.description && (
                      <p className="text-xs text-slate-500">
                        {role.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {role.assigned ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-slate-300" />
                    )}
                    <Switch
                      checked={role.assigned}
                      disabled={rolesSaving}
                      onCheckedChange={(checked: boolean) =>
                        handleRoleToggle(role, checked)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
