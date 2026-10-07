import client from './client'
import type { ApiResponse, CalendarLeave, LeaveApplication, LeaveBalance, LeaveType, TeamDashboard } from '../types'

/** Name and P.No. typed by the person acting from a shared login. */
export interface Signature { signer_name?: string; signer_p_number?: string }

export const getLeaveTypes = () =>
  client.get<ApiResponse<LeaveType[]>>('/leave-types/')

export const getMyLeaves = (params?: Record<string, string>) =>
  client.get<ApiResponse<LeaveApplication[]>>('/leaves/', { params })

export const getLeaveDetail = (id: string) =>
  client.get<ApiResponse<LeaveApplication>>(`/leaves/${id}/`)

export const applyLeave = (data: {
  leave_type_id: string
  start_date: string
  end_date: string
  reason: string
  is_half_day?: boolean
}) => client.post<ApiResponse<LeaveApplication>>('/leaves/', data)

export const cancelLeave = (id: string, reason?: string) =>
  client.post(`/leaves/${id}/cancel/`, reason ? { reason } : {})

export const approveLeave = (id: string, comment: string, signature: Signature = {}) =>
  client.post(`/leaves/${id}/approve/`, { comment, ...signature })

export const rejectLeave = (id: string, comment: string, signature: Signature = {}) =>
  client.post(`/leaves/${id}/reject/`, { comment, ...signature })

/** Send the application back to the employee with remarks (they correct it and resubmit). */
export const returnLeave = (id: string, comment: string, signature: Signature = {}) =>
  client.post(`/leaves/${id}/return/`, { comment, ...signature })

export const getPendingApprovals = () =>
  client.get<ApiResponse<LeaveApplication[]>>('/leaves/pending-approvals/')

export const getTeamCalendar = (month: string, includePending = false) =>
  client.get<ApiResponse<CalendarLeave[]>>('/leaves/calendar/', {
    params: includePending ? { month, include_pending: 'true' } : { month },
  })

/** Employee Leave Dashboard for the Shift Supervisor / SIC */
export const getTeamDashboard = (params?: Record<string, string>) =>
  client.get<ApiResponse<TeamDashboard>>('/leaves/team-dashboard/', { params })

export const getMeBalances = (year?: number) =>
  client.get<ApiResponse<LeaveBalance[]>>('/employees/me/balances/', {
    params: year ? { year } : {}
  })

export const getMyBalances = (employeeId: string, year?: number) =>
  client.get<ApiResponse<LeaveBalance[]>>(`/employees/${employeeId}/balances/`, {
    params: year ? { year } : {}
  })

/** Employee edits their own application; on a returned application this also resubmits it. */
export const updateLeave = (id: string, data: Record<string, unknown>) =>
  client.patch<ApiResponse<LeaveApplication>>(`/leaves/${id}/`, data)
