'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { workifyApi, companiesApi } from '@/lib/api/client';

type Member = {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  membershipRole: string;
  createdAt: string;
};

type MeUser = {
  id: string;
  email: string;
  name: string;
  companyId?: string;
  membershipRole?: string;
};

export default function UsersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await workifyApi.get<{ user?: MeUser }>('/me');
        const user = meRes?.user;
        if (!user?.companyId) {
          setError('No tienes empresa asignada');
          return;
        }
        if (cancelled) return;
        const res = await companiesApi.getMembers<{ success: boolean; data: Member[] }>(user.companyId);
        if (res?.success && res.data) setMembers(res.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'OWNER': return 'Propietario';
      case 'ADMIN': return 'Administrador';
      case 'USER': return 'Usuario';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-gray-600">Cargando usuarios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios de la empresa</h1>
          <p className="text-gray-600">Misma lista que en Pos. Owner y admin pueden crear usuarios.</p>
        </div>
        <Link
          href="/users/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          Agregar usuario
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {members.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay usuarios. <Link href="/users/new" className="text-blue-600 hover:underline">Agregar usuario</Link>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{m.name || m.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{m.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                      {getRoleLabel(m.membershipRole)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

