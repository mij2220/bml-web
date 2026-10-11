import { useAuthStore } from '../store/authStore'
import type { ModuleAccess, ModuleKey } from '../types'

/** Which module a path belongs to. Leave keeps its original addresses. */
export const ADMIN_PATHS = ['/employees', '/org-chart', '/departments', '/leave-types', '/quota-management',
  '/reports', '/audit-log', '/admin']
export function moduleOfPath(pathname: string): ModuleKey {
  const p = pathname.toLowerCase()
  if (p.startsWith('/attendance')) return 'attendance'
  if (p.startsWith('/overtime')) return 'overtime'
  if (ADMIN_PATHS.some(a => p === a || p.startsWith(a + '/'))) return 'admin'
  return 'leave'
}

export const MODULE_LABEL: Record<ModuleKey, string> = {
  leave: 'Leave', attendance: 'Attendance', overtime: 'Overtime', admin: 'Admin',
}
export const MODULE_HOME: Record<Exclude<ModuleKey, 'leave'>, string> = {
  attendance: '/attendance', overtime: '/overtime', admin: '/employees',
}

export function useModules() {
  const user = useAuthStore(s => s.user)
  const isAdmin = ['hr_admin', 'super_admin'].includes(user?.role ?? '')
  // Older sessions (signed in before modules existed) only know Leave, plus Admin for admins.
  const list: ModuleAccess[] = user?.modules ?? [
    { key: 'leave', level: isAdmin ? 'all' : 'own', roles: [] },
    ...(isAdmin ? [{ key: 'admin' as ModuleKey, level: 'all' as const, roles: [] }] : []),
  ]
  const get = (k: ModuleKey) => list.find(m => m.key === k)
  const has = (k: ModuleKey) => !!get(k)
  /** Person holds any of these roles in the module (Admin holds all). */
  const hasRole = (k: ModuleKey, roles: string[]) =>
    isAdmin || !!get(k)?.roles.some(r => roles.includes(r.role))
  return { modules: list, get, has, hasRole, isAdmin }
}
