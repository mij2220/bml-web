import client from './client'
import type { ApiResponse, LeaveApplication, LeaveBalance, LeaveType } from '../types'

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

export const cancelLeave = (id: string) =>
  client.post(`/leaves/${id}/cancel/`)

export const approveLeave = (id: string, comment: string) =>
  client.post(`/leaves/${id}/approve/`, { comment })

export const rejectLeave = (id: string, comment: string) =>
  client.post(`/leaves/${id}/reject/`, { comment })

export const getPendingApprovals = () =>
  client.get<ApiResponse<LeaveApplication[]>>('/leaves/pending-approvals/')

export const getTeamCalendar = (month: string) =>
  client.get<ApiResponse<LeaveApplication[]>>('/leaves/calendar/', { params: { month } })

export const getMyBalances = (employeeId: string, year?: number) =>
  client.get<ApiResponse<LeaveBalance[]>>(`/employees/${employeeId}/balances/`, {
    params: year ? { year } : {}
  })

export const updateLeave = (id: string, data: any) => client.patch(`/leaves/${id}/`, data)
