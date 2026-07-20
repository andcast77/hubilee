# Plan: Split del schema Prisma por dominio (multi-file)

**Estado:** plan documentado; el schema productivo sigue siendo el archivo único `schema.prisma` hasta ejecutar estos pasos.

El schema actual está en un único archivo `schema.prisma`. Prisma 7 soporta múltiples archivos cuando se indica un directorio en la configuración.

## Pasos para aplicar el split

1. **Configuración**  
   En `prisma.config.ts`, cambiar:
   ```ts
   schema: 'prisma/schema.prisma'
   ```
   a:
   ```ts
   schema: 'prisma'
   ```

2. **Estructura propuesta**  
   Mantener `prisma/schema.prisma` como archivo principal (generator + datasource + **todos los enums**) y crear archivos adicionales en `prisma/`:

   - `shared.prisma`: User, Session, Company, CompanyMember, Module, CompanyModule, CompanyMemberModule, Role, Permission, RolePermission, UserRoleAssignment, UserPermission
   - `hr.prisma`: Department, Position, Employee, WorkShift, Schedule, SpecialDayAssignment, Holiday, TimeEntry, Payroll, PayrollRule, License, LicensePolicy, Document, AuditLog, IntegrationLog, Report, Translation
   - `tech.prisma`: TechnicalAsset, WorkOrder, WorkOrderPart, ServiceVisit
   - `pos.prisma`: Product, Category, Supplier, Customer, Sale, SaleItem, StoreConfig, Store, UserStore, TicketConfig, UserPreferences, InventoryTransfer, LoyaltyConfig, LoyaltyPoint, Notification, NotificationPreference, ActionHistory

3. **Contenido de `schema.prisma`**  
   Dejar en `schema.prisma` solo:
   - Bloque `generator`
   - Bloque `datasource`
   - Todos los `enum` (UserRole, MembershipRole, SaleStatus, PaymentMethod, NotificationType, NotificationPriority, NotificationStatus, SalaryType, OvertimeType, Gender, EmployeeStatus, PayrollStatus, LicenseType, LicenseStatus, TransferStatus, LoyaltyPointType, ActionType, EntityType, TicketType, WorkOrderStatus, WorkOrderPriority, ServiceVisitStatus).

4. **Validación**  
   Tras el split, ejecutar:
   ```bash
   pnpm exec prisma validate
   pnpm exec prisma generate
   ```

## Nota

Si al usar `schema: 'prisma'` aparece un error de codificación (p. ej. BOM en la primera línea), guardar `schema.prisma` en UTF-8 sin BOM.
