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
import NotificationsPage from './pages/NotificationsPage'
import TeamPage from './pages/team/TeamPage'
import EmployeesPage from './pages/admin/EmployeesPage'
import LeaveTypesPage from './pages/admin/LeaveTypesPage'
import ReportsPage from './pages/admin/ReportsPage'
import DepartmentsPage from './pages/admin/DepartmentsPage'

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
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="my-leaves" element={<MyLeavesPage />} />
        <Route path="apply-leave" element={<ApplyLeavePage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="clock" element={<ClockPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="leave-types" element={<LeaveTypesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
