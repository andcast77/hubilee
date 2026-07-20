'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@hubilee/ui';
import { hrApi } from '@/lib/api/client';
import { 
  Users, 
  Clock, 
  Shield, 
  Calendar,
  Settings,
  Building,
  FileText,
  Bell
} from 'lucide-react';

type MeUser = { membershipRole?: string; isSuperuser?: boolean };

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<MeUser | null>(null);
  useEffect(() => {
    hrApi.get<{ user?: MeUser }>('/me').then((r) => r?.user && setCurrentUser(r.user)).catch(() => {});
  }, []);

  const isOwnerOrSuperuser = currentUser?.membershipRole === 'OWNER' || currentUser?.isSuperuser === true;

  const settingsSections = [
    {
      title: 'Gestión de Personal',
      description: 'Administrar empleados, roles y permisos',
      icon: Users,
      items: [
        {
          name: 'Empleados',
          description: 'Gestionar información de empleados',
          href: '/employees',
          icon: Users
        },
        {
          name: 'Roles y Permisos',
          description: 'Configurar roles y permisos de usuario',
          href: '/roles',
          icon: Shield
        }
      ]
    },
    {
      title: 'Horarios y Turnos',
      description: 'Configurar horarios de trabajo y turnos',
      icon: Clock,
      items: [
        {
          name: 'Turnos de Trabajo',
          description: 'Crear y gestionar turnos laborales',
          href: '/work-shifts',
          icon: Clock
        },
        {
          name: 'Horarios por Empleado',
          description: 'Asignar horarios específicos a empleados',
          href: '/employee-schedules',
          icon: Calendar
        }
      ]
    },
    {
      title: 'Calendario Laboral',
      description: 'Configurar días no laborales y festivos',
      icon: Calendar,
      items: [
        {
          name: 'Días No Laborales',
          description: 'Gestionar feriados y días festivos del calendario',
          href: '/settings/holidays',
          icon: Calendar
        }
      ]
    },
    {
      title: 'Configuración General',
      description: 'Ajustes generales del sistema',
      icon: Settings,
      items: [
        {
          name: 'Información de la Empresa',
          description: 'Datos básicos de la empresa',
          href: '/settings/company',
          icon: Building
        },
        {
          name: 'Notificaciones',
          description: 'Configurar alertas y notificaciones',
          href: '/settings/notifications',
          icon: Bell
        },
        {
          name: 'Reportes',
          description: 'Configurar reportes y exportaciones',
          href: '/settings/reports',
          icon: FileText
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600">Administra la configuración de tu empresa</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-8">
        {settingsSections.map((section) => (
          <div key={section.title}>
            <div className="flex items-center gap-3 mb-4">
              <section.icon className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                <p className="text-sm text-gray-600">{section.description}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.items.map((item) => (
                <Link key={item.name} href={item.href}>
                  <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <item.icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">{item.name}</h3>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isOwnerOrSuperuser && (
        <div className="border border-amber-200 rounded-lg p-6 bg-amber-50/50">
          <h2 className="text-lg font-semibold text-amber-900 mb-2">Zona de peligro</h2>
          <p className="text-sm text-amber-800 mb-4">Solo el propietario de la empresa puede eliminar la empresa. Esta acción no se puede deshacer.</p>
          <button type="button" disabled className="px-4 py-2 rounded bg-gray-300 text-gray-500 cursor-not-allowed text-sm">
            Eliminar empresa (próximamente)
          </button>
        </div>
      )}
    </div>
  );
} 

