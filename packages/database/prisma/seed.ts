import 'dotenv/config'
import { PrismaClient } from '../dist/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import bcrypt from 'bcryptjs'
import { resolveDbUrls } from '../scripts/db-target-env'
import { usePgAdapter } from '../src/adapter-selection'

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
  console.log('🌱 Iniciando seed de la base de datos unificada...')

  // Limpiar todas las tablas en orden correcto (respetando relaciones)
  console.log('🧹 Limpiando datos existentes...')

  const clear = (label: string, fn: () => Promise<unknown>) => safeDeleteMany(label, fn)

  // Limpiar en orden inverso de dependencias (ignorar tablas que no existan)
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

  // Workify
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
  // Baro (before company — FK to company)
  await clear('baroExpedienteActuante', () => prisma.baroExpedienteActuante.deleteMany())
  await clear('baroExpedienteTituloRelacion', () => prisma.baroExpedienteTituloRelacion.deleteMany())
  await clear('baroExpedienteOrdenante', () => prisma.baroExpedienteOrdenante.deleteMany())
  await clear('baroExpedienteLinderoPunto', () => prisma.baroExpedienteLinderoPunto.deleteMany())
  await clear('baroExpedienteLinderos', () => prisma.baroExpedienteLinderos.deleteMany())
  await clear('baroExpedienteColindanteNomenclatura', () => prisma.baroExpedienteColindanteNomenclatura.deleteMany())
  await clear('baroExpedienteColindante', () => prisma.baroExpedienteColindante.deleteMany())
  await clear('baroExpediente', () => prisma.baroExpediente.deleteMany())
  await clear('baroProfessionalRegistration', () => prisma.baroProfessionalRegistration.deleteMany())
  await clear('baroProfessional', () => prisma.baroProfessional.deleteMany())
  await clear('companyMember', () => prisma.companyMember.deleteMany())
  await clear('company', () => prisma.company.deleteMany())
  await clear('user', () => prisma.user.deleteMany())

  console.log('✅ Datos limpiados correctamente')

  // ========================================
  // CATÁLOGO DE MÓDULOS Y PERMISOS (RBAC)
  // ========================================

  console.log('🧩 Creando catálogo de módulos y permisos...')

  // 1. Módulos globales
  const moduleWorkify = await prisma.module.create({
    data: {
      key: 'workify',
      name: 'Workify',
      description: 'Módulo de RRHH y gestión de personal',
    },
  })

  const moduleShopflow = await prisma.module.create({
    data: {
      key: 'shopflow',
      name: 'Shopflow',
      description: 'Módulo de ventas y tiendas',
    },
  })

  const moduleTechservices = await prisma.module.create({
    data: {
      key: 'techservices',
      name: 'Tech Services',
      description: 'Módulo de servicios técnicos',
    },
  })

  const moduleBaro = await prisma.module.create({
    data: {
      key: 'baro',
      name: 'Baro',
      description: 'Módulo de agrimensura y expedientes',
    },
  })

  // 1.1 Unidades globales para productos (catálogo compartido)
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

  // 2. Permisos base (hub + módulos)
  const basePermissions = [
    // Hub - empresa
    {
      name: 'hub.company.read',
      resource: 'hub.company',
      action: 'read',
      description: 'Ver datos de la empresa',
    },
    {
      name: 'hub.company.update',
      resource: 'hub.company',
      action: 'update',
      description: 'Editar datos de la empresa',
    },
    {
      name: 'hub.company.modules.read',
      resource: 'hub.company.modules',
      action: 'read',
      description: 'Ver módulos contratados por la empresa',
    },
    {
      name: 'hub.company.modules.manage',
      resource: 'hub.company.modules',
      action: 'manage',
      description: 'Activar o desactivar módulos para la empresa',
    },
    // Hub - usuarios empresa
    {
      name: 'hub.members.read',
      resource: 'hub.members',
      action: 'read',
      description: 'Ver usuarios de la empresa',
    },
    {
      name: 'hub.members.create',
      resource: 'hub.members',
      action: 'create',
      description: 'Crear usuarios en la empresa',
    },
    {
      name: 'hub.members.update',
      resource: 'hub.members',
      action: 'update',
      description: 'Editar usuarios de la empresa',
    },
    {
      name: 'hub.members.delete',
      resource: 'hub.members',
      action: 'delete',
      description: 'Eliminar o bloquear usuarios de la empresa',
    },
    // Hub - módulos por usuario
    {
      name: 'hub.user.modules.read',
      resource: 'hub.user.modules',
      action: 'read',
      description: 'Ver módulos activos de un usuario',
    },
    {
      name: 'hub.user.modules.manage',
      resource: 'hub.user.modules',
      action: 'manage',
      description: 'Activar o desactivar módulos por usuario',
    },
    // Hub - administración de roles
    {
      name: 'hub.roles.read',
      resource: 'hub.roles',
      action: 'read',
      description: 'Ver roles de la empresa',
    },
    {
      name: 'hub.roles.manage',
      resource: 'hub.roles',
      action: 'manage',
      description: 'Crear, editar o eliminar roles de la empresa',
    },
    {
      name: 'hub.permissions.read',
      resource: 'hub.permissions',
      action: 'read',
      description: 'Listar permisos disponibles',
    },
    {
      name: 'hub.role.assign',
      resource: 'hub.roles',
      action: 'assign',
      description: 'Asignar o revocar roles a usuarios',
    },
    // Workify
    {
      name: 'workify.access',
      resource: 'workify',
      action: 'access',
      description: 'Acceder al módulo Workify',
    },
    {
      name: 'workify.users.read',
      resource: 'workify.users',
      action: 'read',
      description: 'Ver usuarios del módulo Workify',
    },
    {
      name: 'workify.users.manage',
      resource: 'workify.users',
      action: 'manage',
      description: 'Crear o modificar usuarios desde Workify',
    },
    // Shopflow
    {
      name: 'shopflow.access',
      resource: 'shopflow',
      action: 'access',
      description: 'Acceder al módulo Shopflow',
    },
    {
      name: 'shopflow.users.read',
      resource: 'shopflow.users',
      action: 'read',
      description: 'Ver usuarios del módulo Shopflow',
    },
    {
      name: 'shopflow.users.manage',
      resource: 'shopflow.users',
      action: 'manage',
      description: 'Crear o modificar usuarios desde Shopflow',
    },
    // Techservices
    {
      name: 'techservices.access',
      resource: 'techservices',
      action: 'access',
      description: 'Acceder al módulo de servicios técnicos',
    },
    {
      name: 'techservices.visits.close',
      resource: 'techservices.visits',
      action: 'close',
      description: 'Cerrar órdenes de servicio técnico',
    },
    // Baro
    {
      name: 'baro.access',
      resource: 'baro',
      action: 'access',
      description: 'Acceder al módulo Baro',
    },
    {
      name: 'baro.expedientes.manage',
      resource: 'baro.expedientes',
      action: 'manage',
      description: 'Gestionar expedientes en Baro',
    },
    // Shopflow — ventas granulares
    {
      name: 'shopflow.sales.read',
      resource: 'shopflow.sales',
      action: 'read',
      description: 'Ver ventas en Shopflow',
    },
    {
      name: 'shopflow.sales.create',
      resource: 'shopflow.sales',
      action: 'create',
      description: 'Crear nuevas ventas en Shopflow',
    },
    {
      name: 'shopflow.sales.cancel',
      resource: 'shopflow.sales',
      action: 'cancel',
      description: 'Cancelar ventas en Shopflow',
    },
    {
      name: 'shopflow.sales.settle',
      resource: 'shopflow.sales',
      action: 'settle',
      description: 'Liquidar (PENDING->COMPLETED) ventas en Shopflow, asignando sesión de caja y factura',
    },
    // Shopflow — inventario granular
    {
      name: 'shopflow.inventory.read',
      resource: 'shopflow.inventory',
      action: 'read',
      description: 'Ver inventario y transferencias en Shopflow',
    },
    {
      name: 'shopflow.inventory.write',
      resource: 'shopflow.inventory',
      action: 'write',
      description: 'Crear y modificar transferencias de inventario en Shopflow',
    },
    // Shopflow — caja (cash registers / cash sessions)
    {
      name: 'shopflow.cash-registers.read',
      resource: 'shopflow.cash-registers',
      action: 'read',
      description: 'Ver cajas registradoras en Shopflow',
    },
    {
      name: 'shopflow.cash-registers.create',
      resource: 'shopflow.cash-registers',
      action: 'create',
      description: 'Crear cajas registradoras en Shopflow',
    },
    {
      name: 'shopflow.cash-sessions.read',
      resource: 'shopflow.cash-sessions',
      action: 'read',
      description: 'Ver sesiones de caja y arqueos en Shopflow',
    },
    {
      name: 'shopflow.cash-sessions.open',
      resource: 'shopflow.cash-sessions',
      action: 'open',
      description: 'Abrir sesiones de caja en Shopflow',
    },
    {
      name: 'shopflow.cash-sessions.close',
      resource: 'shopflow.cash-sessions',
      action: 'close',
      description: 'Cerrar sesiones de caja (arqueo) en Shopflow',
    },
    // Workify — empleados
    {
      name: 'workify.employees.manage',
      resource: 'workify.employees',
      action: 'manage',
      description: 'Gestionar empleados en Workify',
    },
  ] as const

  await prisma.permission.createMany({
    data: [...basePermissions],
  })

  const permissionRecords = await prisma.permission.findMany({
    where: {
      name: {
        in: basePermissions.map((p) => p.name),
      },
    },
  })
  const permissionsByName = Object.fromEntries(
    permissionRecords.map((p) => [p.name, p])
  )

  // ========================================
  // SEEDS WORKIFY
  // ========================================

  console.log('🏢 Creando datos de Workify...')

  // 1. Crear empresa (contrata Workify y Shopflow)
  const company = await prisma.company.create({
    data: {
      name: 'Acme Inc.',
    },
  })
  console.log(`✅ Empresa creada: ${company.name} (ID: ${company.id})`)

  // Módulos contratados por Acme
  await prisma.companyModule.createMany({
    data: [
      { companyId: company.id, moduleId: moduleWorkify.id, enabled: true },
      { companyId: company.id, moduleId: moduleShopflow.id, enabled: true },
      { companyId: company.id, moduleId: moduleTechservices.id, enabled: true },
      { companyId: company.id, moduleId: moduleBaro.id, enabled: true },
    ],
  })

  // 2. Crear usuarios (necesarios para company members y Shopflow)
  const hashedPassword = await bcrypt.hash('password123', 10)
  const superuser = await prisma.user.create({
    data: {
      email: 'admin@multiflow.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Multiflow',
      phone: '+1234500000',
      role: 'SUPERADMIN',
      isActive: true,
      isSuperuser: true,
    },
  })
  const acmeGerente = await prisma.user.create({
    data: {
      email: 'gerente@acme.com',
      password: hashedPassword,
      firstName: 'Roberto',
      lastName: 'Acme',
      phone: '+1234567890',
      role: 'ADMIN',
      isActive: true,
    },
  })
  const acmeVentas = await prisma.user.create({
    data: {
      email: 'ventas@acme.com',
      password: hashedPassword,
      firstName: 'Laura',
      lastName: 'Acme',
      phone: '+1234567891',
      role: 'USER',
      isActive: true,
    },
  })
  console.log(`✅ Usuarios creados: ${superuser.email}, ${acmeGerente.email}, ${acmeVentas.email}`)
  await prisma.company.update({
    where: { id: company.id },
    data: { ownerUserId: acmeGerente.id },
  })
  const acmeOwnerMember = await prisma.companyMember.create({
    data: { userId: acmeGerente.id, companyId: company.id, membershipRole: 'OWNER' },
  })
  const acmeUserMember = await prisma.companyMember.create({
    data: { userId: acmeVentas.id, companyId: company.id, membershipRole: 'USER' },
  })
  console.log('✅ Owner y CompanyMembers Acme creados')

  // Módulos activos para cada miembro de Acme
  await prisma.companyMemberModule.createMany({
    data: [
      // Owner: todos los módulos activos de la empresa
      { companyMemberId: acmeOwnerMember.id, moduleId: moduleWorkify.id, enabled: true },
      { companyMemberId: acmeOwnerMember.id, moduleId: moduleShopflow.id, enabled: true },
      { companyMemberId: acmeOwnerMember.id, moduleId: moduleTechservices.id, enabled: true },
      { companyMemberId: acmeOwnerMember.id, moduleId: moduleBaro.id, enabled: true },
      // Usuario estándar: Workify + Shopflow por defecto
      { companyMemberId: acmeUserMember.id, moduleId: moduleWorkify.id, enabled: true },
      { companyMemberId: acmeUserMember.id, moduleId: moduleShopflow.id, enabled: true },
    ],
  })

  // Roles por empresa (RBAC) para Acme
  const ownerRole = await prisma.role.create({
    data: {
      name: 'Owner',
      description: 'Propietario de la empresa con control total',
      companyId: company.id,
    },
  })

  const adminRole = await prisma.role.create({
    data: {
      name: 'Admin',
      description: 'Administrador de empresa',
      companyId: company.id,
    },
  })

  const hrRole = await prisma.role.create({
    data: {
      name: 'HRManager',
      description: 'Responsable de RRHH',
      companyId: company.id,
    },
  })

  const managerRole = await prisma.role.create({
    data: {
      name: 'Manager',
      description: 'Gerente de área',
      companyId: company.id,
    },
  })

  const basicUserRole = await prisma.role.create({
    data: {
      name: 'BasicUser',
      description: 'Usuario estándar sin permisos de administración',
      companyId: company.id,
    },
  })

  // Shopflow functional roles
  const gerenteRole = await prisma.role.create({
    data: {
      name: 'Gerente',
      description: 'Gerente de tienda con acceso completo a ventas e inventario',
      companyId: company.id,
    },
  })

  const cajeroRole = await prisma.role.create({
    data: {
      name: 'Cajero',
      description: 'Cajero con acceso a creación y lectura de ventas, y a operar la caja (abrir/cerrar sesiones)',
      companyId: company.id,
    },
  })

  const vendedorRole = await prisma.role.create({
    data: {
      name: 'Vendedor',
      description: 'Vendedor móvil: crea ventas pendientes sin operar la caja',
      companyId: company.id,
    },
  })

  const supervisorRole = await prisma.role.create({
    data: {
      name: 'Supervisor',
      description: 'Supervisor con acceso a ventas e inventario en modo lectura y escritura',
      companyId: company.id,
    },
  })

  // Permisos por rol (simplificados según el modelo definido)
  const rolePermissionsData = [
    // Owner: prácticamente todos los permisos
    ...[
      'hub.company.read',
      'hub.company.update',
      'hub.company.modules.read',
      'hub.company.modules.manage',
      'hub.members.read',
      'hub.members.create',
      'hub.members.update',
      'hub.members.delete',
      'hub.user.modules.read',
      'hub.user.modules.manage',
      'hub.roles.read',
      'hub.roles.manage',
      'hub.permissions.read',
      'hub.role.assign',
      'workify.access',
      'workify.users.read',
      'workify.users.manage',
      'workify.employees.manage',
      'shopflow.access',
      'shopflow.users.read',
      'shopflow.users.manage',
      'shopflow.sales.read',
      'shopflow.sales.create',
      'shopflow.sales.cancel',
      'shopflow.inventory.read',
      'shopflow.inventory.write',
      'techservices.access',
      'techservices.visits.close',
      'baro.access',
      'baro.expedientes.manage',
    ].map((name) => ({
      roleId: ownerRole.id,
      permissionId: permissionsByName[name]!.id,
    })),
    // Admin: igual que Owner para este seed de ejemplo
    ...[
      'hub.company.read',
      'hub.company.update',
      'hub.company.modules.read',
      'hub.company.modules.manage',
      'hub.members.read',
      'hub.members.create',
      'hub.members.update',
      'hub.members.delete',
      'hub.user.modules.read',
      'hub.user.modules.manage',
      'hub.roles.read',
      'hub.permissions.read',
      'workify.access',
      'workify.users.read',
      'workify.users.manage',
      'workify.employees.manage',
      'shopflow.access',
      'shopflow.users.read',
      'shopflow.users.manage',
      'shopflow.sales.read',
      'shopflow.sales.create',
      'shopflow.sales.cancel',
      'shopflow.inventory.read',
      'shopflow.inventory.write',
      'techservices.access',
      'techservices.visits.close',
      'baro.access',
      'baro.expedientes.manage',
    ].map((name) => ({
      roleId: adminRole.id,
      permissionId: permissionsByName[name]!.id,
    })),
    // HR: foco en miembros y módulos por usuario
    ...[
      'hub.company.read',
      'hub.members.read',
      'hub.members.create',
      'hub.members.update',
      'hub.user.modules.read',
      'hub.user.modules.manage',
      'workify.access',
      'workify.users.read',
      'workify.users.manage',
      'workify.employees.manage',
    ].map((name) => ({
      roleId: hrRole.id,
      permissionId: permissionsByName[name]!.id,
    })),
    // Manager: acceso al módulo y lectura de miembros
    ...[
      'hub.members.read',
      'workify.access',
      'workify.users.read',
      'shopflow.access',
      'shopflow.users.read',
      'shopflow.sales.read',
      'shopflow.inventory.read',
    ].map((name) => ({
      roleId: managerRole.id,
      permissionId: permissionsByName[name]!.id,
    })),
    // BasicUser: solo acceso a módulos
    ...[
      'workify.access',
      'shopflow.access',
      'techservices.access',
      'baro.access',
    ].map((name) => ({
      roleId: basicUserRole.id,
      permissionId: permissionsByName[name]!.id,
    })),
    // Gerente Shopflow: acceso completo a ventas e inventario
    ...[
      'shopflow.access',
      'shopflow.sales.read',
      'shopflow.sales.create',
      'shopflow.sales.cancel',
      'shopflow.inventory.read',
      'shopflow.inventory.write',
    ].map((name) => ({
      roleId: gerenteRole.id,
      permissionId: permissionsByName[name]!.id,
    })),
    // Cajero: crear/leer ventas + liquidar pendientes + operar la caja (leer cajas, abrir/cerrar/leer sesiones)
    ...[
      'shopflow.access',
      'shopflow.sales.read',
      'shopflow.sales.create',
      'shopflow.sales.settle',
      'shopflow.cash-registers.read',
      'shopflow.cash-sessions.read',
      'shopflow.cash-sessions.open',
      'shopflow.cash-sessions.close',
    ].map((name) => ({
      roleId: cajeroRole.id,
      permissionId: permissionsByName[name]!.id,
    })),
    // Vendedor: solo crear ventas pendientes (moto vendedor), sin permisos de caja ni de liquidación
    ...[
      'shopflow.access',
      'shopflow.sales.create',
    ].map((name) => ({
      roleId: vendedorRole.id,
      permissionId: permissionsByName[name]!.id,
    })),
    // Supervisor: ventas e inventario (lectura + escritura inventario)
    ...[
      'shopflow.access',
      'shopflow.sales.read',
      'shopflow.inventory.read',
      'shopflow.inventory.write',
    ].map((name) => ({
      roleId: supervisorRole.id,
      permissionId: permissionsByName[name]!.id,
    })),
  ]

  await prisma.rolePermission.createMany({
    data: rolePermissionsData,
  })

  // Asignar roles iniciales a usuarios de Acme
  await prisma.userRoleAssignment.create({
    data: { userId: acmeGerente.id, roleId: ownerRole.id, companyId: company.id },
  })
  await prisma.userRoleAssignment.create({
    data: { userId: acmeGerente.id, roleId: gerenteRole.id, companyId: company.id },
  })
  await prisma.userRoleAssignment.create({
    data: { userId: acmeVentas.id, roleId: basicUserRole.id, companyId: company.id },
  })
  await prisma.userRoleAssignment.create({
    data: { userId: acmeVentas.id, roleId: cajeroRole.id, companyId: company.id },
  })
  console.log('✅ Roles y permisos de Acme creados y asignados (Owner/Gerente para acmeGerente, BasicUser/Cajero para acmeVentas)')

  // 3. Workify (opcional: si las tablas no existen se omite)
  let hrDepartment: { id: string; name: string } | null = null
  let itDepartment: { id: string; name: string } | null = null
  try {
    const hrDept = await prisma.department.create({
      data: {
        name: 'Recursos Humanos',
        description: 'Departamento de recursos humanos',
        companyId: company.id,
      },
    })
    const itDept = await prisma.department.create({
      data: {
        name: 'Tecnología',
        description: 'Departamento de tecnología',
        companyId: company.id,
      },
    })
    hrDepartment = hrDept
    itDepartment = itDept
    console.log(`✅ Departamentos creados: ${hrDept.name}, ${itDept.name}`)

    const managerPosition = await prisma.position.create({
      data: {
        name: 'Gerente',
        description: 'Posición gerencial',
        departmentId: hrDept.id,
      salaryType: 'MONTH',
      baseSalary: 5000.00,
      overtimeType: 'MULTIPLIER',
      overtimeMultiplier: 1.5,
    },
  })

  const developerPosition = await prisma.position.create({
    data: {
      name: 'Desarrollador',
      description: 'Desarrollador de software',
      departmentId: itDept.id,
      salaryType: 'MONTH',
      baseSalary: 3000.00,
      overtimeType: 'MULTIPLIER',
      overtimeMultiplier: 1.5,
    },
  })
    console.log(`✅ Posiciones creadas: ${managerPosition.name}, ${developerPosition.name}`)

    const adminRoleCreate = await prisma.role.create({
      data: {
        name: 'Administrador',
        description: 'Rol de administrador',
        companyId: company.id,
      },
    })
    const employeeRoleCreate = await prisma.role.create({
      data: {
        name: 'Empleado',
        description: 'Rol de empleado',
        companyId: company.id,
      },
    })
    console.log(`✅ Roles creados: ${adminRoleCreate.name}, ${employeeRoleCreate.name}`)

  // 5. Crear turnos de trabajo
  const morningShift = await prisma.workShift.create({
    data: {
      name: 'Turno Mañana',
      description: 'Horario estándar de oficina',
      startTime: '08:00',
      endTime: '16:00',
      breakStart: '12:00',
      breakEnd: '13:00',
      tolerance: 15,
      isActive: true,
      isNightShift: false,
      companyId: company.id,
    },
  })

  const afternoonShift = await prisma.workShift.create({
    data: {
      name: 'Turno Tarde',
      description: 'Horario de tarde',
      startTime: '14:00',
      endTime: '22:00',
      breakStart: '18:00',
      breakEnd: '19:00',
      tolerance: 15,
      isActive: true,
      isNightShift: false,
      companyId: company.id,
    },
  })
  console.log(`✅ Turnos creados: ${morningShift.name}, ${afternoonShift.name}`)

  // 6. Crear días festivos
  const newYearHoliday = await prisma.holiday.create({
    data: {
      name: 'Año Nuevo',
      date: new Date('2025-01-01'),
      isRecurring: true,
      companyId: company.id,
    },
  })
  console.log(`✅ Día festivo creado: ${newYearHoliday.name}`)

    // Asignar roles a usuarios Acme
    await prisma.userRoleAssignment.create({
      data: { userId: acmeGerente.id, roleId: adminRoleCreate.id, companyId: company.id },
    })
    await prisma.userRoleAssignment.create({
      data: { userId: acmeVentas.id, roleId: employeeRoleCreate.id, companyId: company.id },
    })
    console.log('✅ Roles asignados a usuarios Acme')

    const employee1 = await prisma.employee.create({
      data: {
        companyId: company.id,
        departmentId: hrDept.id,
        positionId: managerPosition.id,
      userId: acmeGerente.id,
      firstName: 'Roberto',
      lastName: 'Acme',
      idNumber: '12345678',
      dateJoined: new Date('2024-01-15'),
      status: 'ACTIVE',
      gender: 'MALE',
    },
  })

  const employee2 = await prisma.employee.create({
      data: {
        companyId: company.id,
        departmentId: itDept.id,
        positionId: developerPosition.id,
      userId: acmeVentas.id,
      firstName: 'Laura',
      lastName: 'Acme',
      idNumber: '87654321',
      dateJoined: new Date('2024-02-01'),
      status: 'ACTIVE',
      gender: 'FEMALE',
    },
  })
  console.log(`✅ Empleados Acme creados: ${employee1.firstName} ${employee1.lastName}, ${employee2.firstName} ${employee2.lastName}`)

  // 10. Crear horarios
  await prisma.schedule.create({
    data: {
      companyId: company.id,
      employeeId: employee1.id,
      workShiftId: morningShift.id,
      dayOfWeek: 1, // Lunes
      startDate: new Date('2025-01-01'),
    },
  })
    console.log('✅ Horarios creados')
  } catch {
    console.log('⚠️ Tablas Workify no encontradas, omitiendo seed Workify')
  }

  // ========================================
  // SEEDS SHOPFLOW
  // ========================================

  console.log('🛒 Creando datos de Shopflow...')

  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // 0. Crear dos locales (stores) por empresa - Acme
  const storeAcme1 = await prisma.store.create({
    data: {
      companyId: company.id,
      name: 'Acme Centro',
      code: 'ACME-CENTRO',
      address: '123 Main Street, Acme',
      phone: '+1234567894',
      email: 'centro@acme.com',
      active: true,
    },
  })
  const storeAcme2 = await prisma.store.create({
    data: {
      companyId: company.id,
      name: 'Acme Norte',
      code: 'ACME-NORTE',
      address: '456 North Ave, Acme',
      phone: '+1234567897',
      email: 'norte@acme.com',
      active: true,
    },
  })
  console.log(`✅ Locales Acme: ${storeAcme1.name} (${storeAcme1.code}), ${storeAcme2.name} (${storeAcme2.code})`)

  await prisma.userStore.create({
    data: { userId: acmeVentas.id, storeId: storeAcme1.id },
  })
  console.log('✅ Local asignado a usuario USER (Acme)')

  // 1. Crear categorías Acme (distintas para debug)
  const electronicsCategory = await prisma.category.create({
    data: {
      companyId: company.id,
      name: 'Electrónica Acme',
      description: 'Productos electrónicos Acme Inc.',
    },
  })

  const clothingCategory = await prisma.category.create({
    data: {
      companyId: company.id,
      name: 'Ropa Acme',
      description: 'Ropa y accesorios Acme',
    },
  })

  const officeCategory = await prisma.category.create({
    data: {
      companyId: company.id,
      name: 'Oficina Acme',
      description: 'Material de oficina Acme',
    },
  })
  console.log(`✅ Categorías Acme: ${electronicsCategory.name}, ${clothingCategory.name}, ${officeCategory.name}`)

  // 2. Crear proveedores Acme
  const supplier1 = await prisma.supplier.create({
    data: {
      companyId: company.id,
      name: 'Tech Supplies Acme',
      email: 'contact@techsupplies-acme.com',
      phone: '+1234567890',
      address: '123 Tech Street, SF',
      city: 'San Francisco',
      state: 'CA',
      taxId: 'ACME-TAX-001',
      active: true,
    },
  })

  const supplier2 = await prisma.supplier.create({
    data: {
      companyId: company.id,
      name: 'Fashion Wholesale Acme',
      email: 'contact@fashion-acme.com',
      phone: '+1234567891',
      address: '456 Fashion Ave',
      city: 'New York',
      state: 'NY',
      taxId: 'ACME-TAX-002',
      active: true,
    },
  })

  const supplier3 = await prisma.supplier.create({
    data: {
      companyId: company.id,
      name: 'Oficina Acme S.L.',
      email: 'pedidos@oficina-acme.com',
      phone: '+1234567895',
      address: '100 Office Park',
      city: 'Los Angeles',
      state: 'CA',
      taxId: 'ACME-TAX-003',
      active: true,
    },
  })
  console.log(`✅ Proveedores Acme: ${supplier1.name}, ${supplier2.name}, ${supplier3.name}`)

  // 3. Crear productos Acme (inventario distinto)
  const product1 = await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Laptop Dell XPS 15 [Acme]',
      description: 'Laptop de alta gama - Acme',
      sku: 'ACME-LAP-001',
      barcode: '1234567890123',
      price: 1299.99,
      cost: 900.00,
      categoryId: electronicsCategory.id,
      supplierId: supplier1.id,
      active: true,
    },
  })
  await prisma.storeInventory.upsert({
    where: { storeId_productId: { storeId: storeAcme1.id, productId: product1.id } },
    update: { quantity: 8, minStock: 5, maxStock: 50 },
    create: {
      companyId: company.id,
      storeId: storeAcme1.id,
      productId: product1.id,
      quantity: 8,
      minStock: 5,
      maxStock: 50,
    },
  })

  const product2 = await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Camiseta Básica [Acme]',
      description: 'Camiseta algodón 100% - Acme',
      sku: 'ACME-TSH-001',
      barcode: '9876543210987',
      price: 19.99,
      cost: 10.00,
      categoryId: clothingCategory.id,
      supplierId: supplier2.id,
      active: true,
    },
  })
  await prisma.storeInventory.upsert({
    where: { storeId_productId: { storeId: storeAcme1.id, productId: product2.id } },
    update: { quantity: 45, minStock: 20, maxStock: 200 },
    create: {
      companyId: company.id,
      storeId: storeAcme1.id,
      productId: product2.id,
      quantity: 45,
      minStock: 20,
      maxStock: 200,
    },
  })

  const product3 = await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Monitor 24" [Acme]',
      description: 'Monitor Full HD - Acme',
      sku: 'ACME-MON-001',
      barcode: '1111222233334',
      price: 199.99,
      cost: 120.00,
      categoryId: electronicsCategory.id,
      supplierId: supplier1.id,
      active: true,
    },
  })
  await prisma.storeInventory.upsert({
    where: { storeId_productId: { storeId: storeAcme2.id, productId: product3.id } },
    update: { quantity: 15, minStock: 5, maxStock: 40 },
    create: {
      companyId: company.id,
      storeId: storeAcme2.id,
      productId: product3.id,
      quantity: 15,
      minStock: 5,
      maxStock: 40,
    },
  })

  const product4 = await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Cuaderno A4 [Acme]',
      description: 'Cuaderno 100 hojas - Acme',
      sku: 'ACME-CUA-001',
      barcode: '2222333344445',
      price: 4.99,
      cost: 2.00,
      categoryId: officeCategory.id,
      supplierId: supplier3.id,
      active: true,
    },
  })
  await prisma.storeInventory.upsert({
    where: { storeId_productId: { storeId: storeAcme1.id, productId: product4.id } },
    update: { quantity: 120, minStock: 30, maxStock: 300 },
    create: {
      companyId: company.id,
      storeId: storeAcme1.id,
      productId: product4.id,
      quantity: 120,
      minStock: 30,
      maxStock: 300,
    },
  })

  const product5 = await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Teclado Mecánico [Acme]',
      description: 'Teclado mecánico retroiluminado - Acme',
      sku: 'ACME-TEC-001',
      barcode: '3333444455556',
      price: 89.99,
      cost: 55.00,
      categoryId: electronicsCategory.id,
      supplierId: supplier1.id,
      active: true,
    },
  })
  await prisma.storeInventory.upsert({
    where: { storeId_productId: { storeId: storeAcme2.id, productId: product5.id } },
    update: { quantity: 20, minStock: 5, maxStock: 80 },
    create: {
      companyId: company.id,
      storeId: storeAcme2.id,
      productId: product5.id,
      quantity: 20,
      minStock: 5,
      maxStock: 80,
    },
  })

  const product6 = await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Silla Oficina [Acme]',
      description: 'Silla ergonómica de oficina - Acme',
      sku: 'ACME-SIL-001',
      barcode: '4444555566667',
      price: 149.99,
      cost: 90.00,
      categoryId: officeCategory.id,
      supplierId: supplier3.id,
      active: true,
    },
  })
  await prisma.storeInventory.upsert({
    where: { storeId_productId: { storeId: storeAcme2.id, productId: product6.id } },
    update: { quantity: 12, minStock: 4, maxStock: 40 },
    create: {
      companyId: company.id,
      storeId: storeAcme2.id,
      productId: product6.id,
      quantity: 12,
      minStock: 4,
      maxStock: 40,
    },
  })

  console.log(`✅ Productos Acme: ${product1.name}, ${product2.name}, ${product3.name}, ${product4.name}, ${product5.name}, ${product6.name}`)

  // 4. Crear clientes Acme
  const customer1 = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: 'Juan Pérez (Acme)',
      email: 'juan.perez@cliente-acme.com',
      phone: '+1234567892',
      address: '789 Customer St, Acme',
    },
  })

  const customer2 = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: 'María García (Acme)',
      email: 'maria.garcia@cliente-acme.com',
      phone: '+1234567893',
      address: '321 Client Ave, Acme',
    },
  })

  const customer3 = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: 'Pedro López (Acme)',
      email: 'pedro.lopez@cliente-acme.com',
      phone: '+1234567896',
      address: '555 Buyer Rd, Acme',
    },
  })
  console.log(`✅ Clientes Acme: ${customer1.name}, ${customer2.name}, ${customer3.name}`)

  // 5. Configuración de tienda Acme
  await prisma.storeConfig.create({
    data: {
      companyId: company.id,
      name: 'Tienda Principal Acme',
      address: '123 Main Street, Acme',
      phone: '+1234567894',
      email: 'tienda@acme.com',
      currency: 'USD',
      taxRate: 0.08,
      lowStockAlert: 10,
      invoicePrefix: 'ACME-INV-',
      invoiceNumber: 4,
      allowSalesWithoutStock: false,
    },
  })
  console.log('✅ Configuración de tienda Acme creada')

  // 6. Configuración de tickets Acme
  await prisma.ticketConfig.create({
    data: {
      companyId: company.id,
      ticketType: 'RECEIPT',
      header: 'Acme Inc. - Gracias por su compra',
      footer: 'Vuelva pronto a Acme',
      thermalWidth: 80,
      fontSize: 12,
      copies: 1,
      autoPrint: true,
    },
  })
  console.log('✅ Configuración de tickets Acme creada')

  // 7. Configuración de fidelidad Acme
  await prisma.loyaltyConfig.create({
    data: {
      companyId: company.id,
      pointsPerDollar: 1.00,
      redemptionRate: 0.01,
      pointsExpireMonths: 12,
      minPurchaseForPoints: 10.00,
      maxPointsPerPurchase: 1000,
      isActive: true,
    },
  })
  console.log('✅ Configuración de fidelidad Acme creada')

  // 8. Crear ventas Acme (varias, usuarios @acme.com)
  const sale1 = await prisma.sale.create({
    data: {
      companyId: company.id,
      storeId: storeAcme1.id,
      customerId: customer1.id,
      userId: acmeGerente.id,
      invoiceNumber: 'ACME-INV-0001',
      total: 1319.98,
      subtotal: 1219.98,
      tax: 100.00,
      createdAt: daysAgo(0),
      status: 'COMPLETED',
      paymentMethod: 'CARD',
      items: {
        create: [
          { productId: product1.id, quantity: 1, price: 1299.99, subtotal: 1299.99 },
        ],
      },
    },
  })

  const sale2 = await prisma.sale.create({
    data: {
      companyId: company.id,
      storeId: storeAcme1.id,
      customerId: customer2.id,
      userId: acmeVentas.id,
      invoiceNumber: 'ACME-INV-0002',
      total: 59.97,
      subtotal: 55.53,
      tax: 4.44,
      createdAt: daysAgo(3),
      status: 'COMPLETED',
      paymentMethod: 'CASH',
      items: {
        create: [
          { productId: product2.id, quantity: 2, price: 19.99, subtotal: 39.98 },
          { productId: product4.id, quantity: 3, price: 4.99, subtotal: 14.97 },
        ],
      },
    },
  })

  const sale3 = await prisma.sale.create({
    data: {
      companyId: company.id,
      storeId: storeAcme2.id,
      customerId: customer3.id,
      userId: acmeGerente.id,
      invoiceNumber: 'ACME-INV-0003',
      total: 289.97,
      subtotal: 269.98,
      tax: 19.99,
      createdAt: daysAgo(10),
      status: 'COMPLETED',
      paymentMethod: 'CARD',
      items: {
        create: [
          { productId: product3.id, quantity: 1, price: 199.99, subtotal: 199.99 },
          { productId: product5.id, quantity: 1, price: 89.99, subtotal: 89.99 },
        ],
      },
    },
  })
  console.log(`✅ Ventas Acme creadas: ${sale1.invoiceNumber}, ${sale2.invoiceNumber}, ${sale3.invoiceNumber}`)

  await prisma.inventoryTransfer.create({
    data: {
      companyId: company.id,
      fromStoreId: storeAcme1.id,
      toStoreId: storeAcme2.id,
      productId: product1.id,
      quantity: 2,
      status: 'COMPLETED',
      completedAt: daysAgo(2),
      createdById: acmeGerente.id,
      notes: 'Reposición de stock desde Acme Centro a Acme Norte',
    },
  })
  console.log('✅ Transferencia de inventario Acme creada')

  // 9. Puntos de fidelidad Acme
  await prisma.loyaltyPoint.create({
    data: {
      companyId: company.id,
      customerId: customer1.id,
      saleId: sale1.id,
      points: 1320,
      type: 'EARNED',
      description: 'Puntos Acme - compra INV-0001',
    },
  })
  await prisma.loyaltyPoint.create({
    data: {
      companyId: company.id,
      customerId: customer2.id,
      saleId: sale2.id,
      points: 60,
      type: 'EARNED',
      description: 'Puntos Acme - compra INV-0002',
      expiresAt: daysAgo(-365),
    },
  })
  console.log('✅ Puntos de fidelidad Acme creados')

  // 10. Preferencias de usuario Acme
  await prisma.userPreferences.create({
    data: { companyId: company.id, userId: acmeGerente.id, language: 'es' },
  })
  await prisma.userPreferences.create({
    data: { companyId: company.id, userId: acmeVentas.id, language: 'es' },
  })
  console.log('✅ Preferencias de usuario Acme creadas')

  try {
    await prisma.report.create({
      data: {
        companyId: company.id,
        name: 'Reporte de Ventas Acme',
        type: 'SALES_SUMMARY',
        config: { period: 'month', currency: 'USD' },
      },
    })
    await prisma.report.create({
      data: {
        companyId: company.id,
        name: 'Reporte de Inventario Acme',
        type: 'INVENTORY_STATUS',
        config: { lowStockThreshold: 10 },
      },
    })
    console.log('✅ Reportes Acme creados')
  } catch {
    console.log('⚠️ Tabla reports no encontrada, omitiendo reportes')
  }

  // 11. Notificaciones Acme (opcional: tabla puede no existir)
  try {
    await prisma.notification.create({
      data: {
        companyId: company.id,
        userId: acmeGerente.id,
        type: 'INFO',
        priority: 'MEDIUM',
        title: 'Bienvenido a Acme Inc.',
        message: 'Sistema Acme - Electrónica y oficina',
        status: 'UNREAD',
      },
    })
    await prisma.notification.create({
      data: {
        companyId: company.id,
        userId: acmeVentas.id,
        type: 'INFO',
        priority: 'LOW',
        title: 'Ventas Acme',
        message: 'Panel de ventas Acme Inc.',
        status: 'UNREAD',
      },
    })
    console.log('✅ Notificaciones Acme creadas')
  } catch {
    console.log('⚠️ Tabla notifications no encontrada, omitiendo')
  }

  // ========================================
  // SEGUNDA EMPRESA: Beta Corp.
  // ========================================

  console.log('🏢 Creando segunda empresa (Beta Corp.)...')

  const company2 = await prisma.company.create({
    data: {
      name: 'Beta Corp.',
    },
  })
  console.log(`✅ Empresa creada: ${company2.name} (ID: ${company2.id})`)

  // Módulos contratados por Beta
  await prisma.companyModule.createMany({
    data: [
      { companyId: company2.id, moduleId: moduleWorkify.id, enabled: true },
      { companyId: company2.id, moduleId: moduleShopflow.id, enabled: true },
      { companyId: company2.id, moduleId: moduleTechservices.id, enabled: true },
      { companyId: company2.id, moduleId: moduleBaro.id, enabled: true },
    ],
  })

  // Usuarios Beta (@betacorp.com)
  const gerenteBeta = await prisma.user.create({
    data: {
      email: 'gerente@betacorp.com',
      password: hashedPassword,
      firstName: 'Carmen',
      lastName: 'Beta',
      phone: '+1987654320',
      role: 'ADMIN',
      isActive: true,
    },
  })

  const ventasBeta = await prisma.user.create({
    data: {
      email: 'ventas@betacorp.com',
      password: hashedPassword,
      firstName: 'Diego',
      lastName: 'Beta',
      phone: '+1987654321',
      role: 'USER',
      isActive: true,
    },
  })
  console.log(`✅ Usuarios Beta creados: ${gerenteBeta.email}, ${ventasBeta.email}`)

  // Beta: owner = gerente (superuser no es miembro de ninguna empresa)
  await prisma.company.update({
    where: { id: company2.id },
    data: { ownerUserId: gerenteBeta.id },
  })
  const betaOwnerMember = await prisma.companyMember.create({
    data: { userId: gerenteBeta.id, companyId: company2.id, membershipRole: 'OWNER' },
  })
  const betaUserMember = await prisma.companyMember.create({
    data: { userId: ventasBeta.id, companyId: company2.id, membershipRole: 'USER' },
  })
  console.log('✅ Owner y CompanyMembers Beta creados')

  // Módulos activos para cada miembro de Beta
  await prisma.companyMemberModule.createMany({
    data: [
      { companyMemberId: betaOwnerMember.id, moduleId: moduleWorkify.id, enabled: true },
      { companyMemberId: betaOwnerMember.id, moduleId: moduleShopflow.id, enabled: true },
      { companyMemberId: betaOwnerMember.id, moduleId: moduleTechservices.id, enabled: true },
      { companyMemberId: betaOwnerMember.id, moduleId: moduleBaro.id, enabled: true },
      { companyMemberId: betaUserMember.id, moduleId: moduleWorkify.id, enabled: true },
      { companyMemberId: betaUserMember.id, moduleId: moduleShopflow.id, enabled: true },
    ],
  })

  // Workify: departamentos Beta (opcional: tablas pueden no existir)
  try {
    const salesDepartment = await prisma.department.create({
    data: {
      name: 'Ventas',
      description: 'Departamento de ventas',
      companyId: company2.id,
    },
  })

  const operationsDepartment = await prisma.department.create({
    data: {
      name: 'Operaciones',
      description: 'Departamento de operaciones',
      companyId: company2.id,
    },
  })
  console.log(`✅ Departamentos Beta: ${salesDepartment.name}, ${operationsDepartment.name}`)

  const sellerPosition = await prisma.position.create({
    data: {
      name: 'Vendedor',
      description: 'Posición de ventas',
      departmentId: salesDepartment.id,
      salaryType: 'MONTH',
      baseSalary: 2800.00,
      overtimeType: 'MULTIPLIER',
      overtimeMultiplier: 1.5,
    },
  })

  const operatorPosition = await prisma.position.create({
    data: {
      name: 'Operador',
      description: 'Operador de almacén',
      departmentId: operationsDepartment.id,
      salaryType: 'MONTH',
      baseSalary: 2200.00,
      overtimeType: 'MULTIPLIER',
      overtimeMultiplier: 1.5,
    },
  })
  console.log(`✅ Posiciones Beta: ${sellerPosition.name}, ${operatorPosition.name}`)

  const morningShiftBeta = await prisma.workShift.create({
    data: {
      name: 'Mañana Beta',
      description: 'Turno mañana Beta',
      startTime: '08:00',
      endTime: '16:00',
      breakStart: '12:00',
      breakEnd: '13:00',
      tolerance: 15,
      isActive: true,
      isNightShift: false,
      companyId: company2.id,
    },
  })

  const afternoonShiftBeta = await prisma.workShift.create({
    data: {
      name: 'Tarde Beta',
      description: 'Turno tarde Beta',
      startTime: '14:00',
      endTime: '22:00',
      breakStart: '18:00',
      breakEnd: '19:00',
      tolerance: 15,
      isActive: true,
      isNightShift: false,
      companyId: company2.id,
    },
  })
  console.log(`✅ Turnos Beta: ${morningShiftBeta.name}, ${afternoonShiftBeta.name}`)

  const christmasHoliday = await prisma.holiday.create({
    data: {
      name: 'Navidad',
      date: new Date('2025-12-25'),
      isRecurring: true,
      companyId: company2.id,
    },
  })
  console.log(`✅ Día festivo Beta: ${christmasHoliday.name}`)

  // Roles por empresa (RBAC) para Beta: misma estructura que Acme
  const betaOwnerRole = await prisma.role.create({
    data: {
      name: 'Owner',
      description: 'Propietario de la empresa con control total',
      companyId: company2.id,
    },
  })

  const betaAdminRole = await prisma.role.create({
    data: {
      name: 'Admin',
      description: 'Administrador de empresa',
      companyId: company2.id,
    },
  })

  const betaHrRole = await prisma.role.create({
    data: {
      name: 'HRManager',
      description: 'Responsable de RRHH',
      companyId: company2.id,
    },
  })

  const betaManagerRole = await prisma.role.create({
    data: {
      name: 'Manager',
      description: 'Gerente de área',
      companyId: company2.id,
    },
  })

  const betaBasicUserRole = await prisma.role.create({
    data: {
      name: 'BasicUser',
      description: 'Usuario estándar sin permisos de administración',
      companyId: company2.id,
    },
  })

  const betaCajeroRole = await prisma.role.create({
    data: {
      name: 'Cajero',
      description: 'Cajero con acceso a creación y lectura de ventas, y a operar la caja (abrir/cerrar sesiones)',
      companyId: company2.id,
    },
  })

  const betaVendedorRole = await prisma.role.create({
    data: {
      name: 'Vendedor',
      description: 'Vendedor móvil: crea ventas pendientes sin operar la caja',
      companyId: company2.id,
    },
  })

  const betaRolePermissionsData = [
    // Owner
    ...[
      'hub.company.read',
      'hub.company.update',
      'hub.company.modules.read',
      'hub.company.modules.manage',
      'hub.members.read',
      'hub.members.create',
      'hub.members.update',
      'hub.members.delete',
      'hub.user.modules.read',
      'hub.user.modules.manage',
      'hub.roles.read',
      'hub.roles.manage',
      'hub.permissions.read',
      'hub.role.assign',
      'workify.access',
      'workify.users.read',
      'workify.users.manage',
      'shopflow.access',
      'shopflow.users.read',
      'shopflow.users.manage',
      'techservices.access',
      'baro.access',
    ].map((name) => ({
      roleId: betaOwnerRole.id,
      permissionId: permissionsByName[name]!.id,
    })),
    // Admin
    ...[
      'hub.company.read',
      'hub.company.update',
      'hub.company.modules.read',
      'hub.company.modules.manage',
      'hub.members.read',
      'hub.members.create',
      'hub.members.update',
      'hub.members.delete',
      'hub.user.modules.read',
      'hub.user.modules.manage',
      'hub.roles.read',
      'hub.permissions.read',
      'workify.access',
      'workify.users.read',
      'workify.users.manage',
      'shopflow.access',
      'shopflow.users.read',
      'shopflow.users.manage',
      'techservices.access',
      'baro.access',
    ].map((name) => ({
      roleId: betaAdminRole.id,
      permissionId: permissionsByName[name]!.id,
    })),
    // HR
    ...[
      'hub.company.read',
      'hub.members.read',
      'hub.members.create',
      'hub.members.update',
      'hub.user.modules.read',
      'hub.user.modules.manage',
      'workify.access',
      'workify.users.read',
      'workify.users.manage',
    ].map((name) => ({
      roleId: betaHrRole.id,
      permissionId: permissionsByName[name]!.id,
    })),
    // Manager
    ...[
      'hub.members.read',
      'workify.access',
      'workify.users.read',
      'shopflow.access',
      'shopflow.users.read',
    ].map((name) => ({
      roleId: betaManagerRole.id,
      permissionId: permissionsByName[name]!.id,
    })),
    // BasicUser
    ...[
      'workify.access',
      'shopflow.access',
      'techservices.access',
      'baro.access',
    ].map((name) => ({
      roleId: betaBasicUserRole.id,
      permissionId: permissionsByName[name]!.id,
    })),
    // Cajero: crear/leer ventas + liquidar pendientes + operar la caja (leer cajas, abrir/cerrar/leer sesiones)
    ...[
      'shopflow.access',
      'shopflow.sales.read',
      'shopflow.sales.create',
      'shopflow.sales.settle',
      'shopflow.cash-registers.read',
      'shopflow.cash-sessions.read',
      'shopflow.cash-sessions.open',
      'shopflow.cash-sessions.close',
    ].map((name) => ({
      roleId: betaCajeroRole.id,
      permissionId: permissionsByName[name]!.id,
    })),
    // Vendedor: solo crear ventas pendientes (moto vendedor), sin permisos de caja ni de liquidación
    ...[
      'shopflow.access',
      'shopflow.sales.create',
    ].map((name) => ({
      roleId: betaVendedorRole.id,
      permissionId: permissionsByName[name]!.id,
    })),
  ]

  await prisma.rolePermission.createMany({
    data: betaRolePermissionsData,
  })

  await prisma.userRoleAssignment.create({
    data: { userId: gerenteBeta.id, roleId: betaOwnerRole.id, companyId: company2.id },
  })
  await prisma.userRoleAssignment.create({
    data: { userId: ventasBeta.id, roleId: betaBasicUserRole.id, companyId: company2.id },
  })
  console.log('✅ Roles y permisos de Beta creados y asignados')

  const employee1Beta = await prisma.employee.create({
    data: {
      companyId: company2.id,
      departmentId: salesDepartment.id,
      positionId: sellerPosition.id,
      userId: gerenteBeta.id,
      firstName: 'Carmen',
      lastName: 'Beta',
      idNumber: '11112222',
      dateJoined: new Date('2024-03-01'),
      status: 'ACTIVE',
      gender: 'FEMALE',
    },
  })

  const employee2Beta = await prisma.employee.create({
    data: {
      companyId: company2.id,
      departmentId: operationsDepartment.id,
      positionId: operatorPosition.id,
      userId: ventasBeta.id,
      firstName: 'Diego',
      lastName: 'Beta',
      idNumber: '33334444',
      dateJoined: new Date('2024-04-01'),
      status: 'ACTIVE',
      gender: 'MALE',
    },
  })
  console.log(`✅ Empleados Beta creados: ${employee1Beta.firstName} ${employee1Beta.lastName}, ${employee2Beta.firstName} ${employee2Beta.lastName}`)

  await prisma.schedule.create({
    data: {
      companyId: company2.id,
      employeeId: employee1Beta.id,
      workShiftId: morningShiftBeta.id,
      dayOfWeek: 1,
      startDate: new Date('2025-01-01'),
    },
  })
    console.log('✅ Horarios Beta creados')
  } catch {
    console.log('⚠️ Tablas Workify no encontradas, omitiendo seed Workify Beta')
  }

  // Shopflow: dos locales por empresa - Beta
  const storeBeta1 = await prisma.store.create({
    data: {
      companyId: company2.id,
      name: 'Beta Sucursal Centro',
      code: 'BETA-01',
      address: '100 Central Blvd, Beta',
      phone: '+1987654322',
      email: 'centro@betacorp.com',
      active: true,
    },
  })
  const storeBeta2 = await prisma.store.create({
    data: {
      companyId: company2.id,
      name: 'Beta Sucursal Sur',
      code: 'BETA-02',
      address: '200 South St, Beta',
      phone: '+1987654323',
      email: 'sur@betacorp.com',
      active: true,
    },
  })
  console.log(`✅ Locales Beta: ${storeBeta1.name} (${storeBeta1.code}), ${storeBeta2.name} (${storeBeta2.code})`)

  await prisma.userStore.create({
    data: { userId: ventasBeta.id, storeId: storeBeta1.id },
  })
  console.log('✅ Local asignado a usuario USER (Beta)')

  // Shopflow: categorías Beta (distintas para debug)
  const homeCategory = await prisma.category.create({
    data: {
      companyId: company2.id,
      name: 'Hogar Beta',
      description: 'Productos para el hogar - Beta Corp.',
    },
  })

  const sportsCategory = await prisma.category.create({
    data: {
      companyId: company2.id,
      name: 'Deportes Beta',
      description: 'Artículos deportivos Beta',
    },
  })

  const gardenCategory = await prisma.category.create({
    data: {
      companyId: company2.id,
      name: 'Jardín Beta',
      description: 'Jardinería y exterior Beta',
    },
  })
  console.log(`✅ Categorías Beta: ${homeCategory.name}, ${sportsCategory.name}, ${gardenCategory.name}`)

  const supplier1Beta = await prisma.supplier.create({
    data: {
      companyId: company2.id,
      name: 'Home Supplies Beta',
      email: 'contact@homesupplies-beta.com',
      phone: '+1987654321',
      address: '100 Home Ave, Beta',
      city: 'Chicago',
      state: 'IL',
      taxId: 'BETA-TAX-01',
      active: true,
    },
  })

  const supplier2Beta = await prisma.supplier.create({
    data: {
      companyId: company2.id,
      name: 'Sport Wholesale Beta',
      email: 'contact@sport-betacorp.com',
      phone: '+1987654322',
      address: '200 Sport Blvd',
      city: 'Miami',
      state: 'FL',
      taxId: 'BETA-TAX-02',
      active: true,
    },
  })

  const supplier3Beta = await prisma.supplier.create({
    data: {
      companyId: company2.id,
      name: 'Jardín Beta S.L.',
      email: 'pedidos@jardin-betacorp.com',
      phone: '+1987654326',
      address: '300 Garden Rd',
      city: 'Houston',
      state: 'TX',
      taxId: 'BETA-TAX-03',
      active: true,
    },
  })
  console.log(`✅ Proveedores Beta: ${supplier1Beta.name}, ${supplier2Beta.name}, ${supplier3Beta.name}`)

  const product1Beta = await prisma.product.create({
    data: {
      companyId: company2.id,
      name: 'Lámpara escritorio [Beta]',
      description: 'Lámpara LED regulable - Beta',
      sku: 'BETA-LAMP-001',
      barcode: '5000111222333',
      price: 49.99,
      cost: 25.00,
      categoryId: homeCategory.id,
      supplierId: supplier1Beta.id,
      active: true,
    },
  })
  await prisma.storeInventory.upsert({
    where: { storeId_productId: { storeId: storeBeta1.id, productId: product1Beta.id } },
    update: { quantity: 28, minStock: 10, maxStock: 100 },
    create: {
      companyId: company2.id,
      storeId: storeBeta1.id,
      productId: product1Beta.id,
      quantity: 28,
      minStock: 10,
      maxStock: 100,
    },
  })

  const product2Beta = await prisma.product.create({
    data: {
      companyId: company2.id,
      name: 'Balón fútbol [Beta]',
      description: 'Balón reglamentario Beta',
      sku: 'BETA-BALL-001',
      barcode: '5000444555666',
      price: 29.99,
      cost: 15.00,
      categoryId: sportsCategory.id,
      supplierId: supplier2Beta.id,
      active: true,
    },
  })
  await prisma.storeInventory.upsert({
    where: { storeId_productId: { storeId: storeBeta1.id, productId: product2Beta.id } },
    update: { quantity: 38, minStock: 15, maxStock: 150 },
    create: {
      companyId: company2.id,
      storeId: storeBeta1.id,
      productId: product2Beta.id,
      quantity: 38,
      minStock: 15,
      maxStock: 150,
    },
  })

  const product3Beta = await prisma.product.create({
    data: {
      companyId: company2.id,
      name: 'Mesa jardín [Beta]',
      description: 'Mesa exterior Beta',
      sku: 'BETA-MESA-001',
      barcode: '5000777888999',
      price: 89.99,
      cost: 45.00,
      categoryId: gardenCategory.id,
      supplierId: supplier3Beta.id,
      active: true,
    },
  })
  await prisma.storeInventory.upsert({
    where: { storeId_productId: { storeId: storeBeta2.id, productId: product3Beta.id } },
    update: { quantity: 12, minStock: 5, maxStock: 30 },
    create: {
      companyId: company2.id,
      storeId: storeBeta2.id,
      productId: product3Beta.id,
      quantity: 12,
      minStock: 5,
      maxStock: 30,
    },
  })

  const product4Beta = await prisma.product.create({
    data: {
      companyId: company2.id,
      name: 'Raqueta tenis [Beta]',
      description: 'Raqueta profesional Beta',
      sku: 'BETA-RAQ-001',
      barcode: '5000999000111',
      price: 79.99,
      cost: 40.00,
      categoryId: sportsCategory.id,
      supplierId: supplier2Beta.id,
      active: true,
    },
  })
  await prisma.storeInventory.upsert({
    where: { storeId_productId: { storeId: storeBeta2.id, productId: product4Beta.id } },
    update: { quantity: 18, minStock: 5, maxStock: 50 },
    create: {
      companyId: company2.id,
      storeId: storeBeta2.id,
      productId: product4Beta.id,
      quantity: 18,
      minStock: 5,
      maxStock: 50,
    },
  })

  const product5Beta = await prisma.product.create({
    data: {
      companyId: company2.id,
      name: 'Set Herramientas [Beta]',
      description: 'Set de herramientas para hogar - Beta',
      sku: 'BETA-TOOL-001',
      barcode: '5000123434567',
      price: 59.99,
      cost: 30.00,
      categoryId: homeCategory.id,
      supplierId: supplier1Beta.id,
      active: true,
    },
  })
  await prisma.storeInventory.upsert({
    where: { storeId_productId: { storeId: storeBeta2.id, productId: product5Beta.id } },
    update: { quantity: 22, minStock: 8, maxStock: 90 },
    create: {
      companyId: company2.id,
      storeId: storeBeta2.id,
      productId: product5Beta.id,
      quantity: 22,
      minStock: 8,
      maxStock: 90,
    },
  })

  const product6Beta = await prisma.product.create({
    data: {
      companyId: company2.id,
      name: 'Soga de saltar [Beta]',
      description: 'Soga de entrenamiento - Beta',
      sku: 'BETA-ROPE-001',
      barcode: '5000765432109',
      price: 12.99,
      cost: 5.00,
      categoryId: sportsCategory.id,
      supplierId: supplier2Beta.id,
      active: true,
    },
  })
  await prisma.storeInventory.upsert({
    where: { storeId_productId: { storeId: storeBeta1.id, productId: product6Beta.id } },
    update: { quantity: 60, minStock: 20, maxStock: 200 },
    create: {
      companyId: company2.id,
      storeId: storeBeta1.id,
      productId: product6Beta.id,
      quantity: 60,
      minStock: 20,
      maxStock: 200,
    },
  })

  console.log(`✅ Productos Beta: ${product1Beta.name}, ${product2Beta.name}, ${product3Beta.name}, ${product4Beta.name}, ${product5Beta.name}, ${product6Beta.name}`)

  const customer1Beta = await prisma.customer.create({
    data: {
      companyId: company2.id,
      name: 'Carlos López (Beta)',
      email: 'carlos.lopez@cliente-betacorp.com',
      phone: '+1987654323',
      address: '300 Buyer St, Beta',
    },
  })

  const customer2Beta = await prisma.customer.create({
    data: {
      companyId: company2.id,
      name: 'Ana Martínez (Beta)',
      email: 'ana.martinez@cliente-betacorp.com',
      phone: '+1987654324',
      address: '400 Client Rd, Beta',
    },
  })

  const customer3Beta = await prisma.customer.create({
    data: {
      companyId: company2.id,
      name: 'Luis Fernández (Beta)',
      email: 'luis.fernandez@cliente-betacorp.com',
      phone: '+1987654327',
      address: '600 Beta Ave',
    },
  })
  console.log(`✅ Clientes Beta: ${customer1Beta.name}, ${customer2Beta.name}, ${customer3Beta.name}`)

  await prisma.storeConfig.create({
    data: {
      companyId: company2.id,
      name: 'Tienda Principal Beta',
      address: '500 Beta Street, Beta Corp.',
      phone: '+1987654325',
      email: 'tienda@betacorp.com',
      currency: 'USD',
      taxRate: 0.08,
      lowStockAlert: 10,
      invoicePrefix: 'BETA-INV-',
      invoiceNumber: 4,
      allowSalesWithoutStock: false,
    },
  })
  console.log('✅ Configuración de tienda Beta creada')

  await prisma.ticketConfig.create({
    data: {
      companyId: company2.id,
      ticketType: 'RECEIPT',
      header: 'Beta Corp. - Gracias por su compra',
      footer: 'Vuelva pronto a Beta',
      thermalWidth: 80,
      fontSize: 12,
      copies: 1,
      autoPrint: true,
    },
  })
  console.log('✅ Configuración de tickets Beta creada')

  await prisma.loyaltyConfig.create({
    data: {
      companyId: company2.id,
      pointsPerDollar: 1.00,
      redemptionRate: 0.01,
      pointsExpireMonths: 12,
      minPurchaseForPoints: 10.00,
      maxPointsPerPurchase: 1000,
      isActive: true,
    },
  })
  console.log('✅ Configuración de fidelidad Beta creada')

  const sale1Beta = await prisma.sale.create({
    data: {
      companyId: company2.id,
      storeId: storeBeta1.id,
      customerId: customer1Beta.id,
      userId: gerenteBeta.id,
      invoiceNumber: 'BETA-INV-0001',
      total: 53.99,
      subtotal: 49.99,
      tax: 4.00,
      createdAt: daysAgo(1),
      status: 'COMPLETED',
      paymentMethod: 'CASH',
      items: {
        create: [
          { productId: product1Beta.id, quantity: 1, price: 49.99, subtotal: 49.99 },
        ],
      },
    },
  })

  const sale2Beta = await prisma.sale.create({
    data: {
      companyId: company2.id,
      storeId: storeBeta2.id,
      customerId: customer2Beta.id,
      userId: ventasBeta.id,
      invoiceNumber: 'BETA-INV-0002',
      total: 179.98,
      subtotal: 167.98,
      tax: 12.00,
      createdAt: daysAgo(6),
      status: 'COMPLETED',
      paymentMethod: 'CARD',
      items: {
        create: [
          { productId: product3Beta.id, quantity: 1, price: 89.99, subtotal: 89.99 },
          { productId: product4Beta.id, quantity: 1, price: 79.99, subtotal: 79.99 },
        ],
      },
    },
  })

  const sale3Beta = await prisma.sale.create({
    data: {
      companyId: company2.id,
      storeId: storeBeta2.id,
      customerId: customer3Beta.id,
      userId: gerenteBeta.id,
      invoiceNumber: 'BETA-INV-0003',
      total: 161.98,
      subtotal: 149.98,
      tax: 12.00,
      createdAt: daysAgo(15),
      status: 'COMPLETED',
      paymentMethod: 'CASH',
      items: {
        create: [
          { productId: product5Beta.id, quantity: 1, price: 59.99, subtotal: 59.99 },
          { productId: product3Beta.id, quantity: 1, price: 89.99, subtotal: 89.99 },
        ],
      },
    },
  })
  console.log(`✅ Ventas Beta creadas: ${sale1Beta.invoiceNumber}, ${sale2Beta.invoiceNumber}, ${sale3Beta.invoiceNumber}`)

  await prisma.inventoryTransfer.create({
    data: {
      companyId: company2.id,
      fromStoreId: storeBeta1.id,
      toStoreId: storeBeta2.id,
      productId: product2Beta.id,
      quantity: 5,
      status: 'COMPLETED',
      completedAt: daysAgo(4),
      createdById: gerenteBeta.id,
      notes: 'Transferencia de balones a sucursal sur',
    },
  })
  console.log('✅ Transferencia de inventario Beta creada')

  await prisma.loyaltyPoint.create({
    data: {
      companyId: company2.id,
      customerId: customer1Beta.id,
      saleId: sale1Beta.id,
      points: 54,
      type: 'EARNED',
      description: 'Puntos Beta - compra BETA-INV-0001',
    },
  })
  await prisma.loyaltyPoint.create({
    data: {
      companyId: company2.id,
      customerId: customer2Beta.id,
      saleId: sale2Beta.id,
      points: 200,
      type: 'EARNED',
      description: 'Puntos Beta - compra BETA-INV-0002',
      expiresAt: daysAgo(-365),
    },
  })
  console.log('✅ Puntos de fidelidad Beta creados')

  await prisma.userPreferences.create({
    data: { companyId: company2.id, userId: gerenteBeta.id, language: 'es' },
  })
  await prisma.userPreferences.create({
    data: { companyId: company2.id, userId: ventasBeta.id, language: 'es' },
  })
  console.log('✅ Preferencias de usuario Beta creadas')

  try {
    await prisma.report.create({
      data: {
        companyId: company2.id,
        name: 'Reporte de Ventas Beta',
        type: 'SALES_SUMMARY',
        config: { period: 'week', currency: 'USD' },
      },
    })
    await prisma.report.create({
      data: {
        companyId: company2.id,
        name: 'Reporte de Inventario Beta',
        type: 'INVENTORY_STATUS',
        config: { lowStockThreshold: 10 },
      },
    })
    console.log('✅ Reportes Beta creados')
  } catch {
    console.log('⚠️ Tabla reports no encontrada, omitiendo reportes')
  }

  try {
    await prisma.notification.create({
      data: {
        companyId: company2.id,
        userId: gerenteBeta.id,
        type: 'INFO',
        priority: 'MEDIUM',
        title: 'Bienvenido a Beta Corp.',
        message: 'Sistema Beta - Hogar, deportes y jardín',
        status: 'UNREAD',
      },
    })
    await prisma.notification.create({
      data: {
        companyId: company2.id,
        userId: ventasBeta.id,
        type: 'INFO',
        priority: 'LOW',
        title: 'Ventas Beta',
        message: 'Panel de ventas Beta Corp.',
        status: 'UNREAD',
      },
    })
    console.log('✅ Notificaciones Beta creadas')
  } catch {
    console.log('⚠️ Tabla notifications no encontrada, omitiendo')
  }

  console.log('✅ Seed completado exitosamente!')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
