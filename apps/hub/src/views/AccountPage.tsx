"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MeResponse } from "@hubilee/contracts";
import { useUser } from "@/hooks/useUser";
import { clearTokenCookie } from "@/lib/auth";
import { authApi, accountApi, shopflowNotificationsApi } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Switch,
  Label,
  Button,
  Input,
} from "@hubilee/ui";
import { User, Mail, Shield, LogOut, Bell } from "lucide-react";

const NOTIFICATION_TYPE_ROWS = [
  { key: "LOW_STOCK", label: "Stock bajo (PLAN-20)" },
  { key: "IMPORTANT_SALE", label: "Ventas importantes (PLAN-20)" },
  { key: "PENDING_TASK", label: "Tareas pendientes (PLAN-20)" },
  { key: "SYSTEM", label: "Sistema / reportes (PLAN-20)" },
  { key: "COLLAB", label: "Colaboración (PLAN-17)" },
  { key: "SECURITY", label: "Seguridad / MFA (PLAN-24)" },
] as const;

function channelValueForType(
  prefs: {
    inAppEnabled: boolean;
    pushEnabled: boolean;
    emailEnabled: boolean;
    preferences?: Record<string, { inApp?: boolean; push?: boolean; email?: boolean }> | null;
  },
  typeKey: string,
  channel: "inApp" | "push" | "email"
): boolean {
  const row = prefs.preferences?.[typeKey];
  const globals = {
    inApp: prefs.inAppEnabled,
    push: prefs.pushEnabled,
    email: prefs.emailEnabled,
  };
  if (row && row[channel] !== undefined) return !!row[channel];
  return globals[channel];
}

