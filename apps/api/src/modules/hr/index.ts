/**
 * Hr Module
 *
 * Handles: employees, departments, positions, roles, permissions,
 * work shifts, schedules, time entries, attendance, payroll, holidays.
 * Requires hr module access via tenant context.
 */
export { registerRoutes } from '../../controllers/v1/hr.controller.js'
