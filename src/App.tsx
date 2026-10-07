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
const OPERATOR_PATHS = ['/leave-balance', '/my-leaves', '/apply-leave', '/replacements', '/notifications', '/settings']
const ROTA_PATHS = ['/calendar', '/approved-leaves', '/leave-balance', '/my-leaves', '/apply-leave', '/replacements', '/notifications', '/settings']
// A shared login belongs to no single person, so it cannot apply for leave
const SHARED_LOGIN_BLOCKED = ['/leave-balance', '/my-leaves', '/apply-leave']

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

function RoleGate({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  const { pathname } = useLocation()
  if (pathname === '/') return <>{children}</>
  const allowed = user?.role === 'employee' ? OPERATOR_PATHS
    : user?.role === 'rota_manager' ? ROTA_PATHS
    : null
  if (allowed && !under(pathname, allowed)) return <Navigate to={homePathFor(user?.role)} replace />
  if (user?.is_shared_account && user.role === 'manager' && under(pathname, SHARED_LOGIN_BLOCKED)) {
    return <Navigate to={homePathFor(user.role)} replace />
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
        <Route path="*"                element={<Home />} />
      </Route>
    </Routes>
  )
}
