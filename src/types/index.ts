export interface User {
  id: number
  email: string
  role: 'employee' | 'manager' | 'hr_admin' | 'super_admin'
  full_name: string
  employee_id: string | null
  department: string | null
  must_change_password: boolean
}

export interface Employee {
  id: string
  employee_id: string
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
  leave_type_id: string
  leave_type_name: string
  leave_type_code: string
  year: number
  allocated: string
  used: string
  carried_over: string
  available: string
}

export interface LeaveApplication {
  id: string
  reference_number: string
  employee_name: string
  employee_id_code: string
  department: string
  leave_type_name: string
  leave_type_code: string
  leave_type_color: string
  start_date: string
  end_date: string
  total_days: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  is_half_day: boolean
  applied_at: string
  current_approval_level: number
  reason?: string
  approvals?: Approval[]
}

export interface Approval {
  id: string
  level: number
  action: string
  comment: string
  actioned_at: string
  approver_name: string
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
