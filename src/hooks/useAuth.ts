import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const { user, isAuthenticated, clearAuth } = useAuthStore()

  const isEmployee = user?.role === 'employee'
  const isManager = ['manager', 'hr_admin', 'super_admin'].includes(user?.role ?? '')
  const isHR = ['hr_admin', 'super_admin'].includes(user?.role ?? '')
  const isSuperAdmin = user?.role === 'super_admin'

  return { user, isAuthenticated, isEmployee, isManager, isHR, isSuperAdmin, clearAuth }
}
