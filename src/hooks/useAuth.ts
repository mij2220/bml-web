import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const { user, isAuthenticated, clearAuth } = useAuthStore()

  const isEmployee = user?.role === 'employee'
  const isManager = ['manager', 'hr_admin', 'super_admin'].includes(user?.role ?? '')
  const isHR = ['hr_admin', 'super_admin'].includes(user?.role ?? '')
  const isSuperAdmin = user?.role === 'super_admin'
  // Role-wise screens
  /** Operator / NMPT employee: Leave Balance, My Applications, Apply Leave */
  const isOperator = user?.role === 'employee'
  /** Shift Supervisor / Shift Engineer / SIC (approver, not Admin) */
  const isApprover = user?.role === 'manager'
  /** NMPT Rota Manager: read-only picture of one unit, no approval authority */
  const isRota = user?.role === 'rota_manager'
  /** Login shared by several people: every approval is signed with name + P.No. */
  const isSharedAccount = !!user?.is_shared_account

  return {
    user, isAuthenticated, isEmployee, isManager, isHR, isSuperAdmin,
    isOperator, isApprover, isRota, isSharedAccount, clearAuth,
  }
}

/** Where each role lands after signing in. */
export function homePathFor(role?: string | null): string {
  if (role === 'employee') return '/leave-balance'
  if (role === 'manager') return '/approvals'
  if (role === 'rota_manager') return '/calendar'
  return '/dashboard'
}
