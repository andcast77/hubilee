'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useModuleAccess } from '@/hooks/usePermissions'
import { useUser } from '@/hooks/useUser'
import { useCompanies } from '@/hooks/useCompanies'
import { useStoreContextOptional } from '@/components/providers/StoreContext'
import { authApi } from '@/lib/api/client'
import { Module } from '@/lib/permissions'
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Wallet,
  Store,
  MapPin,
  Package,
  Users,
  Warehouse,
  Truck,
  UserCog,
  Settings,
  HardDrive,
  BarChart,
  Tags,
} from 'lucide-react'
import { Sidebar as SidebarComponent } from '@hubilee/ui'
import {
  InAppNotificationBell,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hubilee/ui'
import { useInAppNotifications } from '@/hooks/useInAppNotifications'
import { Link, useLocation } from '@tanstack/react-router'

/**
 * `@hubilee/ui`'s Sidebar already calls its injected `Link` with both
 * `to` and `href` set to the same value (interop for either react-router or
 * `next/link`-style components), so TanStack's `Link` can be passed through
 * directly with no adapter.
 */
function useRouterPathname(): string {
  return useLocation({ select: (location) => location.pathname }) || '/'
}

// Navigation groups - Only add routes that actually exist!
type SidebarProps = React.ComponentProps<typeof SidebarComponent>

const navGroups: SidebarProps['navGroups'] = [
  {
    title: 'Principal',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { title: 'Punto de Venta', href: '/pos', icon: ShoppingCart, module: Module.SALES },
      { title: 'Pedidos (Vendedor)', href: '/pos-vendedor', icon: ClipboardList, module: Module.SALES },
      { title: 'Caja', href: '/caja', icon: Wallet, module: Module.SALES },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { title: 'Productos', href: '/products', icon: Package, module: Module.PRODUCTS },
      { title: 'Categorías', href: '/categories', icon: Tags, module: Module.CATEGORIES },
      { title: 'Inventario', href: '/inventory', icon: Warehouse, module: Module.INVENTORY },
      { title: 'Reportes', href: '/reports', icon: BarChart, module: Module.REPORTS },
    ],
  },
  {
    title: 'Administración',
    items: [
      { title: 'Clientes', href: '/customers', icon: Users, module: Module.CUSTOMERS },
      { title: 'Proveedores', href: '/suppliers', icon: Truck, module: Module.SUPPLIERS },
      { title: 'Usuarios', href: '/admin/users', icon: UserCog, module: Module.USERS },
      { title: 'Configuración', href: '/admin/settings', icon: Settings, module: Module.STORE_CONFIG },
      // FIX D (pos-cash-session round 2, scope removal): loyalty is OUT of the POS MVP — the
      // nav entry is removed so it's not reachable from the sidebar. `/admin/loyalty` route
      // code and the backend loyalty feature are untouched (pre-existing, other screens use
      // them); this only unlinks the POS-facing entry point.
    ],
  },
  {
    title: 'Avanzado',
    items: [
      { title: 'Copias de Seguridad', href: '/admin/backup', icon: HardDrive, module: Module.STORE_CONFIG },
    ],
  },
]

const COMPANY_SELECT_PLACEHOLDER = '__none__'

/** Query keys that depend on company; invalidate on company change (not currentUser). */
const COMPANY_DATA_QUERY_KEYS = [
  ['products'], ['sales'], ['customers'], ['categories'], ['suppliers'],
  ['store-config'], ['ticket-config'], ['reports'], ['inventory'],
  ['companyMembers'], ['backups'], ['loyalty'], ['user-preferences'],
] as const

