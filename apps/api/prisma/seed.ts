import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { loadApiEnvFiles } from '../src/core/load-api-env.js'
import { resolveDbUrls } from '../scripts/prisma/db-target-env'
import { usePgAdapter } from '../src/db/adapter-selection'

loadApiEnvFiles(join(dirname(fileURLToPath(import.meta.url)), '..'))

// Resolve URL from DB_TARGET so commands never cross local/prod boundaries.
const { databaseUrl: connectionString } = resolveDbUrls()
process.env.DATABASE_URL = connectionString
const pgAdapter = usePgAdapter(connectionString)

const adapter = pgAdapter
  ? new PrismaPg({ connectionString })
  : new PrismaNeon({ connectionString })

// For Neon we require websocket support in Node.js.
if (!pgAdapter) {
  neonConfig.webSocketConstructor = ws
}

const prisma = new PrismaClient({ adapter, log: ['error', 'warn'] })

/** Ejecuta deleteMany e ignora si la tabla no existe (P2021). */
async function safeDeleteMany(
  label: string,
  fn: () => Promise<unknown>
): Promise<void> {
  try {
    await fn()
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === 'P2021') return // Table does not exist
    throw e
  }
}

async function main() {
  console.log('🌱 Iniciando seed...')

  // Limpiar todas las tablas en orden inverso de dependencias
  console.log('🧹 Limpiando datos existentes...')

  const clear = (label: string, fn: () => Promise<unknown>) => safeDeleteMany(label, fn)

  await clear('actionHistory', () => prisma.actionHistory.deleteMany())
  await clear('notificationPreference', () => prisma.notificationPreference.deleteMany())
  await clear('notification', () => prisma.notification.deleteMany())
  await clear('loyaltyPoint', () => prisma.loyaltyPoint.deleteMany())
  await clear('saleItem', () => prisma.saleItem.deleteMany())
  await clear('sale', () => prisma.sale.deleteMany())
  await clear('inventoryTransfer', () => prisma.inventoryTransfer.deleteMany())
  await clear('product', () => prisma.product.deleteMany())
  await clear('unit', () => prisma.unit.deleteMany())
  await clear('category', () => prisma.category.deleteMany())
  await clear('supplier', () => prisma.supplier.deleteMany())
  await clear('customer', () => prisma.customer.deleteMany())
  await clear('userPreferences', () => prisma.userPreferences.deleteMany())
  await clear('ticketConfig', () => prisma.ticketConfig.deleteMany())
  await clear('storeConfig', () => prisma.storeConfig.deleteMany())
  await clear('loyaltyConfig', () => prisma.loyaltyConfig.deleteMany())
  await clear('store', () => prisma.store.deleteMany())
  await clear('userRoleAssignment', () => prisma.userRoleAssignment.deleteMany())
  await clear('userPermission', () => prisma.userPermission.deleteMany())
  await clear('rolePermission', () => prisma.rolePermission.deleteMany())
  await clear('permission', () => prisma.permission.deleteMany())
  await clear('license', () => prisma.license.deleteMany())
  await clear('payroll', () => prisma.payroll.deleteMany())
  await clear('payrollRule', () => prisma.payrollRule.deleteMany())
  await clear('document', () => prisma.document.deleteMany())
  await clear('specialDayAssignment', () => prisma.specialDayAssignment.deleteMany())
  await clear('schedule', () => prisma.schedule.deleteMany())
  await clear('timeEntry', () => prisma.timeEntry.deleteMany())
  await clear('employee', () => prisma.employee.deleteMany())
  await clear('holiday', () => prisma.holiday.deleteMany())
  await clear('workShift', () => prisma.workShift.deleteMany())
  await clear('position', () => prisma.position.deleteMany())
  await clear('department', () => prisma.department.deleteMany())
  await clear('role', () => prisma.role.deleteMany())
  await clear('auditLog', () => prisma.auditLog.deleteMany())
  await clear('integrationLog', () => prisma.integrationLog.deleteMany())
  await clear('report', () => prisma.report.deleteMany())
  await clear('translation', () => prisma.translation.deleteMany())
  await clear('companyMemberModule', () => prisma.companyMemberModule.deleteMany())
  await clear('companyModule', () => prisma.companyModule.deleteMany())
  await clear('module', () => prisma.module.deleteMany())
  await clear('companyMember', () => prisma.companyMember.deleteMany())
  await clear('company', () => prisma.company.deleteMany())
  await clear('user', () => prisma.user.deleteMany())

  console.log('✅ Datos limpiados')

  // ========================================
  // CATÁLOGO DE MÓDULOS
  // ========================================
  console.log('🧩 Creando catálogo de módulos...')

  await prisma.module.createMany({
    data: [
      {
        key: 'hr',
        name: 'HR',
        description: 'Módulo de RRHH y gestión de personal',
      },
      {
        key: 'pos',
        name: 'POS',
        description: 'Módulo de ventas y tiendas',
      },
      {
        key: 'tech',
        name: 'Tech Services',
        description: 'Módulo de servicios técnicos',
      },
    ],
  })

  console.log('✅ Módulos creados: hr, pos, tech')

  // ========================================
  // UNIDADES (catálogo compartido)
  // ========================================
  console.log('📦 Creando unidades...')

  await prisma.unit.createMany({
    data: [
      { key: 'UNIT', name: 'Unit', symbol: 'u', isActive: true },
      { key: 'LITER', name: 'Liter', symbol: 'L', isActive: true },
      { key: 'KILOGRAM', name: 'Kilogram', symbol: 'kg', isActive: true },
      { key: 'METER', name: 'Meter', symbol: 'm', isActive: true },
      { key: 'GRAM', name: 'Gram', symbol: 'g', isActive: true },
      { key: 'MILLILITER', name: 'Milliliter', symbol: 'ml', isActive: true },
      { key: 'CENTIMETER', name: 'Centimeter', symbol: 'cm', isActive: true },
    ],
  })

  console.log('✅ Unidades creadas')

  // ========================================
  // PERMISOS BASE (RBAC)
  // ========================================
  console.log('🔐 Creando permisos base...')

  const basePermissions = [
    // Hub - empresa
    { name: 'hub.company.read', resource: 'hub.company', action: 'read', description: 'Ver datos de la empresa' },
    { name: 'hub.company.update', resource: 'hub.company', action: 'update', description: 'Editar datos de la empresa' },
    { name: 'hub.company.modules.read', resource: 'hub.company.modules', action: 'read', description: 'Ver módulos contratados por la empresa' },
    { name: 'hub.company.modules.manage', resource: 'hub.company.modules', action: 'manage', description: 'Activar o desactivar módulos para la empresa' },
    // Hub - miembros
    { name: 'hub.members.read', resource: 'hub.members', action: 'read', description: 'Ver usuarios de la empresa' },
    { name: 'hub.members.create', resource: 'hub.members', action: 'create', description: 'Crear usuarios en la empresa' },
    { name: 'hub.members.update', resource: 'hub.members', action: 'update', description: 'Editar usuarios de la empresa' },
    { name: 'hub.members.delete', resource: 'hub.members', action: 'delete', description: 'Eliminar o bloquear usuarios de la empresa' },
    // Hub - módulos por usuario
    { name: 'hub.user.modules.read', resource: 'hub.user.modules', action: 'read', description: 'Ver módulos activos de un usuario' },
    { name: 'hub.user.modules.manage', resource: 'hub.user.modules', action: 'manage', description: 'Activar o desactivar módulos por usuario' },
    // Hub - roles
    { name: 'hub.roles.read', resource: 'hub.roles', action: 'read', description: 'Ver roles de la empresa' },
    { name: 'hub.roles.manage', resource: 'hub.roles', action: 'manage', description: 'Crear, editar o eliminar roles de la empresa' },
    { name: 'hub.permissions.read', resource: 'hub.permissions', action: 'read', description: 'Listar permisos disponibles' },
    { name: 'hub.role.assign', resource: 'hub.roles', action: 'assign', description: 'Asignar o revocar roles a usuarios' },
    // HR
    { name: 'hr.access', resource: 'hr', action: 'access', description: 'Acceder al módulo HR' },
    { name: 'hr.users.read', resource: 'hr.users', action: 'read', description: 'Ver usuarios del módulo HR' },
    { name: 'hr.users.manage', resource: 'hr.users', action: 'manage', description: 'Crear o modificar usuarios desde HR' },
    { name: 'hr.employees.manage', resource: 'hr.employees', action: 'manage', description: 'Gestionar empleados en HR' },
    // POS
    { name: 'pos.access', resource: 'pos', action: 'access', description: 'Acceder al módulo POS' },
    { name: 'pos.users.read', resource: 'pos.users', action: 'read', description: 'Ver usuarios del módulo POS' },
    { name: 'pos.users.manage', resource: 'pos.users', action: 'manage', description: 'Crear o modificar usuarios desde POS' },
    { name: 'pos.sales.read', resource: 'pos.sales', action: 'read', description: 'Ver ventas en POS' },
    { name: 'pos.sales.create', resource: 'pos.sales', action: 'create', description: 'Crear nuevas ventas en POS' },
    { name: 'pos.sales.cancel', resource: 'pos.sales', action: 'cancel', description: 'Cancelar ventas en POS' },
    { name: 'pos.sales.settle', resource: 'pos.sales', action: 'settle', description: 'Liquidar ventas pendientes' },
    { name: 'pos.sales.refund', resource: 'pos.sales', action: 'refund', description: 'Reembolsar ventas completadas' },
    { name: 'pos.inventory.read', resource: 'pos.inventory', action: 'read', description: 'Ver inventario en POS' },
    { name: 'pos.inventory.write', resource: 'pos.inventory', action: 'write', description: 'Modificar inventario en POS' },
    { name: 'pos.cash-registers.read', resource: 'pos.cash-registers', action: 'read', description: 'Ver cajas registradoras' },
    { name: 'pos.cash-registers.create', resource: 'pos.cash-registers', action: 'create', description: 'Crear cajas registradoras' },
    { name: 'pos.cash-sessions.read', resource: 'pos.cash-sessions', action: 'read', description: 'Ver sesiones de caja' },
    { name: 'pos.cash-sessions.open', resource: 'pos.cash-sessions', action: 'open', description: 'Abrir sesiones de caja' },
    { name: 'pos.cash-sessions.close', resource: 'pos.cash-sessions', action: 'close', description: 'Cerrar sesiones de caja' },
    // Tech
    { name: 'tech.access', resource: 'tech', action: 'access', description: 'Acceder al módulo de servicios técnicos' },
    { name: 'tech.visits.close', resource: 'tech.visits', action: 'close', description: 'Cerrar órdenes de servicio técnico' },
  ] as const

  await prisma.permission.createMany({ data: [...basePermissions] })

  console.log('✅ Permisos base creados')
  console.log('🌱 Seed completado — solo datos de catálogo (sin empresas demo)')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error en seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })