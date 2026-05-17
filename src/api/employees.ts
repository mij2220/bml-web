import client from './client'
import type { ApiResponse, Employee } from '../types'

export const getEmployees = (params?: Record<string, string>) =>
  client.get<ApiResponse<Employee[]>>('/employees/', { params })

export const getMyProfile = () =>
  client.get<ApiResponse<Employee>>('/employees/me/')

export const getEmployee = (id: string) =>
  client.get<ApiResponse<Employee>>(`/employees/${id}/`)

export const getDepartments = () =>
  client.get('/departments/')

export const getDesignations = (departmentId?: string) =>
  client.get('/designations/', { params: departmentId ? { department: departmentId } : {} })

export const getBranches = () =>
  client.get('/branches/')
