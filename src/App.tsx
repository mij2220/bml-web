import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import MyLeavesPage from './pages/leaves/MyLeavesPage'
import ApplyLeavePage from './pages/leaves/ApplyLeavePage'
import ApprovalsPage from './pages/leaves/ApprovalsPage'
import CalendarPage from './pages/leaves/CalendarPage'
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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"        element={<DashboardPage />} />
        <Route path="my-leaves"        element={<MyLeavesPage />} />
        <Route path="apply-leave"      element={<ApplyLeavePage />} />
        <Route path="approvals"        element={<ApprovalsPage />} />
        <Route path="calendar"         element={<CalendarPage />} />
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
        <Route path="*"                element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
