import client from './client'
import type { ApiResponse, User } from '../types'

export const login = (email: string, password: string) =>
  client.post<{ refresh: string; access: string; user: User }>('/auth/login/', { email, password })

export const logout = (refresh: string) =>
  client.post('/auth/logout/', { refresh })

export const getMe = () =>
  client.get<ApiResponse<User>>('/auth/me/')

export const changePassword = (old_password: string, new_password: string, confirm_password: string) =>
  client.post('/auth/change-password/', { old_password, new_password, confirm_password })
