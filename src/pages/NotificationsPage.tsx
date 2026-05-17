import { useEffect, useState } from 'react'
import { getNotifications, markAllRead } from '../api/notifications'
import { Bell, CheckCheck } from 'lucide-react'
import type { Notification } from '../types'

const typeIcon: Record<string, string> = {
  leave_applied: '📋', leave_approved: '✅', leave_rejected: '❌',
  leave_cancelled: '🚫', replacement_needed: '🔄', replacement_assigned: '👤',
  timesheet_submitted: '📊', timesheet_approved: '✔️', balance_expiry: '⚠️', announcement: '📢',
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getNotifications()
      setNotifs(data.data ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Notifications'
    load()
  }, [])

  const handleMarkAll = async () => {
    await markAllRead()
    load()
  }

  return (
    <div className="max-w-2xl space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{notifs.filter(n => !n.is_read).length} unread</p>
        <button
          onClick={handleMarkAll}
          className="flex items-center gap-2 text-sm text-emerald-600 font-medium hover:underline"
        >
          <CheckCheck size={16} /> Mark all read
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifs.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No notifications yet</p>
          </div>
        ) : (
          notifs.map(n => (
            <div
              key={n.id}
              className={`flex gap-4 px-5 py-4 border-b border-slate-100 last:border-0 transition-colors ${!n.is_read ? 'bg-emerald-50/50' : ''}`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl flex-shrink-0">
                {typeIcon[n.type] ?? '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium text-slate-900 ${!n.is_read ? 'font-semibold' : ''}`}>{n.title}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400 whitespace-nowrap">{new Date(n.created_at).toLocaleDateString()}</span>
                    {!n.is_read && <span className="w-2 h-2 bg-emerald-500 rounded-full" />}
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
