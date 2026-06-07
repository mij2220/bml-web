import { useEffect, useState } from 'react'
import client from '../../api/client'

interface AuditEntry {
  id: string
  action: string
  actor_name: string
  target_type: string
  target_id: string
  target_label: string
  old_value: any
  new_value: any
  created_at: string
  ip_address: string | null
}

const ACTION_COLORS: Record<string, string> = {
  leave_submitted:    'bg-blue-100 text-blue-700',
  leave_approved:     'bg-emerald-100 text-emerald-700',
  leave_rejected:     'bg-red-100 text-red-700',
  leave_cancelled:    'bg-slate-100 text-slate-600',
  leave_expired:      'bg-orange-100 text-orange-700',
  employee_created:   'bg-purple-100 text-purple-700',
  employee_updated:   'bg-yellow-100 text-yellow-700',
  employee_deactivated: 'bg-red-100 text-red-700',
  quota_recalculated: 'bg-teal-100 text-teal-700',
  balance_adjusted:   'bg-indigo-100 text-indigo-700',
  login:              'bg-slate-100 text-slate-500',
  logout:             'bg-slate-100 text-slate-500',
  password_changed:   'bg-amber-100 text-amber-700',
}

const ACTION_LABELS: Record<string, string> = {
  leave_submitted:    'Leave Submitted',
  leave_approved:     'Leave Approved',
  leave_rejected:     'Leave Rejected',
  leave_cancelled:    'Leave Cancelled',
  leave_expired:      'Leave Expired',
  employee_created:   'Employee Created',
  employee_updated:   'Employee Updated',
  employee_deactivated: 'Deactivated',
  quota_recalculated: 'Quota Recalculated',
  balance_adjusted:   'Balance Adjusted',
  login:              'Login',
  logout:             'Logout',
  password_changed:   'Password Changed',
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 50

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const params: any = { page: p }
      if (search) params.search = search
      if (actionFilter) params.action = actionFilter
      const r = await client.get('/audit-log/', { params })
      const d = r.data?.data
      setLogs(d?.results ?? [])
      setTotal(d?.count ?? 0)
      setPage(p)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Audit Log'
    load(1)
  }, [actionFilter])

  useEffect(() => {
    const t = setTimeout(() => load(1), 400)
    return () => clearTimeout(t)
  }, [search])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Audit Log</h2>
          <p className="text-xs text-slate-500 mt-0.5">Full trail of all system changes — {total} entries</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex gap-3 flex-wrap items-center">
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by user or item..."
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
        />
        <select
          value={actionFilter} onChange={e => setActionFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Actions</option>
          <optgroup label="Leave">
            <option value="leave_submitted">Leave Submitted</option>
            <option value="leave_approved">Leave Approved</option>
            <option value="leave_rejected">Leave Rejected</option>
            <option value="leave_cancelled">Leave Cancelled</option>
            <option value="leave_expired">Leave Expired</option>
          </optgroup>
          <optgroup label="Employee">
            <option value="employee_created">Employee Created</option>
            <option value="employee_updated">Employee Updated</option>
            <option value="employee_deactivated">Deactivated</option>
          </optgroup>
          <optgroup label="Quota">
            <option value="quota_recalculated">Quota Recalculated</option>
            <option value="balance_adjusted">Balance Adjusted</option>
          </optgroup>
          <optgroup label="Auth">
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="password_changed">Password Changed</option>
          </optgroup>
        </select>
        {(search || actionFilter) && (
          <button onClick={() => { setSearch(''); setActionFilter('') }}
            className="text-xs text-slate-400 hover:text-slate-600 font-medium">
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium text-slate-700">No audit entries found</p>
            <p className="text-sm text-slate-400 mt-1">Activity will appear here as actions are taken</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Time', 'Action', 'User', 'Item', 'Details'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-600'}`}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {log.actor_name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-900 font-medium">{log.target_label || log.target_id || '—'}</p>
                    {log.target_id && log.target_id !== log.target_label && (
                      <p className="text-xs text-slate-400 font-mono">{log.target_id}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-xs">
                    {log.new_value && (
                      <span className="text-slate-600">
                        {Object.entries(log.new_value)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing {((page-1)*perPage)+1}–{Math.min(page*perPage, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => load(page-1)} disabled={page <= 1}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">
              ← Prev
            </button>
            <span className="px-3 py-1.5 text-xs text-slate-600">{page} / {totalPages}</span>
            <button onClick={() => load(page+1)} disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
