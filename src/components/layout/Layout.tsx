import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../store/authStore'
import { logout, getMe } from '../../api/auth'
import { getNotificationCount } from '../../api/notifications'
import { useModules, moduleOfPath, MODULE_LABEL, MODULE_HOME } from '../../hooks/useModules'
import { homePathFor } from '../../hooks/useAuth'
import {
  LayoutDashboard, CalendarDays, FileText, Users,
  Settings, LogOut, Bell, Menu, X, ClipboardList,
  BarChart3, Building2, BookOpen, RefreshCw,
  Timer, Megaphone, ScrollText, CreditCard,
  Trees, FolderOpen, Building, Wallet, CalendarCheck,
  ClipboardCheck, CalendarRange, FileWarning, Sheet, UserCheck, Hourglass, ShieldCheck, Sliders, Flag, Layers
} from 'lucide-react'

export default function Layout() {
  const { user, isHR, isOperator, isApprover, isRota, isSharedAccount, clearAuth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const refreshToken = useAuthStore(s => s.refreshToken)
  const updateUser = useAuthStore(s => s.updateUser)
  const { modules, get: getModule, hasRole } = useModules()
  const mod = moduleOfPath(location.pathname)
  const att = getModule('attendance')
  const ot = getModule('overtime')
  const attTeam = !!att && att.level !== 'own'
  const attWorker = hasRole('attendance', ['marker', 'reviewer', 'manager'])
  const attMonthly = hasRole('attendance', ['reviewer', 'manager', 'accounts'])
  const otTeam = !!ot && ot.level !== 'own'
  const goModule = (k: string) => navigate(k === 'leave' ? homePathFor(user?.role) : MODULE_HOME[k as 'attendance'])

  // The signed-in user is remembered in the browser from the last login.
  // Refresh it once per visit so a change made by Admin (role, shared-login
  // flag) shows up without the person having to sign out and in again.
  useEffect(() => {
    // Only apply the answer if the same person is still signed in when it arrives
    // (on a shared PC someone else may have signed in meanwhile).
    const askedWith = localStorage.getItem('bml_access')
    const askedFor = user?.id
    getMe().then(r => {
      const fresh = r.data?.data
      const current = useAuthStore.getState().user
      if (fresh?.email && fresh.id === askedFor && current?.id === askedFor
          && localStorage.getItem('bml_access') === askedWith) {
        updateUser(fresh)
      }
    }).catch(() => {})
  }, [])

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

  // Module tabs: only the modules this person has (none shown when there is just one)
  const ModuleTabs = () => (
    <div className="flex gap-1.5" role="tablist" aria-label="Modules">
      {modules.map(m => (
        <button key={m.key} role="tab" aria-selected={mod === m.key} onClick={() => goModule(m.key)}
          className={`text-sm font-semibold rounded-full px-3 py-1.5 border whitespace-nowrap transition-colors ${mod === m.key ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-400'}`}>
          {MODULE_LABEL[m.key]}
        </button>
      ))}
    </div>
  )

  const alerts = { to: '/notifications', Icon: Bell, label: 'Alerts', badge: unreadCount }
  type BottomItem = { to: string; Icon: any; label: string; badge?: number }
  // Phone bottom bar: each role's own screens. Admin gets the approver's bar (Engro, 14 Oct 2026).
  const bottomNavItems: BottomItem[] = isOperator ? [
    { to: '/leave-balance', Icon: Wallet,        label: 'Balance' },
    { to: '/my-leaves',     Icon: CalendarDays,  label: 'Applications' },
    { to: '/apply-leave',   Icon: FileText,      label: 'Apply' },
    alerts,
  ] : (isApprover || isHR) ? [
    { to: '/approvals',     Icon: ClipboardList, label: 'Approvals' },
    { to: '/team-leave',    Icon: Users,         label: 'Employees' },
    { to: '/calendar',      Icon: CalendarDays,  label: 'Calendar' },
    alerts,
  ] : isRota ? [
    { to: '/calendar',        Icon: CalendarDays,  label: 'Calendar' },
    { to: '/approved-leaves', Icon: CalendarCheck, label: 'Approved' },
    { to: '/my-leaves',       Icon: FileText,      label: 'My leave' },
    alerts,
  ] : [
    { to: '/dashboard',    Icon: LayoutDashboard, label: 'Home' },
    { to: '/my-leaves',    Icon: CalendarDays,    label: 'Leaves' },
    { to: '/apply-leave',  Icon: FileText,        label: 'Apply' },
    { to: '/calendar',     Icon: CalendarDays,    label: 'Calendar' },
    alerts,
  ]

  const moduleBottom: BottomItem[] | null = mod === 'attendance' ? [
    ...(att?.member ? [{ to: '/attendance/my', Icon: UserCheck, label: 'Mine' }] : []),
    ...(attTeam ? [{ to: '/attendance/sheet', Icon: ClipboardCheck, label: 'Sheet' }, { to: '/attendance/days', Icon: CalendarRange, label: 'Days' }] : []),
    alerts,
  ] : mod === 'overtime' ? [
    ...(ot?.member ? [{ to: '/overtime/my', Icon: Hourglass, label: 'Mine' }] : []),
    ...(otTeam ? [{ to: '/overtime/statement', Icon: Sheet, label: 'Statement' }] : []),
    alerts,
  ] : mod === 'admin' ? [
    { to: '/employees', Icon: Users, label: 'Employees' },
    { to: '/admin/sections', Icon: Layers, label: 'Sections' },
    { to: '/admin/access', Icon: ShieldCheck, label: 'Access' },
    alerts,
  ] : null
  const bottomItems = moduleBottom ?? bottomNavItems

  // The three personal screens every non-shared account gets
  const myLeaveItems = (
    <>
      {navItem('/leave-balance', Wallet,       'Leave Balance')}
      {navItem('/my-leaves',     CalendarDays, 'My Applications')}
      {navItem('/apply-leave',   FileText,     'Apply Leave')}
    </>
  )

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
            Shift<span className="text-emerald-500">Ledger</span>
          </span>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="ml-auto p-1">
              <X size={18} className="text-slate-500" />
            </button>
          )}
        </div>

        {/* Nav — scrollable */}
        <nav className="flex-1 p-2 overflow-y-auto space-y-0.5">
          {mod === 'leave' && (<>

          {/* ── Operator / NMPT employee: three screens ── */}
          {isOperator && (
            <>
              {sectionLabel('My Leave')}
              {myLeaveItems}
              {/* My Replacements switched off for Operators (Engro, 13 Oct 2026) */}
            </>
          )}

          {/* ── Shift Supervisor / Shift Engineer / SIC ── */}
          {isApprover && (
            <>
              {sectionLabel('Approvals')}
              {navItem('/approvals',  ClipboardList, 'Pending Approvals')}
              {navItem('/team-leave', Users,         'Employee Leave Dashboard')}
              {/* Supervisors and SICs only manage their teams' approvals here
                  (Engro, 13 Oct 2026): no My Leave, Dashboard, My Replacements or Clock In/Out */}
              {sectionLabel('More')}
              {navItem('/calendar',      CalendarDays,    'Team Calendar')}
              {navItem('/team',          Users,           'My Team')}
              {navItem('/team-balances', BarChart3,       'Team Balances')}
              {/* Their team's employees; they adjust leave balances there (Engro, 15 Oct 2026) */}
              {navItem('/employees',     Users,           'Employees')}
            </>
          )}

          {/* ── NMPT Rota Manager: view only ── */}
          {isRota && (
            <>
              {sectionLabel('Rota')}
              {navItem('/calendar',        CalendarDays,  'Leave Calendar')}
              {navItem('/approved-leaves', CalendarCheck, 'Approved Leaves')}
              {sectionLabel('My Leave')}
              {myLeaveItems}
            </>
          )}

          {/* Any other role (none exists today): keep the personal leave screens rather than an empty menu */}
          {!isOperator && !isApprover && !isRota && !isHR && (
            <>
              {sectionLabel('My Leave')}
              {myLeaveItems}
            </>
          )}

          {/* ── Admin: does not use Leave for himself (Engro, 14 Oct 2026) —
                no Dashboard, My Leaves, Apply, My Replacements or Clock In/Out ── */}
          {isHR && (
            <>
              {sectionLabel('Approvals')}
              {navItem('/approvals',     ClipboardList, 'Pending Approvals')}
              {navItem('/team-leave',    Users,         'Employee Leave Dashboard')}
              {sectionLabel('More')}
              {navItem('/calendar',      CalendarDays,  'Team Calendar')}
              {navItem('/team',          Users,         'My Team')}
              {navItem('/team-balances', BarChart3,     'Team Balances')}
            </>
          )}

          </>)}

          {/* ── Attendance module ── */}
          {mod === 'attendance' && (
            <>
              {att?.member && (<>{sectionLabel('My attendance')}{navItem('/attendance/my', UserCheck, 'My attendance')}</>)}
              {attTeam && (
                <>
                  {sectionLabel('Shift attendance')}
                  {navItem('/attendance/sheet', ClipboardCheck, 'Daily sheet')}
                  {navItem('/attendance/days', CalendarRange, 'Days')}
                  {navItem('/attendance/roster', CalendarDays, 'Roster')}
                  {attWorker && navItem('/attendance/corrections', FileWarning, 'Corrections')}
                  {attMonthly && navItem('/attendance/monthly', BarChart3, 'Monthly hours')}
                </>
              )}
            </>
          )}

          {/* ── Overtime module ── */}
          {mod === 'overtime' && (
            <>
              {ot?.member && (<>{sectionLabel('My overtime')}{navItem('/overtime/my', Hourglass, 'My overtime')}</>)}
              {otTeam && (<>{sectionLabel('Overtime')}{navItem('/overtime/statement', Sheet, 'Overtime statement')}</>)}
            </>
          )}

          {/* ── Admin: settings shared by all modules ── */}
          {mod === 'admin' && isHR && (
            <>
              {sectionLabel('Organisation')}
              {navItem('/employees',         Users,       'Employees')}
              {navItem('/org-chart',         Trees,       'Org Chart')}
              {navItem('/departments',       Building2,   'Units')}
              {navItem('/admin/access',      ShieldCheck, 'Roles and access')}
              {navItem('/admin/holidays',    Flag,        'Gazetted holidays')}
              {sectionLabel('Leave')}
              {navItem('/leave-types',       Settings,    'Leave Types')}
              {navItem('/quota-management',  Building,    'Quota Management')}
              {navItem('/reports',           BarChart3,   'Reports')}
              {sectionLabel('Attendance and overtime')}
              {navItem('/admin/sections',    Layers,      'Shift sections')}
              {navItem('/admin/module-settings', Sliders, 'Overtime rules')}
              {sectionLabel('Records')}
              {navItem('/audit-log',         ScrollText,  'Audit Log')}
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
              <p className="text-xs text-slate-500 capitalize">{user?.role === 'hr_admin' ? 'Admin' : ((user as any)?.designation_name || user?.role?.replace('_', ' '))}{isSharedAccount ? ' · shared login' : ''}</p>
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
          {!isMobile && modules.length > 1 && <ModuleTabs />}
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
                <p className="text-xs text-slate-500 mt-0.5 capitalize">{user?.role === 'hr_admin' ? 'Admin' : ((user as any)?.designation_name || user?.role?.replace('_', ' '))}{isSharedAccount ? ' · shared login' : ''}</p>
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

        {isMobile && modules.length > 1 && (
          <div className="bg-white border-b border-slate-200 px-2 py-1.5 overflow-x-auto flex-shrink-0"><ModuleTabs /></div>
        )}

        {/* Page */}
        <main className={`flex-1 overflow-auto p-4 md:p-6 ${isMobile ? 'pb-20' : ''}`}>
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center z-30"
               style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {bottomItems.map(({ to, Icon, label, badge }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${isActive ? 'text-emerald-500' : 'text-slate-400'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative">
                      <Icon size={19} className={isActive ? 'text-emerald-500' : 'text-slate-400'} />
                      {!!badge && badge > 0 && (
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