export function AccountPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useUser();

  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [mfaConfirmCode, setMfaConfirmCode] = useState("");
  const [mfaBackupShown, setMfaBackupShown] = useState<string[] | null>(null);
  const [mfaDisableCode, setMfaDisableCode] = useState("");
  const [mfaDisableUseBackup, setMfaDisableUseBackup] = useState(false);
  const [mfaRegenTotp, setMfaRegenTotp] = useState("");

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // proceed even if the API call fails
    }
    clearTokenCookie();
    await queryClient.clear();
    router.replace("/login");
  };

  const shopflowEnabled = user?.company?.modules?.shopflow === true;

  const prefsQuery = useQuery({
    queryKey: ["hubNotificationPrefs", user?.id],
    queryFn: async () => {
      const res = await shopflowNotificationsApi.getPreferences(user!.id);
      if (!res.success || !res.data) throw new Error(res.error || "prefs");
      return res.data;
    },
    enabled: !!user && shopflowEnabled,
  });

  const backupCodesQuery = useQuery({
    queryKey: ["mfaBackupCodes", user?.id],
    queryFn: async () => {
      const res = await accountApi.mfaBackupCodes();
      if (!res.success || !res.data?.codes) throw new Error(res.error || "backup codes");
      return res.data.codes;
    },
    enabled: !!user && user.twoFactorEnabled === true,
  });

  const updatePrefs = useMutation({
    mutationFn: async (patch: {
      inAppEnabled?: boolean;
      pushEnabled?: boolean;
      emailEnabled?: boolean;
      preferences?: Record<string, { inApp?: boolean; push?: boolean; email?: boolean }>;
    }) => {
      const res = await shopflowNotificationsApi.updatePreferences(user!.id, patch);
      if (!res.success || !res.data) throw new Error(res.error || "update");
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hubNotificationPrefs", user?.id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const meUser = user as MeResponse;

  const roleLabel =
    user.membershipRole || user.role || "—";

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Mi cuenta</h1>
        <p className="text-slate-600 mt-1">Información de tu perfil y sesión</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Datos de tu cuenta de usuario</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
              <User className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{user.name || "—"}</p>
              <Badge variant="outline">{roleLabel}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-700">
            <Mail className="h-4 w-4 text-slate-400 shrink-0" />
            <span>{user.email}</span>
          </div>

          {user.isSuperuser && (
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <Shield className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="text-amber-700 font-medium">Superadministrador del sistema</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-600" />
            Seguridad (MFA)
          </CardTitle>
          <CardDescription>
            Autenticación en dos pasos (TOTP) compatible con Google Authenticator y apps similares.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mfaError ? (
            <p className="text-sm text-red-600">{mfaError}</p>
          ) : null}

          {meUser.twoFactorEnabled ? (
            <>
              <p className="text-sm text-slate-700">
                Estado: <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">activo</Badge>
              </p>
              <div className="space-y-2">
                <Label>Códigos de respaldo (solo metadatos)</Label>
                <p className="text-xs text-slate-500">
                  Los códigos completos solo se muestran al activar o al regenerar. Aquí ves cuántos quedan sin
                  usar.
                </p>
                {backupCodesQuery.isLoading ? (
                  <p className="text-xs text-slate-500">Cargando…</p>
                ) : backupCodesQuery.data ? (
                  <ul className="text-sm text-slate-700 space-y-1">
                    {backupCodesQuery.data.map((row) => (
                      <li key={row.id}>
                        {row.usedAt ? (
                          <span className="text-slate-400 line-through">Usado</span>
                        ) : (
                          <span className="text-emerald-700">Disponible</span>
                        )}{" "}
                        <span className="text-xs text-slate-500">
                          (creado {new Date(row.createdAt).toLocaleDateString()})
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">Sin datos.</p>
                )}
              </div>
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <Label htmlFor="mfa-regen">Regenerar códigos de respaldo (requiere TOTP)</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="mfa-regen"
                    type="text"
                    inputMode="numeric"
                    placeholder="Código TOTP"
                    value={mfaRegenTotp}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setMfaRegenTotp(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={mfaBusy}
                    onClick={async () => {
                      setMfaError(null);
                      setMfaBusy(true);
                      try {
                        const res = await accountApi.mfaRegenerateBackup(mfaRegenTotp.trim());
                        if (!res.success || !res.data?.backupCodes) {
                          setMfaError(res.error || "No se pudieron regenerar los códigos.");
                          return;
                        }
                        setMfaBackupShown(res.data.backupCodes);
                        setMfaRegenTotp("");
                        await queryClient.invalidateQueries({ queryKey: ["user"] });
                        await queryClient.invalidateQueries({ queryKey: ["mfaBackupCodes"] });
                      } catch (e: unknown) {
                        setMfaError(e instanceof Error ? e.message : "Error");
                      } finally {
                        setMfaBusy(false);
                      }
                    }}
                  >
                    Regenerar
                  </Button>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <Label>Desactivar MFA</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    type="text"
                    inputMode={mfaDisableUseBackup ? "text" : "numeric"}
                    placeholder={mfaDisableUseBackup ? "Código de respaldo" : "Código TOTP"}
                    value={mfaDisableCode}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setMfaDisableCode(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm p-0 h-auto self-start"
                    onClick={() => {
                      setMfaDisableUseBackup(!mfaDisableUseBackup);
                      setMfaDisableCode("");
                    }}
                  >
                    {mfaDisableUseBackup ? "Usar TOTP" : "Usar código de respaldo"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={mfaBusy}
                    onClick={async () => {
                      setMfaError(null);
                      setMfaBusy(true);
                      try {
                        const res = await accountApi.mfaDisable(
                          mfaDisableUseBackup
                            ? { backupCode: mfaDisableCode.trim() }
                            : { totpCode: mfaDisableCode.trim() }
                        );
                        if (!res.success) {
                          setMfaError(res.error || "No se pudo desactivar MFA.");
                          return;
                        }
                        setMfaDisableCode("");
                        setMfaQr(null);
                        await queryClient.invalidateQueries({ queryKey: ["user"] });
                        await queryClient.invalidateQueries({ queryKey: ["mfaBackupCodes"] });
                      } catch (e: unknown) {
                        setMfaError(e instanceof Error ? e.message : "Error");
                      } finally {
                        setMfaBusy(false);
                      }
                    }}
                  >
                    Desactivar MFA
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {!mfaQr ? (
                <Button
                  type="button"
                  disabled={mfaBusy}
                  onClick={async () => {
                    setMfaError(null);
                    setMfaBusy(true);
                    try {
                      const res = await accountApi.mfaSetup();
                      if (!res.success || !res.data?.qrDataUrl) {
                        setMfaError(res.error || "No se pudo iniciar la configuración.");
                        return;
                      }
                      setMfaQr(res.data.qrDataUrl);
                      setMfaConfirmCode("");
                    } catch (e: unknown) {
                      setMfaError(e instanceof Error ? e.message : "Error");
                    } finally {
                      setMfaBusy(false);
                    }
                  }}
                >
                  Activar MFA
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Escanea el código con tu app. Luego introduce el código de 6 dígitos para confirmar.
                  </p>
                  <img src={mfaQr} alt="QR MFA" className="rounded-lg border border-slate-200 max-w-[220px]" />
                  <div className="space-y-2">
                    <Label htmlFor="mfa-confirm">Código TOTP</Label>
                    <Input
                      id="mfa-confirm"
                      inputMode="numeric"
                      value={mfaConfirmCode}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setMfaConfirmCode(e.target.value)}
                      placeholder="000000"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      disabled={mfaBusy}
                      onClick={async () => {
                        setMfaError(null);
                        setMfaBusy(true);
                        try {
                          const res = await accountApi.mfaConfirm(mfaConfirmCode.trim());
                          if (!res.success || !res.data?.backupCodes) {
                            setMfaError(res.error || "Código inválido.");
                            return;
                          }
                          setMfaBackupShown(res.data.backupCodes);
                          setMfaQr(null);
                          setMfaConfirmCode("");
                          await queryClient.invalidateQueries({ queryKey: ["user"] });
                          await queryClient.invalidateQueries({ queryKey: ["mfaBackupCodes"] });
                        } catch (e: unknown) {
                          setMfaError(e instanceof Error ? e.message : "Error");
                        } finally {
                          setMfaBusy(false);
                        }
                      }}
                    >
                      Confirmar y activar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setMfaQr(null);
                        setMfaConfirmCode("");
                        setMfaError(null);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {mfaBackupShown && mfaBackupShown.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">Guarda estos códigos de respaldo en un lugar seguro:</p>
              <ul className="mt-2 font-mono text-xs space-y-1">
                {mfaBackupShown.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <Button type="button" variant="secondary" className="mt-3" onClick={() => setMfaBackupShown(null)}>
                Entendido
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {shopflowEnabled ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-indigo-600" />
              Canales de notificación
            </CardTitle>
            <CardDescription>
              Controla cómo recibes alertas del módulo Shopflow (stock, reportes, etc.). Requiere Shopflow
              activo para tu empresa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {prefsQuery.isLoading ? (
              <p className="text-sm text-slate-500">Cargando preferencias…</p>
            ) : prefsQuery.isError ? (
              <p className="text-sm text-red-600">No se pudieron cargar las preferencias.</p>
            ) : prefsQuery.data ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="in-app-notif">En la aplicación</Label>
                    <p className="text-xs text-slate-500">Campana y lista en Hub / Shopflow</p>
                  </div>
                  <Switch
                    id="in-app-notif"
                    checked={prefsQuery.data.inAppEnabled}
                    disabled={updatePrefs.isPending}
                    onCheckedChange={(v: boolean) => updatePrefs.mutate({ inAppEnabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="push-notif">Push en el navegador</Label>
                    <p className="text-xs text-slate-500">Notificaciones del sistema (si están habilitadas)</p>
                  </div>
                  <Switch
                    id="push-notif"
                    checked={prefsQuery.data.pushEnabled}
                    disabled={updatePrefs.isPending}
                    onCheckedChange={(v: boolean) => updatePrefs.mutate({ pushEnabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="email-notif">Correo electrónico</Label>
                    <p className="text-xs text-slate-500">Resúmenes y alertas por email</p>
                  </div>
                  <Switch
                    id="email-notif"
                    checked={prefsQuery.data.emailEnabled}
                    disabled={updatePrefs.isPending}
                    onCheckedChange={(v: boolean) => updatePrefs.mutate({ emailEnabled: v })}
                  />
                </div>

                <div className="mt-6 border-t border-slate-200 pt-4 space-y-3">
                  <p className="text-sm font-medium text-slate-900">Preferencias por tipo</p>
                  <p className="text-xs text-slate-500">
                    Ajusta canales por categoría (PLAN-20 jobs, PLAN-17 colaboración, PLAN-24 MFA). Si no
                    fijas un canal para un tipo, se aplican los interruptores globales de arriba.
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                          <th className="py-2 px-3 font-medium">Tipo</th>
                          <th className="py-2 px-2 font-medium text-center">En app</th>
                          <th className="py-2 px-2 font-medium text-center">Push</th>
                          <th className="py-2 px-2 font-medium text-center">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {NOTIFICATION_TYPE_ROWS.map((row) => (
                          <tr key={row.key} className="border-b border-slate-100 last:border-0">
                            <td className="py-2 px-3 text-slate-800">{row.label}</td>
                            <td className="py-2 px-2 text-center">
                              <Switch
                                checked={channelValueForType(prefsQuery.data, row.key, "inApp")}
                                disabled={updatePrefs.isPending}
                                onCheckedChange={(v: boolean) =>
                                  updatePrefs.mutate({ preferences: { [row.key]: { inApp: v } } })
                                }
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <Switch
                                checked={channelValueForType(prefsQuery.data, row.key, "push")}
                                disabled={updatePrefs.isPending}
                                onCheckedChange={(v: boolean) =>
                                  updatePrefs.mutate({ preferences: { [row.key]: { push: v } } })
                                }
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <Switch
                                checked={channelValueForType(prefsQuery.data, row.key, "email")}
                                disabled={updatePrefs.isPending}
                                onCheckedChange={(v: boolean) =>
                                  updatePrefs.mutate({ preferences: { [row.key]: { email: v } } })
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Sesión</CardTitle>
          <CardDescription>Gestiona tu sesión activa</CardDescription>
        </CardHeader>
        <CardContent>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full justify-center bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
