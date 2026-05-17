import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getMyLeaves, getMyBalances, getPendingApprovals } from '../../api/leaves'
import { getMyProfile } from '../../api/employees'
import { CalendarDays, Clock, CheckCircle, XCircle, Plus, ChevronRight } from 'lucide-react'
import type { LeaveBalance, LeaveApplication } from '../../types'

const statusColor: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
}

export default function DashboardPage() {
  const { user, isManager } = useAuth()
  const navigate = useNavigate()
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [recentLeaves, setRecentLeaves] = useState<LeaveApplication[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Dashboard'
    const load = async () => {
      try {
        const profile = await getMyProfile()
        const eid = profile.data.data?.id
        setEmployeeId(eid ?? null)
        if (eid) {
          const [bal, leaves] = await Promise.all([
            getMyBalances(eid),
            getMyLeaves({ page_size: '5' }),
          ])
          setBalances(bal.data.data ?? [])
          setRecentLeaves(leaves.data.data ?? [])
        }
        if (isManager) {
          const pend = await getPendingApprovals()
          setPendingCount((pend.data.data ?? []).length)
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [isManager])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 rounded-2xl p-6 text-white">
        <p className="text-slate-400 text-sm mb-1">Good day 👋</p>
        <h2 className="text-2xl font-bold mb-1">{user?.full_name}</h2>
        <p className="text-slate-400 text-sm capitalize">{user?.role?.replace('_', ' ')} · {user?.department}</p>
        <button
          onClick={() => navigate('/apply-leave')}
          className="mt-4 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors w-fit"
        >
          <Plus size={16} /> Apply for Leave
        </button>
      </div>

      {/* Manager alert */}
      {isManager && pendingCount > 0 && (
        <div
          onClick={() => navigate('/approvals')}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">{pendingCount} leave request{pendingCount > 1 ? 's' : ''} awaiting your approval</p>
              <p className="text-amber-600 text-sm">Click to review</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-amber-500" />
        </div>
      )}

      {/* Leave balances */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Leave Balances</h3>
        {balances.length === 0 ? (
          <p className="text-slate-400 text-sm">No leave balances found. Contact HR to set up your leave allocation.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {balances.map(b => (
              <div key={b.leave_type_id} className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500 mb-2">{b.leave_type_name}</p>
                <p className="text-2xl font-bold text-slate-900">{parseFloat(b.available).toFixed(0)}</p>
                <p className="text-xs text-slate-400 mt-1">of {parseFloat(b.allocated).toFixed(0)} days</p>
                <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, (parseFloat(b.available) / parseFloat(b.allocated)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent leaves */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Recent Leave Applications</h3>
          <button onClick={() => navigate('/my-leaves')} className="text-emerald-600 text-sm font-medium hover:underline">View all</button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {recentLeaves.length === 0 ? (
            <div className="p-8 text-center">
              <CalendarDays size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No leave applications yet</p>
              <button onClick={() => navigate('/apply-leave')} className="mt-3 text-emerald-600 text-sm font-medium hover:underline">Apply for your first leave →</button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Reference</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Dates</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Days</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLeaves.map(leave => (
                  <tr
                    key={leave.id}
                    onClick={() => navigate(`/my-leaves/${leave.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-slate-600">{leave.reference_number}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full" style={{ background: leave.leave_type_color }} />
                        {leave.leave_type_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{leave.start_date} → {leave.end_date}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{leave.total_days}d</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${statusColor[leave.status]}`}>
                        {leave.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
