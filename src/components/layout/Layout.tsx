import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../store/authStore'
import { logout } from '../../api/auth'
import { getNotificationCount } from '../../api/notifications'
import {
  LayoutDashboard, CalendarDays, Clock, FileText, Users,
  Settings, LogOut, Bell, ChevronDown, Menu, X,
  ClipboardList, BarChart3, Building2, BookOpen
} from 'lucide-react'

export default function Layout() {
  const { user, isManager, isHR, clearAuth } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const refreshToken = useAuthStore(s => s.refreshToken)

  useEffect(() => {
    getNotificationCount().then(r => setUnreadCount(r.data.data?.unread_count ?? 0)).catch(() => {})
    const iv = setInterval(() => {
      getNotificationCount().then(r => setUnreadCount(r.data.data?.unread_count ?? 0)).catch(() => {})
    }, 30000)
    return () => clearInterval(iv)
  }, [])

  const handleLogout = async () => {
    try { if (refreshToken) await logout(refreshToken) } catch {}
    clearAuth()
    navigate('/login')
  }

  const navItem = (to: string, Icon: any, label: string) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
          isActive
            ? 'bg-emerald-500 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`
      }
    >
      <Icon size={18} />
      {sidebarOpen && <span>{label}</span>}
    </NavLink>
  )

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} flex-shrink-0 bg-white border-r border-slate-200 flex flex-col transition-all duration-200`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-200 gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <span className="font-bold text-slate-900 text-lg">
              Book<span className="text-emerald-500">My</span>Leave
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {sidebarOpen && <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">My Space</p>}
          {navItem('/dashboard', LayoutDashboard, 'Dashboard')}
          {navItem('/my-leaves', CalendarDays, 'My Leaves')}
          {navItem('/apply-leave', FileText, 'Apply Leave')}
          {navItem('/clock', Clock, 'Attendance')}
          {navItem('/calendar', CalendarDays, 'Team Calendar')}

          {isManager && (
            <>
              {sidebarOpen && <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2 pt-4">Management</p>}
              {navItem('/approvals', ClipboardList, 'Pending Approvals')}
              {navItem('/team', Users, 'My Team')}
            </>
          )}

          {isHR && (
            <>
              {sidebarOpen && <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2 pt-4">HR Admin</p>}
              {navItem('/employees', Users, 'Employees')}
              {navItem('/leave-types', Settings, 'Leave Types')}
              {navItem('/reports', BarChart3, 'Reports')}
              {navItem('/departments', Building2, 'Departments')}
            </>
          )}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="m-3 p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
          <h1 className="text-lg font-semibold text-slate-900" id="page-title">Dashboard</h1>
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User menu */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm">
                {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              {sidebarOpen && (
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-900 leading-none">{user?.full_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">{user?.role?.replace('_', ' ')}</p>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
