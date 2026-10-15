import { Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { homePathFor } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import MyLeavesPage from './pages/leaves/MyLeavesPage'
import ApplyLeavePage from './pages/leaves/ApplyLeavePage'
import ApprovalsPage from './pages/leaves/ApprovalsPage'
import CalendarPage from './pages/leaves/CalendarPage'
import LeaveBalancePage from './pages/leaves/LeaveBalancePage'
import TeamLeaveDashboardPage from './pages/leaves/TeamLeaveDashboardPage'
import ApprovedLeavesPage from './pages/leaves/ApprovedLeavesPage'
import ClockPage from './pages/attendance/ClockPage'
import TimesheetPage from './pages/attendance/TimesheetPage'
import ReplacementsPage from './pages/replacements/ReplacementsPage'
import NotificationsPage from './pages/NotificationsPage'
import SettingsPage from './pages/SettingsPage'
import TeamPage from './pages/team/TeamPage'
import EmployeesPage from './pages/admin/EmployeesPage'
import EmployeeProfilePage from './pages/admin/EmployeeProfilePage'
import LeaveTypesPage from './pages/admin/LeaveTypesPage'
import GazettedHolidaysLeavePage from './pages/admin/GazettedHolidaysLeavePage'
import ReportsPage from './pages/admin/ReportsPage'
import DepartmentsPage from './pages/admin/DepartmentsPage'
import OrgChartPage from './pages/admin/OrgChartPage'
import HolidayCalendarPage from './pages/admin/HolidayCalendarPage'
import ShiftsPage from './pages/admin/ShiftsPage'
import BranchesPage from './pages/admin/BranchesPage'
import ProjectsPage from './pages/admin/ProjectsPage'
import AnnouncementsPage from './pages/admin/AnnouncementsPage'
import AuditLogPage from './pages/admin/AuditLogPage'
import QuotaManagementPage from './pages/admin/QuotaManagementPage'
import TeamBalancePage from './pages/admin/TeamBalancePage'
import BillingPage from './pages/admin/BillingPage'
import AttendanceCorrectionPage from './pages/attendance/AttendanceCorrectionPage'
import DailySheetPage from './pages/attendance/DailySheetPage'
import SheetsPage from './pages/attendance/SheetsPage'
import RosterPage from './pages/attendance/RosterPage'
import CorrectionsPage from './pages/attendance/CorrectionsPage'
import MyAttendancePage from './pages/attendance/MyAttendancePage'
import PrintSheetPage from './pages/attendance/PrintSheetPage'
import StatementPage from './pages/overtime/StatementPage'
import MyOvertimePage from './pages/overtime/MyOvertimePage'
import ShiftSectionsPage from './pages/admin/ShiftSectionsPage'
import SectionSetupPage from './pages/admin/SectionSetupPage'
import AccessPage from './pages/admin/AccessPage'
import GazettedHolidaysPage from './pages/admin/GazettedHolidaysPage'
import ModuleSettingsPage from './pages/admin/ModuleSettingsPage'
import { useModules, moduleOfPath } from './hooks/useModules'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

/** Each role lands on its own first screen. */
function Home() {
  const role = useAuthStore(s => s.user?.role)
  return <Navigate to={homePathFor(role)} replace />
}

// Role-wise screens (client's list). Operators and the Rota Manager only get
// their own screens; typing another address brings them back to their first
// screen. Supervisor / SIC and Admin keep access to everything they had.
// This only tidies the web app — the server enforces the real permissions.
const OPERATOR_PATHS = ['/leave-balance', '/my-leaves', '/apply-leave', '/notifications', '/settings']
const ROTA_PATHS = ['/calendar', '/approved-leaves', '/leave-balance', '/my-leaves', '/apply-leave', '/replacements', '/notifications', '/settings']
// Supervisors and SICs (and shared logins) only manage their teams' approvals
// (Engro, 13 Oct 2026): no personal leave screens, dashboard, replacements or clock.
// Admin does not use Leave for himself either (Engro, 14 Oct 2026).
const APPROVER_ROLES = ['manager', 'hr_admin', 'super_admin']
const APPROVER_BLOCKED = ['/leave-balance', '/my-leaves', '/apply-leave', '/dashboard', '/replacements', '/clock']

// The router matches addresses without regard to capital letters, so this must too
const under = (pathname: string, paths: string[]) => {
  const path = pathname.toLowerCase()
  return paths.some(p => path === p || path.startsWith(p + '/'))
}

/** "Apply" and "edit an application" are the same form. Giving each its own key
 *  makes React start a fresh form when the person moves from one to the other,
 *  so details of an application being edited can never leak into a new one. */
function ApplyLeaveRoute() {
  const [params] = useSearchParams()
  return <ApplyLeavePage key={params.get('edit') ?? 'new'} />
}

/** /attendance and /overtime open the person's first screen in that module. */
function ModuleHome({ module }: { module: 'attendance' | 'overtime' }) {
  const { get } = useModules()
  const m = get(module)
  const team = !!m && m.level !== 'own'
  if (module === 'attendance') return <Navigate to={team ? '/attendance/sheet' : '/attendance/my'} replace />
  return <Navigate to={team ? '/overtime/statement' : '/overtime/my'} replace />
}

function RoleGate({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  const { pathname } = useLocation()
  const { has, get, isAdmin: isAdminUser } = useModules()
  if (pathname === '/') return <>{children}</>
  // Attendance, Overtime and Admin tabs: only for people who have that module.
  // (The server refuses the data as well; this only keeps the web app tidy.)
  const mod = moduleOfPath(pathname, isAdminUser)
  if (mod !== 'leave') {
    if (!has(mod)) return <Navigate to={homePathFor(user?.role)} replace />
    // Team screens need a role in the module; members alone get their own screens
    const p = pathname.toLowerCase()
    const own = get(mod)?.level === 'own'
    if (own && mod === 'attendance' && !p.startsWith('/attendance/my') && p !== '/attendance') return <Navigate to="/attendance/my" replace />
    if (own && mod === 'overtime' && !p.startsWith('/overtime/my') && p !== '/overtime') return <Navigate to="/overtime/my" replace />
    return <>{children}</>
  }
  const allowed = user?.role === 'employee' ? OPERATOR_PATHS
    : user?.role === 'rota_manager' ? ROTA_PATHS
    : null
  if (allowed && !under(pathname, allowed)) return <Navigate to={homePathFor(user?.role)} replace />
  if (APPROVER_ROLES.includes(user?.role ?? '') && under(pathname, APPROVER_BLOCKED)) {
    return <Navigate to={homePathFor(user?.role)} replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><RoleGate><Layout /></RoleGate></RequireAuth>}>
        <Route index element={<Home />} />
        <Route path="dashboard"        element={<DashboardPage />} />
        <Route path="my-leaves"        element={<MyLeavesPage />} />
        <Route path="apply-leave"      element={<ApplyLeaveRoute />} />
        <Route path="approvals"        element={<ApprovalsPage />} />
        <Route path="calendar"         element={<CalendarPage />} />
        <Route path="leave-balance"    element={<LeaveBalancePage />} />
        <Route path="team-leave"       element={<TeamLeaveDashboardPage />} />
        <Route path="approved-leaves"  element={<ApprovedLeavesPage />} />
        <Route path="clock"            element={<ClockPage />} />
        <Route path="timesheets"       element={<TimesheetPage />} />
        <Route path="replacements"     element={<ReplacementsPage />} />
        <Route path="notifications"    element={<NotificationsPage />} />
        <Route path="settings"         element={<SettingsPage />} />
        <Route path="team"             element={<TeamPage />} />
        <Route path="employees"        element={<EmployeesPage />} />
        <Route path="employees/:id"    element={<EmployeeProfilePage />} />
        <Route path="leave-types"      element={<LeaveTypesPage />} />
        <Route path="gazetted-holidays" element={<GazettedHolidaysLeavePage />} />
        <Route path="reports"          element={<ReportsPage />} />
        <Route path="departments"      element={<DepartmentsPage />} />
        <Route path="org-chart"        element={<OrgChartPage />} />
        <Route path="holiday-calendar" element={<HolidayCalendarPage />} />
        <Route path="shifts"           element={<ShiftsPage />} />
        <Route path="branches"         element={<BranchesPage />} />
        <Route path="quota-management"  element={<QuotaManagementPage />} />
        <Route path="team-balances"      element={<TeamBalancePage />} />
        <Route path="attendance-correction" element={<AttendanceCorrectionPage />} />
        <Route path="projects"         element={<ProjectsPage />} />
        <Route path="announcements"    element={<AnnouncementsPage />} />
        <Route path="audit-log"        element={<AuditLogPage />} />
        <Route path="billing"          element={<BillingPage />} />
        <Route path="attendance"             element={<ModuleHome module="attendance" />} />
        <Route path="attendance/my"          element={<MyAttendancePage />} />
        <Route path="attendance/sheet"       element={<DailySheetPage />} />
        <Route path="attendance/days"        element={<SheetsPage />} />
        <Route path="attendance/roster"      element={<RosterPage />} />
        <Route path="attendance/corrections" element={<CorrectionsPage />} />
        <Route path="attendance/monthly"     element={<StatementPage mode="attendance" key="att" />} />
        <Route path="attendance/print"       element={<PrintSheetPage />} />
        <Route path="overtime"               element={<ModuleHome module="overtime" />} />
        <Route path="overtime/my"            element={<MyOvertimePage />} />
        <Route path="overtime/statement"     element={<StatementPage mode="overtime" key="ot" />} />
        <Route path="admin"                  element={<Navigate to="/employees" replace />} />
        <Route path="admin/sections"         element={<ShiftSectionsPage />} />
        <Route path="admin/sections/:id"     element={<SectionSetupPage />} />
        <Route path="admin/access"           element={<AccessPage />} />
        <Route path="admin/holidays"         element={<GazettedHolidaysPage />} />
        <Route path="admin/module-settings"  element={<ModuleSettingsPage />} />
        <Route path="*"                element={<Home />} />
      </Route>
    </Routes>
  )
}
