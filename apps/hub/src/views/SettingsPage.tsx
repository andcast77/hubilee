"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@/hooks/useUser";
import { useCompany } from "@/hooks/useCompany";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AppBreadcrumb,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Switch,
  AlertDescription,
  Alert,
} from "@hubilee/ui";
import { updateCompanySchema, companyFiscalSchema, type UpdateCompanyInput, type CompanyFiscalInput } from "@/lib/validations/company";
import { companyApi, sessionsApi } from "@/lib/api-client";
import { DeleteCompanyDialog } from "@/components/features/DeleteCompanyDialog";
import { AlertTriangle, CheckCircle } from "lucide-react";

const SETTINGS_TABS = ["general", "modules", "fiscal", "preferences", "security"] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

const TAB_LABELS: Record<SettingsTab, string> = {
  general: "Información general",
  modules: "Módulos",
  fiscal: "Datos fiscales",
  preferences: "Preferencias",
  security: "Seguridad",
};

export function SettingsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: user } = useUser();
  const { data: company } = useCompany(user?.companyId);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isOwner = user?.membershipRole === "OWNER";

  // Form for general company info
  const generalForm = useForm<UpdateCompanyInput>({
    resolver: zodResolver(updateCompanySchema),
    defaultValues: {
      name: company?.name || "",
    },
  });

  // Form for fiscal data
  const fiscalForm = useForm<CompanyFiscalInput>({
    resolver: zodResolver(companyFiscalSchema),
    defaultValues: {
      taxId: company?.taxId || "",
      address: company?.address || "",
      phone: company?.phone || "",
    },
  });

  const handleGeneralSubmit = async (data: UpdateCompanyInput) => {
    if (!company) return;
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await companyApi.updateCompany(company.id, data);
      if (response.success) {
        setSuccessMessage("Información de la empresa actualizada");
        await queryClient.invalidateQueries({ queryKey: ["company", company.id] });
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        setErrorMessage(response.error || "Error al actualizar la empresa");
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Error al actualizar la empresa");
    }
  };

  const handleFiscalSubmit = async (data: CompanyFiscalInput) => {
    if (!company) return;
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await companyApi.updateCompany(company.id, data);
      if (response.success) {
        setSuccessMessage("Datos fiscales actualizados");
        await queryClient.invalidateQueries({ queryKey: ["company", company.id] });
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        setErrorMessage(response.error || "Error al actualizar los datos");
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Error al actualizar los datos");
    }
  };

  const sessionsQuery = useQuery({
    queryKey: ["auth-sessions"],
    queryFn: async () => {
      const res = await sessionsApi.list();
      if (!res.success || !res.data) {
        throw new Error(res.error || "No se pudieron cargar las sesiones");
      }
      return res.data;
    },
    enabled: searchParams.get("tab") === "security",
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => sessionsApi.revoke(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-sessions"] });
      setErrorMessage("");
      setSuccessMessage("Sesión cerrada");
      setTimeout(() => setSuccessMessage(""), 4000);
    },
    onError: (e: unknown) => {
      setSuccessMessage("");
      setErrorMessage(e instanceof Error ? e.message : "Error al cerrar la sesión");
    },
  });

  const revokeOthersMutation = useMutation({
    mutationFn: () => sessionsApi.revokeOthers(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-sessions"] });
      setErrorMessage("");
      setSuccessMessage("Se cerraron las demás sesiones");
      setTimeout(() => setSuccessMessage(""), 4000);
    },
    onError: (e: unknown) => {
      setSuccessMessage("");
      setErrorMessage(e instanceof Error ? e.message : "Error al cerrar sesiones");
    },
  });

  const handleModulesChange = async (moduleName: string, enabled: boolean) => {
    if (!company || !isOwner) return;
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const updateData: UpdateCompanyInput = {};
      if (moduleName === "workify") updateData.workifyEnabled = enabled;
      else if (moduleName === "pos") updateData.posEnabled = enabled;
      else if (moduleName === "techServices") updateData.technicalServicesEnabled = enabled;

      const response = await companyApi.updateCompany(company.id, updateData);
      if (response.success) {
        setSuccessMessage(`Módulo ${moduleName} ${enabled ? "activado" : "desactivado"}`);
        await queryClient.invalidateQueries({ queryKey: ["company", company.id] });
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        setErrorMessage(response.error || "Error al cambiar el módulo");
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Error al cambiar el módulo");
    }
  };

  if (!company || !user) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  const tabParam = searchParams.get("tab");
  const activeTab: SettingsTab = SETTINGS_TABS.includes(tabParam as SettingsTab)
    ? (tabParam as SettingsTab)
    : "general";

  const breadcrumbItems =
    activeTab === "general"
      ? [{ label: "Dashboard", href: "/dashboard" }, { label: "Configuración" }]
      : [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Configuración", href: "/dashboard/settings" },
          { label: TAB_LABELS[activeTab] },
        ];

  return (
    <div className="p-6 space-y-6">
      <AppBreadcrumb items={breadcrumbItems} Link={Link} />
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Configuración de Empresa</h1>
        <p className="text-slate-600 mt-1">Gestiona los ajustes y datos de tu empresa</p>
      </div>

      {successMessage && (
        <Alert className="bg-green-50 border border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert className="bg-red-50 border border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v: string) => {
          const next = v as SettingsTab;
          const params = new URLSearchParams(searchParams.toString());
          params.set("tab", next);
          router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="general">Información General</TabsTrigger>
          <TabsTrigger value="modules">Módulos</TabsTrigger>
          <TabsTrigger value="fiscal">Datos Fiscales</TabsTrigger>
          <TabsTrigger value="preferences">Preferencias</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
              <CardDescription>Datos básicos de la empresa</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={generalForm.handleSubmit(handleGeneralSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la Empresa</Label>
                  <Input
                    id="name"
                    placeholder="Mi Empresa"
                    {...generalForm.register("name")}
                  />
                  {generalForm.formState.errors.name && (
                    <p className="text-sm text-red-600">{generalForm.formState.errors.name.message}</p>
                  )}
                </div>

                <Button type="submit" disabled={generalForm.formState.isSubmitting}>
                  {generalForm.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle>Módulos de la Empresa</CardTitle>
              <CardDescription>Activa o desactiva los módulos disponibles</CardDescription>
            </CardHeader>
            <CardContent>
              {!isOwner && (
                <Alert className="mb-4 bg-amber-50 border border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    Solo el propietario puede cambiar la configuración de módulos
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                {/* Workify Module */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Workify</h4>
                    <p className="text-sm text-slate-600">Gestión de recursos humanos y nómina</p>
                  </div>
                  <Switch
                    checked={company.modules?.workify ?? company.workifyEnabled ?? false}
                    onCheckedChange={(checked: boolean) => handleModulesChange("workify", checked)}
                    disabled={!isOwner}
                  />
                </div>

                {/* Pos Module */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Pos</h4>
                    <p className="text-sm text-slate-600">Punto de venta e inventario</p>
                  </div>
                  <Switch
                    checked={company.modules?.pos ?? company.posEnabled ?? false}
                    onCheckedChange={(checked: boolean) => handleModulesChange("pos", checked)}
                    disabled={!isOwner}
                  />
                </div>

                {/* TechServices Module */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Tech Services</h4>
                    <p className="text-sm text-slate-600">Gestión de servicios técnicos</p>
                  </div>
                  <Switch
                    checked={company.modules?.techservices ?? company.technicalServicesEnabled ?? false}
                    onCheckedChange={(checked: boolean) => handleModulesChange("techServices", checked)}
                    disabled={!isOwner}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fiscal Tab */}
        <TabsContent value="fiscal">
          <Card>
            <CardHeader>
              <CardTitle>Datos Fiscales</CardTitle>
              <CardDescription>Información legal y de contacto de la empresa</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={fiscalForm.handleSubmit(handleFiscalSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="taxId">RFC / Tax ID</Label>
                  <Input
                    id="taxId"
                    placeholder="RFC o número de identificación fiscal"
                    {...fiscalForm.register("taxId")}
                  />
                  {fiscalForm.formState.errors.taxId && (
                    <p className="text-sm text-red-600">{fiscalForm.formState.errors.taxId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    placeholder="Calle 123, Ciudad, CP 12345"
                    {...fiscalForm.register("address")}
                  />
                  {fiscalForm.formState.errors.address && (
                    <p className="text-sm text-red-600">{fiscalForm.formState.errors.address.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    placeholder="+34 123 456 789"
                    {...fiscalForm.register("phone")}
                  />
                  {fiscalForm.formState.errors.phone && (
                    <p className="text-sm text-red-600">{fiscalForm.formState.errors.phone.message}</p>
                  )}
                </div>

                <Button type="submit" disabled={fiscalForm.formState.isSubmitting}>
                  {fiscalForm.formState.isSubmitting ? "Guardando..." : "Guardar datos fiscales"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias</CardTitle>
              <CardDescription>Configuraciones generales de la empresa</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="bg-blue-50 border border-blue-200 mb-4">
                <AlertDescription className="text-blue-800">
                  Las preferencias avanzadas estarán disponibles próximamente
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security — sesiones (PLAN-26) */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Sesiones activas</CardTitle>
              <CardDescription>
                Dispositivos con acceso a tu cuenta. Puedes revocar sesiones que no reconozcas; el acceso se renueva
                automáticamente mientras la sesión sea válida.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessionsQuery.isLoading && <p className="text-slate-600">Cargando sesiones…</p>}
              {sessionsQuery.isError && (
                <Alert className="bg-red-50 border border-red-200">
                  <AlertDescription className="text-red-800">
                    {sessionsQuery.error instanceof Error
                      ? sessionsQuery.error.message
                      : "Error al cargar sesiones"}
                  </AlertDescription>
                </Alert>
              )}
              {sessionsQuery.data && sessionsQuery.data.length === 0 && (
                <p className="text-slate-600">No hay sesiones activas registradas.</p>
              )}
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={revokeOthersMutation.isPending || (sessionsQuery.data?.length ?? 0) < 2}
                  onClick={() => revokeOthersMutation.mutate()}
                >
                  Cerrar todas las demás sesiones
                </Button>
              </div>
              <ul className="divide-y rounded-lg border border-slate-200 bg-white">
                {sessionsQuery.data?.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">
                        {s.isCurrent ? "Esta sesión" : "Otra sesión"}
                      </p>
                      <p className="text-sm text-slate-600 truncate" title={s.userAgent ?? ""}>
                        {s.deviceSummary || s.userAgent?.slice(0, 96) || "Sin información de dispositivo"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        IP: {s.ipAddress ?? "—"} · Inicio: {new Date(s.createdAt).toLocaleString()} · Última
                        actividad:{" "}
                        {s.lastSeenAt != null ? new Date(s.lastSeenAt).toLocaleString() : "—"}
                      </p>
                    </div>
                    {!s.isCurrent && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={revokeSessionMutation.isPending}
                        onClick={() => revokeSessionMutation.mutate(s.id)}
                      >
                        Cerrar
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Danger Zone */}
      {isOwner && (
        <div className="border-t pt-6">
          <Card className="border border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-600">Zona de Peligro</CardTitle>
              <CardDescription>Acciones irreversibles que afectarán permanentemente a la empresa</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-red-100/50 rounded-lg border border-red-200">
                  <h4 className="font-medium mb-2">Eliminar Empresa</h4>
                  <p className="text-sm text-red-900 mb-4">
                    Una vez eliminada, la empresa y todos sus datos (usuarios, productos, ventas, etc.) se perderán permanentemente.
                  </p>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    Eliminar Empresa
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <DeleteCompanyDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        companyId={company.id}
        companyName={company.name}
      />
    </div>
  );
}
