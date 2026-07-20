'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { hrApi, companiesApi } from '@/lib/api/client';

type MeUser = {
  id: string;
  email: string;
  name: string;
  companyId?: string;
  membershipRole?: string;
};

export default function NewUserPage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [membershipRole, setMembershipRole] = useState<'ADMIN' | 'USER'>('USER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await hrApi.get<{ user?: MeUser }>('/me');
        const user = meRes?.user;
        if (!user?.companyId) {
          setError('No tienes empresa asignada');
          return;
        }
        const role = (user as MeUser).membershipRole;
        const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN';
        if (!cancelled) {
          setCompanyId(user.companyId);
          setCanCreate(isOwnerOrAdmin);
          if (!isOwnerOrAdmin) setError('Solo el propietario o un administrador pueden crear usuarios');
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !canCreate) return;
    setError(null);
    setLoading(true);
    try {
      const res = await companiesApi.createMember<{ success: boolean; error?: string; data?: unknown }>(
        companyId,
        { 
          email, 
          password, 
          firstName: firstName.trim() || null as any, 
          lastName: lastName.trim() || null as any, 
          membershipRole 
        }
      );
      if (res?.success) {
        router.push('/users');
        return;
      }
      setError((res as { error?: string })?.error || 'Error al crear usuario');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  if (error && !companyId) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
        <Link href="/users" className="text-blue-600 hover:underline">Volver a Usuarios</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agregar usuario</h1>
        <p className="text-gray-600">Crea un nuevo usuario de la empresa (misma lista en Hr y Pos).</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-md">
        {!canCreate && companyId ? (
          <p className="text-amber-800">Solo el propietario o un administrador pueden crear usuarios.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol en la empresa</label>
              <select
                value={membershipRole}
                onChange={(e) => setMembershipRole(e.target.value as 'ADMIN' | 'USER')}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="USER">Usuario</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creando…' : 'Crear usuario'}
              </button>
              <Link href="/users" className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">
                Cancelar
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

