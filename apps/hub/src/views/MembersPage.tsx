"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
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
  Button,
  AppBreadcrumb,
} from "@hubilee/ui";
import { Mail, Calendar, AlertCircle, Users, Shield } from "lucide-react";

const roleColors = {
  OWNER: "bg-amber-100 text-amber-800 border-amber-300",
  ADMIN: "bg-purple-100 text-purple-800 border-purple-300",
  USER: "bg-slate-100 text-slate-800 border-slate-300",
};

export function MembersPage() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: members, isLoading } = useCompanyMembers(user?.companyId);

  const isAdmin = user?.membershipRole === "OWNER" || user?.membershipRole === "ADMIN";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Cargando miembros...</p>
        </div>
      </div>
    );
  }

  if (!members) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No se encontraron miembros.</p>
        </div>
      </div>
    );
  }

  const ownerCount = members.filter((m) => m.membershipRole === "OWNER").length;
  const adminCount = members.filter((m) => m.membershipRole === "ADMIN").length;
  const userCount = members.filter((m) => m.membershipRole === "USER").length;

  return (
    <div className="p-6 space-y-6">
      <AppBreadcrumb
        items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Miembros" }]}
        Link={Link}
      />
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Miembros de la Empresa</h1>
        <p className="text-slate-600 mt-1">Gestiona los usuarios de tu empresa</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total de Miembros</p>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {ownerCount} propietario{ownerCount !== 1 ? "s" : ""}
                </p>
              </div>
              <Users className="h-8 w-8 text-indigo-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Administradores</p>
                <p className="text-2xl font-bold">{adminCount}</p>
              </div>
              <Badge>Admin</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Usuarios Estándar</p>
                <p className="text-2xl font-bold">{userCount}</p>
              </div>
              <Badge variant="outline">Usuario</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 border border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <AlertCircle className="h-5 w-5" />
            Información importante
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800">
          <p>
            La gestión de miembros (agregar, editar, eliminar) se realiza desde los módulos específicos
            (Hr, Pos, Tech) para mantener la separación de responsabilidades.
          </p>
          <p className="mt-2">
            Accede a los módulos desde tu dashboard para administrar los usuarios según el contexto del módulo.
          </p>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Miembros</CardTitle>
          <CardDescription>Todos los usuarios de la empresa y sus roles</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No hay miembros en la empresa</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Agregado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          {member.membershipRole === "OWNER" && (
                            <Badge variant="outline" className="mt-1">
                              Propietario
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-slate-600">
                          <Mail className="h-4 w-4" />
                          {member.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            roleColors[member.membershipRole as keyof typeof roleColors]
                          }
                        >
                          {member.membershipRole === "OWNER"
                            ? "Propietario"
                            : member.membershipRole === "ADMIN"
                              ? "Administrador"
                              : "Usuario"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-slate-600 text-sm">
                          <Calendar className="h-4 w-4" />
                          {new Date(member.createdAt).toLocaleDateString("es-ES")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/members/${member.id}/permissions`)
                            }
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            Permisos
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Members Info */}
      {isAdmin && (
        <Card className="bg-indigo-50 border border-indigo-200">
          <CardHeader>
            <CardTitle className="text-indigo-900">Agregar Miembros</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-indigo-800">
            <p>
              Para agregar nuevos miembros a la empresa, utiliza los módulos (Hr, Pos)
              donde podrás definir sus roles y permisos específicos según el contexto del módulo.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