export function Sidebar() {
  const queryClient = useQueryClient()
  const autoSelectFirstDone = useRef(false)
  const isChangingCompany = useRef(false)
  const { data: user, isLoading: isLoadingUser } = useUser()
  const isSuperuser = user?.isSuperuser === true
  const companiesQuery = useCompanies(true)
  const allCompanies = companiesQuery.data ?? []
  const companies = isSuperuser ? allCompanies : allCompanies.filter((c) => c.posEnabled)
  const needCompanySelector = !!user && (isSuperuser || !user.companyId || companies.length > 1)
  const storeContext = useStoreContextOptional()

  // Auto-select first company when user has no companyId and no preferredCompanyId
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      autoSelectFirstDone.current ||
      !user ||
      user.companyId ||
      user.preferredCompanyId
    )
      return
    if (!companiesQuery.isSuccess || !companies.length) return
    autoSelectFirstDone.current = true
    const firstId = companies[0].id
    authApi
      .post<{
        success?: boolean
        data?: { companyId?: string; company?: { id: string; name: string; workifyEnabled: boolean; posEnabled: boolean } }
        error?: string
      }>('/context', { companyId: firstId })
      .then((res) => {
        if (res && typeof res === 'object' && res.success && res.data) {
          const newCompanyId = res.data.companyId ?? firstId
          const newCompany = res.data.company
          queryClient.setQueryData(['currentUser'], (prev: unknown) => {
            if (prev && typeof prev === 'object' && prev !== null) {
              return { ...prev, companyId: newCompanyId, company: newCompany ?? (prev as { company?: unknown }).company }
            }
            return prev
          })
        }
      })
      .catch(() => {
        autoSelectFirstDone.current = false
      })
  }, [user, companiesQuery.isSuccess, companies, queryClient])

  const handleCompanyChange = async (companyId: string) => {
    if (companyId === COMPANY_SELECT_PLACEHOLDER || companyId === user?.companyId) return
    if (isChangingCompany.current) return
    isChangingCompany.current = true
    try {
      const res = await authApi.post<{
        success?: boolean
        data?: { companyId?: string; company?: { id: string; name: string; workifyEnabled: boolean; posEnabled: boolean } }
        error?: string
      }>('/context', { companyId })
      if (res && typeof res === 'object' && res.success && res.data) {
        const newCompanyId = res.data.companyId ?? companyId
        const newCompany = res.data.company
        queryClient.setQueryData(['currentUser'], (prev: unknown) => {
          if (prev && typeof prev === 'object' && prev !== null) {
            return { ...prev, companyId: newCompanyId, company: newCompany ?? (prev as { company?: unknown }).company }
          }
          return prev
        })
        for (const key of COMPANY_DATA_QUERY_KEYS) {
          void queryClient.invalidateQueries({ queryKey: key })
        }
      }
    } catch {
      toast.error('No se pudo cambiar de empresa. Intenta de nuevo.')
    } finally {
      isChangingCompany.current = false
    }
  }

  const checkModuleAccess = (module: string) => {
    return useModuleAccess(module as Module)
  }

  const sidebarUser: SidebarProps['user'] = user
    ? {
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        company: user.company,
      }
    : undefined

  const companySelector = needCompanySelector ? (
    <Select
      value={user?.companyId ?? COMPANY_SELECT_PLACEHOLDER}
      onValueChange={handleCompanyChange}
      disabled={companiesQuery.isLoading}
    >
      <SelectTrigger
        className="w-full h-11 pl-3 pr-3 text-left border border-gray-700 bg-gray-800 hover:bg-gray-700 cursor-pointer gap-2 text-white"
        aria-label="Seleccionar empresa"
      >
        <Store className="h-5 w-5 shrink-0 text-white" />
        <span className="flex-1 truncate text-sm font-medium text-white">
          <SelectValue
            placeholder={
              companiesQuery.isLoading
                ? 'Cargando empresas…'
                : companies.length === 0
                  ? 'Sin empresas'
                  : 'Selecciona una empresa'
            }
          />
        </span>
      </SelectTrigger>
      <SelectContent sideOffset={4} className="max-h-[min(16rem,70vh)]">
        {companies.length > 0 ? (
          companies.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))
        ) : (
          <SelectItem value="__none__" disabled>
            Sin empresas
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  ) : (
    <div className="flex items-center gap-2 min-h-11 px-1">
      <Store className="h-5 w-5 shrink-0 text-white" />
      <h1 className="text-sm font-bold text-white truncate" title={user?.company?.name ?? undefined}>
        {user?.company?.name ?? '—'}
      </h1>
    </div>
  )

  const storeSelector = user?.companyId && storeContext && (() => {
    const { stores, isLoading, isError, currentStoreId, setCurrentStoreId, setReportStoreId } = storeContext
    const activeStores = stores.filter((s) => s.active)
    
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-300 px-1">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>Cargando locales...</span>
        </div>
      )
    }
    
    if (isError) {
      return (
        <div className="text-sm text-amber-500 px-1" title="Error al cargar locales. Revisa que la API esté en marcha y uses la misma base de datos.">
          <MapPin className="h-4 w-4 inline-block mr-1.5 align-middle" />
          Error al cargar locales
        </div>
      )
    }
    
    if (activeStores.length === 0) {
      return (
        <div className="text-sm text-gray-300 px-1" title="Ejecuta el seed en la carpeta database contra la misma base de datos que usa la API (misma DATABASE_URL).">
          <MapPin className="h-4 w-4 inline-block mr-1.5 align-middle" />
          Sin locales de venta
        </div>
      )
    }
    
    return (
      <Select
        value={currentStoreId ?? activeStores[0]?.id ?? ''}
        onValueChange={(id) => {
          setCurrentStoreId(id || null)
          setReportStoreId(id || null)
        }}
      >
        <SelectTrigger
          className="w-full h-10 pl-3 pr-3 text-left border border-gray-700 bg-gray-800 hover:bg-gray-700 cursor-pointer gap-2 text-white"
          aria-label="Seleccionar local de venta"
        >
          <MapPin className="h-4 w-4 shrink-0 text-white" />
          <span className="flex-1 truncate text-sm text-white">
            <SelectValue placeholder="Seleccionar local de venta" />
          </span>
        </SelectTrigger>
        <SelectContent sideOffset={4} className="max-h-[min(16rem,70vh)]">
          {activeStores.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name} ({s.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  })()

  const notif = useInAppNotifications(user?.id, user?.companyId)

  const showMobileContext =
    needCompanySelector || !!storeSelector || !!(user?.companyId && user?.company?.name)

  return (
    <>
      {showMobileContext ? (
        <div className="lg:hidden w-full shrink-0 border-b border-gray-700 bg-gray-900 px-3 py-2 space-y-2">
          {companySelector}
          {storeSelector}
        </div>
      ) : null}
      <SidebarComponent
        navigation={{ Link, usePathname: useRouterPathname }}
        navGroups={navGroups}
        user={sidebarUser}
        branding={{
          name: 'POS',
          shortName: 'SF',
        }}
        isLoadingUser={isLoadingUser}
        checkModuleAccess={checkModuleAccess}
        companySelector={companySelector}
        storeSelector={storeSelector}
        variant="dark"
        appendContent={
          user?.id ? (
            <div className="flex justify-center px-1">
              <InAppNotificationBell
                unreadCount={notif.unreadCount}
                items={notif.items}
                loading={notif.isLoading}
                onOpen={notif.refetch}
                onMarkRead={notif.markRead}
                onMarkAllRead={notif.markAllRead}
                align="start"
              />
            </div>
          ) : null
        }
      />
    </>
  )
}
