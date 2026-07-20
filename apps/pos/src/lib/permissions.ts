import type { UserRole } from '@/types'

/**
 * Available modules in the system
 */
export enum Module {
  PRODUCTS = 'products',
  INVENTORY = 'inventory',
  SALES = 'sales',
  CUSTOMERS = 'customers',
  REPORTS = 'reports',
  SUPPLIERS = 'suppliers',
  CATEGORIES = 'categories',
  USERS = 'users',
  STORE_CONFIG = 'store_config',
  LOYALTY = 'loyalty',
}

/**
 * Available actions/permissions
 */
export enum Permission {
  // Read permissions
  VIEW = 'view',
  LIST = 'list',
  
  // Write permissions
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  
  // Special permissions
  MANAGE = 'manage', // Full access (all CRUD operations)
  CANCEL = 'cancel', // Cancel sales
  REFUND = 'refund', // Refund sales
  ADJUST_INVENTORY = 'adjust_inventory', // Adjust stock
  EXPORT = 'export', // Export reports
  CONFIGURE = 'configure', // Configure settings
}

/**
 * Permission string format: module:permission
 * Example: 'products:create', 'sales:cancel'
 */
export type PermissionString = `${Module}:${Permission}`

/**
 * Permission configuration for each role
 */
export interface RolePermissions {
  [Module.PRODUCTS]: Permission[]
  [Module.INVENTORY]: Permission[]
  [Module.SALES]: Permission[]
  [Module.CUSTOMERS]: Permission[]
  [Module.REPORTS]: Permission[]
  [Module.SUPPLIERS]: Permission[]
  [Module.CATEGORIES]: Permission[]
  [Module.USERS]: Permission[]
  [Module.STORE_CONFIG]: Permission[]
  [Module.LOYALTY]: Permission[]
}

/** Roles that exist in the backend; frontend map may include extras (e.g. SUPERADMIN). */
type RoleKey = UserRole | 'SUPERADMIN'

/**
 * Permission configuration map by role
 */
const ROLE_PERMISSIONS: Record<RoleKey, RolePermissions> = {
  ADMIN: {
    [Module.PRODUCTS]: [Permission.MANAGE],
    [Module.INVENTORY]: [Permission.MANAGE],
    [Module.SALES]: [Permission.MANAGE],
    [Module.CUSTOMERS]: [Permission.MANAGE],
    [Module.REPORTS]: [Permission.MANAGE],
    [Module.SUPPLIERS]: [Permission.MANAGE],
    [Module.CATEGORIES]: [Permission.MANAGE],
    [Module.USERS]: [Permission.MANAGE],
    [Module.STORE_CONFIG]: [Permission.MANAGE],
    [Module.LOYALTY]: [Permission.MANAGE],
  },
  SUPERVISOR: {
    [Module.PRODUCTS]: [Permission.VIEW, Permission.LIST, Permission.UPDATE],
    [Module.INVENTORY]: [Permission.VIEW, Permission.LIST, Permission.ADJUST_INVENTORY],
    [Module.SALES]: [Permission.VIEW, Permission.LIST, Permission.CREATE, Permission.CANCEL],
    [Module.CUSTOMERS]: [Permission.MANAGE],
    [Module.REPORTS]: [Permission.VIEW, Permission.LIST, Permission.EXPORT],
    [Module.SUPPLIERS]: [Permission.VIEW, Permission.LIST],
    [Module.CATEGORIES]: [Permission.VIEW, Permission.LIST, Permission.UPDATE],
    [Module.USERS]: [Permission.VIEW, Permission.LIST],
    [Module.STORE_CONFIG]: [Permission.VIEW],
    [Module.LOYALTY]: [Permission.VIEW, Permission.LIST, Permission.CONFIGURE],
  },
  CASHIER: {
    [Module.PRODUCTS]: [Permission.VIEW, Permission.LIST],
    [Module.INVENTORY]: [Permission.VIEW, Permission.LIST],
    [Module.SALES]: [Permission.VIEW, Permission.LIST, Permission.CREATE],
    [Module.CUSTOMERS]: [Permission.VIEW, Permission.LIST, Permission.CREATE, Permission.UPDATE],
    [Module.REPORTS]: [Permission.VIEW, Permission.LIST],
    [Module.SUPPLIERS]: [],
    [Module.CATEGORIES]: [Permission.VIEW, Permission.LIST],
    [Module.USERS]: [],
    [Module.STORE_CONFIG]: [],
    [Module.LOYALTY]: [Permission.VIEW],
  },
  SUPERADMIN: {
    [Module.PRODUCTS]: [Permission.MANAGE],
    [Module.INVENTORY]: [Permission.MANAGE],
    [Module.SALES]: [Permission.MANAGE],
    [Module.CUSTOMERS]: [Permission.MANAGE],
    [Module.REPORTS]: [Permission.MANAGE],
    [Module.SUPPLIERS]: [Permission.MANAGE],
    [Module.CATEGORIES]: [Permission.MANAGE],
    [Module.USERS]: [Permission.MANAGE],
    [Module.STORE_CONFIG]: [Permission.MANAGE],
    [Module.LOYALTY]: [Permission.MANAGE],
  },
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: UserRole,
  module: Module,
  permission: Permission
): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role as RoleKey]
  if (!rolePermissions) return false
  const modulePermissions = rolePermissions[module] || []

  // If role has MANAGE permission, grant all permissions
  if (modulePermissions.includes(Permission.MANAGE)) {
    return true
  }

  // Check if role has the specific permission
  return modulePermissions.includes(permission)
}

/**
 * Check if a role has permission using permission string format
 * Example: hasPermissionString('ADMIN', 'products:create')
 */
export function hasPermissionString(
  role: UserRole,
  permissionString: PermissionString
): boolean {
  const [moduleStr, permissionStr] = permissionString.split(':') as [string, string]
  const moduleEnum = moduleStr as Module
  const permission = permissionStr as Permission

  return hasPermission(role, moduleEnum, permission)
}

/**
 * Get all permissions for a role in a specific module
 */
export function getModulePermissions(
  role: UserRole,
  module: Module
): Permission[] {
  const rolePermissions = ROLE_PERMISSIONS[role as RoleKey]
  if (!rolePermissions) return []
  return rolePermissions[module] || []
}

/**
 * Get all permissions for a role across all modules
 */
export function getRolePermissions(role: UserRole): RolePermissions {
  const permissions = ROLE_PERMISSIONS[role as RoleKey]
  if (!permissions) {
    return {} as RolePermissions
  }
  return permissions
}

/**
 * Check if role can perform any action in a module
 */
export function canAccessModule(role: UserRole, module: Module): boolean {
  const permissions = getModulePermissions(role, module)
  return permissions.length > 0 || permissions.includes(Permission.MANAGE)
}

