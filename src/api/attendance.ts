import client from './client'

export const getTodayAttendance = () => client.get('/attendance/today/')
export const clockIn = (lat?: number, lng?: number) => client.post('/attendance/clock-in/', { latitude: lat, longitude: lng })
export const clockOut = () => client.post('/attendance/clock-out/', {})
export const getAttendanceHistory = (params?: any) => client.get('/attendance/', { params })
