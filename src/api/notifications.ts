import client from './client'
import type { ApiResponse, Notification } from '../types'

export const getNotifications = (params?: Record<string, string>) =>
  client.get<ApiResponse<Notification[]>>('/notifications/', { params })

export const getNotificationCount = () =>
  client.get<ApiResponse<{ unread_count: number }>>('/notifications/count/')

export const markAllRead = () =>
  client.post('/notifications/read-all/')
