'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserWithRelations } from '@/types';
import { authApi, workifyApi } from '@/lib/api/client';
import { Sidebar as SidebarComponent, type NavGroup, type SidebarUser } from '@hubilee/ui';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Calendar,
  Clock,
  ClockIcon,
  Briefcase,
  Shield,
  Settings,
  Bell,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  children: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  const [user, setUser] = useState<UserWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    workifyApi
      .get<{ user?: UserWithRelations }>('/me')
      .then(data => {
        if (!data?.user) window.location.href = '/login';
        else setUser(data.user);
      })
      .catch(() => { window.location.href = '/login'; })
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.post('/logout');
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.cookie = 'token=; path=/; max-age=0';
    }
    window.location.href = '/login';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const userWithCompany = user as { company?: { workifyEnabled?: boolean }; isSuperuser?: boolean };
  if (
    userWithCompany.company?.workifyEnabled === false &&
    !userWithCompany.isSuperuser &&
    (user as { companyId?: string }).companyId
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-amber-50">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-amber-900 mb-2">Módulo no activo</h1>
          <p className="text-amber-800">
            El módulo Workify no está activado para esta empresa. Contacta al administrador para activarlo.
          </p>
        </div>
      </div>
    );
  }

  // Determinar si el usuario es admin o HR (case-insensitive, usando role.name)
  const userRoles = user?.roles?.map(r => r.role?.name?.toLowerCase?.()) || [];
  const isAdminOrHR = userRoles.includes('admin') || userRoles.includes('hr');

  const navGroups: NavGroup[] = [
    {
      title: 'Principal',
      items: [
        { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { title: 'Usuarios', href: '/users', icon: UserCircle },
        { title: 'Empleados', href: '/employees', icon: Users },
      ],
    },
    {
      title: 'Gestión de Tiempo',
      items: [
        { title: 'Asignaciones Especiales', href: '/employees/special-assignments', icon: Calendar },
        { title: 'Horas Trabajadas', href: '/time-entries', icon: Clock },
        { title: 'Turnos', href: '/work-shifts', icon: ClockIcon },
      ],
    },
    {
      title: 'Configuración',
      items: [
        ...(isAdminOrHR ? [{ title: 'Posiciones', href: '/positions', icon: Briefcase }] : []),
        { title: 'Roles', href: '/roles', icon: Shield },
        { title: 'Configuración', href: '/settings', icon: Settings },
      ],
    },
  ];

  const sidebarUser: SidebarUser | undefined = user
    ? {
        name: user.email,
        email: user.email,
        role: userRoles[0]?.toUpperCase(),
      }
    : undefined;

  const currentPage = navGroups
    .flatMap(g => g.items)
    .find(item => pathname === item.href || pathname.startsWith(item.href + '/'));

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_45%)] bg-gray-50 flex overflow-x-hidden">
      <SidebarComponent
        navigation={{ Link, usePathname }}
        navGroups={navGroups}
        user={sidebarUser}
        branding={{
          name: 'Workify',
          shortName: 'W',
        }}
        isLoadingUser={isLoading}
        onLogout={handleLogout}
        variant="dark"
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {currentPage?.title || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                <Bell className="h-5 w-5" />
              </button>
              <button 
                onClick={handleLogout}
                className="hidden sm:flex bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm transition-colors items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Sidebar; 

