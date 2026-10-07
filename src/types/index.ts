export interface User {
  id: number
  email: string
  role: 'employee' | 'manager' | 'hr_admin' | 'super_admin' | 'rota_manager'
  full_name: string
  employee_id: string
  p_number?: string | null
  department: string | null
  designation_name?: string | null
  must_change_password: boolean
  /** A login used by several people (e.g. the Shift Engineers' common ID).
   *  Approvals made from it must be signed with the person's own name and P.No. */
  is_shared_account?: boolean
}

export interface Employee {
  id: string
  employee_id: string
  p_number?: string
  full_name: string
  email: string
  role: string
  department_name: string
  designation_name: string
  manager_name: string | null
  status: string
  employment_type: string
  profile_picture: string | null
}

export interface LeaveType {
  id: string
  name: string
  code: string
  color: string
  is_paid: boolean
  allow_half_day: boolean
  allow_hourly: boolean
  approval_levels: number
}

export interface LeaveBalance {
  // From /employees/{id}/balances/
  leave_type_id?: string
  leave_type_name: string
  leave_type_code: string
  year: number
  allocated?: string
  used?: string
  carried_over?: string
  available?: string
  // From /employees/me/balances/ (includes splits)
  leave_type?: string
  leave_type_color?: string
  remaining_days?: string
  allocated_days?: string
  used_days?: string
  splits_used?: number
  splits_allowed?: number
}

export interface LeaveApplication {
  id: string
  reference_number: string
  employee_name: string
  employee_id_code?: string
  department?: string
  leave_type_name: string
  leave_type_code?: string
  leave_type_color: string
  start_date: string
  end_date: string
  total_days: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'returned'
  is_half_day: boolean
  applied_at: string
  current_approval_level: number
  reason?: string
  contact_during_leave?: string
  address_during_leave?: string
  duty_date_for_cd?: string
  approvals?: Approval[]
  // Stage-wise status (added next to `status`)
  /** pending_supervisor | pending_sic | approved | rejected | returned | cancelled | expired */
  stage?: string
  stage_label?: string
  /** Remarks from the Supervisor / SIC when the application was returned */
  returned_remark?: string
  returned_by?: string
  /** Who the application is waiting for (detail only) */
  waiting_for?: string
  department_name?: string
  employee_p_number?: string | null
  leave_type?: string
  half_day_period?: string | null
  permissions?: LeavePermissions
}

/** What the signed-in person may do with an application right now (decided by the server). */
export interface LeavePermissions {
  can_edit: boolean
  can_cancel: boolean
  can_act: boolean
  cancel_deadline: string | null
  cancel_blocked_reason: string
}

export interface Approval {
  id: string
  level: number
  action: string
  comment: string
  actioned_at: string
  approver_name: string
  signer_name?: string
  signer_p_number?: string
  /** Who actually took the action (typed name + P.No. on a shared login) */
  signed_by?: string
  /** True for rows from before a return + resubmission: history only */
  is_superseded?: boolean
}

export interface CalendarLeave {
  id: string
  employee_name: string
  employee_id_code?: string
  department?: string | null
  designation?: string | null
  leave_type_name: string
  leave_type_code?: string
  leave_type_color: string
  start_date: string
  end_date: string
  total_days: string
  status: string
  stage?: string
  stage_label?: string
}

export interface TeamDashboardLeaveRef {
  id: string
  reference_number: string
  leave_type_code: string
  leave_type_name: string
  start_date: string
  end_date: string
  total_days: number
}

export interface TeamDashboardRow {
  id: string
  employee_id: string
  p_number: string | null
  full_name: string
  department: string | null
  designation: string | null
  total_availed: number
  al_availed: number
  bd_availed: number
  other_availed: number
  other_breakdown: { code: string; name: string; used: number }[]
  total_balance: number
  balances: {
    code: string; name: string; color: string
    allocated: number; used: number; available: number
    splits_used: number; splits_allowed: number
  }[]
  current_status: 'on_leave' | 'upcoming' | 'available'
  on_leave_now: TeamDashboardLeaveRef | null
  upcoming_leave: TeamDashboardLeaveRef | null
  pending_requests: number
}

export interface TeamDashboard {
  year: number
  today: string
  is_admin_view: boolean
  leave_types: { code: string; name: string; color: string }[]
  employees: TeamDashboardRow[]
}

export interface Notification {
  id: string
  type: string
  title: string
  body: string
  is_read: boolean
  action_url: string
  created_at: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
  errors: Record<string, string[]> | null
  pagination?: {
    count: number
    next: string | null
    previous: string | null
    page_size: number
    total_pages: number
    current_page: number
  }
}
