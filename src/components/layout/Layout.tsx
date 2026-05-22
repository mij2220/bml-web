import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../store/authStore'
import { logout } from '../../api/auth'
import { getNotificationCount } from '../../api/notifications'
import {
  LayoutDashboard, CalendarDays, Clock, FileText, Users,
  Settings, LogOut, Bell, Menu, X, ClipboardList,
  BarChart3, Building2, BookOpen, RefreshCw, UserCircle,
  Globe, Timer, Layers, Megaphone, ScrollText, CreditCard,
  Trees, FolderOpen, Building
} from 'lucide-react'

export default function Layout() {
  const { user, isManager, isHR, clearAuth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const refreshToken = useAuthStore(s => s.refreshToken)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

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
        `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
          isActive
            ? 'bg-emerald-500 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`
      }
    >
      <Icon size={17} className="flex-shrink-0" />
      <span>{label}</span>
    </NavLink>
  )

  const sectionLabel = (label: string) => (
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2 mt-3 first:mt-0">
      {label}
    </p>
  )

  const bottomNavItems = [
    { to: '/dashboard',    Icon: LayoutDashboard, label: 'Home' },
    { to: '/my-leaves',    Icon: CalendarDays,    label: 'Leaves' },
    { to: '/apply-leave',  Icon: FileText,        label: 'Apply' },
    { to: '/clock',        Icon: Clock,           label: 'Clock' },
    { to: '/notifications',Icon: Bell,            label: 'Alerts', badge: unreadCount },
  ]

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        ${isMobile
          ? `fixed top-0 left-0 h-full w-72 z-50 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
          : 'w-64 flex-shrink-0'
        } bg-white border-r border-slate-200 flex flex-col
      `}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-slate-100 gap-3 flex-shrink-0">
          <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen size={14} className="text-white" />
          </div>
          <span className="font-bold text-slate-900">
            Book<span className="text-emerald-500">My</span>Leave
          </span>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="ml-auto p-1">
              <X size={18} className="text-slate-500" />
            </button>
          )}
        </div>

        {/* Nav — scrollable */}
        <nav className="flex-1 p-2 overflow-y-auto space-y-0.5">

          {/* MY SPACE */}
          {sectionLabel('My Space')}
          {navItem('/dashboard',    LayoutDashboard, 'Dashboard')}
          {navItem('/my-leaves',    CalendarDays,    'My Leaves')}
          {navItem('/apply-leave',  FileText,        'Apply for Leave')}
          {navItem('/calendar',     CalendarDays,    'Team Calendar')}

          {/* ATTENDANCE */}
          {sectionLabel('Attendance')}
          {navItem('/clock',        Clock,           'Clock In / Out')}
          {navItem('/timesheets',   ClipboardList,   'Timesheets')}

          {/* REPLACEMENTS */}
          {sectionLabel('Replacements')}
          {navItem('/replacements', RefreshCw,       'My Replacements')}

          {/* MANAGEMENT — managers only */}
          {isManager && (
            <>
              {sectionLabel('Manager')}
              {navItem('/approvals', ClipboardList, 'Pending Approvals')}
              {navItem('/team',      Users,         'My Team')}
              {navItem('/team-balances', BarChart3,     'Team Balances')}
            </>
          )}

          {/* HR ADMIN */}
          {isHR && (
            <>
              {sectionLabel('HR Admin')}
              {navItem('/employees',         Users,       'Employees')}
              {navItem('/org-chart',         Trees,       'Org Chart')}
              {navItem('/departments',       Building2,   'Departments')}
              {navItem('/leave-types',       Settings,    'Leave Types')}
              {navItem('/holiday-calendar',  CalendarDays,'Holiday Calendar')}
              {navItem('/shifts',            Timer,       'Shifts')}
              {navItem('/branches',          Building,    'Branches')}
              {navItem('/quota-management',   Building,    'Quota Management')}
              {navItem('/projects',          FolderOpen,  'Projects')}
              {navItem('/announcements',     Megaphone,   'Announcements')}
              {navItem('/reports',           BarChart3,   'Reports')}
              {navItem('/audit-log',         ScrollText,  'Audit Log')}
              {navItem('/billing',           CreditCard,  'Billing')}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
              {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                title="Settings"
              >
                <Settings size={15} />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 flex-shrink-0">
          {isMobile && (
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
              <Menu size={20} />
            </button>
          )}
          <h1 className="flex-1 text-base font-semibold text-slate-900 truncate" id="page-title">Dashboard</h1>
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {!isMobile && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm">
                {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-slate-900 leading-none">{user?.full_name}</p>
                <p className="text-xs text-slate-500 mt-0.5 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              <button onClick={() => navigate('/settings')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Settings">
                <Settings size={17} />
              </button>
              <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Logout">
                <LogOut size={17} />
              </button>
            </div>
          )}
        </header>

        {/* Page */}
        <main className={`flex-1 overflow-auto p-4 md:p-6 ${isMobile ? 'pb-20' : ''}`}>
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center z-30"
               style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {bottomNavItems.map(({ to, Icon, label, badge }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${isActive ? 'text-emerald-500' : 'text-slate-400'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative">
                      <Icon size={19} className={isActive ? 'text-emerald-500' : 'text-slate-400'} />
                      {badge && badge > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </div>
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
            <button onClick={() => setSidebarOpen(true)}
              className="flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium text-slate-400">
              <Menu size={19} />
              <span>More</span>
            </button>
          </nav>
        )}
      </div>
    </div>
  )
}
