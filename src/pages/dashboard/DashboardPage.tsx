import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getMyLeaves, getMyBalances, getPendingApprovals, approveLeave, rejectLeave } from '../../api/leaves'
import { getMyProfile } from '../../api/employees'
import { CalendarDays, ChevronRight, Plus, Clock, AlertCircle, FileText, CheckCircle, XCircle, Users } from 'lucide-react'
import type { LeaveBalance, LeaveApplication } from '../../types'

export default function DashboardPage() {
  const { user, isManager, isHR } = useAuth()
  const navigate = useNavigate()
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [recentLeaves, setRecentLeaves] = useState<LeaveApplication[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<LeaveApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const load = async () => {
    try {
      const profile = await getMyProfile()
      const eid = profile.data.data?.id
      if (eid) {
        const [bal, leaves] = await Promise.all([getMyBalances(eid), getMyLeaves({ page_size: '5' })])
        setBalances(bal.data.data ?? [])
        setRecentLeaves(leaves.data.data ?? [])
      }
      if (isManager || isHR) {
        const pend = await getPendingApprovals()
        setPendingApprovals((pend.data.data ?? []).slice(0, 5))
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { document.getElementById('page-title')!.textContent = 'Dashboard'; load() }, [])

  const handleApprove = async (id: string) => {
    setProcessing(true); setActionId(id)
    try { await approveLeave(id, ''); await load() } catch {}
    setProcessing(false); setActionId(null)
  }
  const handleReject = async (id: string) => {
    const comment = prompt('Reason for rejection (optional):') ?? ''
    setProcessing(true); setActionId(id)
    try { await rejectLeave(id, comment); await load() } catch {}
    setProcessing(false); setActionId(null)
  }

  const greeting = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Welcome hero */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 rounded-2xl p-5 text-white">
        <p className="text-slate-400 text-sm">{greeting()} 👋</p>
        <h2 className="text-xl md:text-2xl font-bold mt-0.5">{user?.full_name}</h2>
        <p className="text-slate-400 text-sm mt-0.5 capitalize">{user?.role?.replace('_', ' ')} · {(user as any)?.department}</p>
        {/* Quick actions */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <button onClick={() => navigate('/apply-leave')}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            <Plus size={15}/> Apply for Leave
          </button>
          <button onClick={() => navigate('/clock')}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors border border-white/20">
            <Clock size={15}/> Clock In / Out
          </button>
          {(isManager || isHR) && (
            <button onClick={() => navigate('/approvals')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors border border-white/20">
              <CheckCircle size={15}/> Approvals
              {pendingApprovals.length > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">{pendingApprovals.length}</span>
              )}
            </button>
          )}
          <button onClick={() => navigate('/timesheets')}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors border border-white/20">
            <FileText size={15}/> Timesheets
          </button>
        </div>
      </div>

      {/* Leave balances */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Leave Balances</h3>
        {balances.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-sm">No leave balances. Contact HR.</div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
            {balances.map(b => {
              const avail = parseFloat(b.available), alloc = parseFloat(b.allocated)
              const pct = alloc > 0 ? Math.min(100, (avail / alloc) * 100) : 0
              return (
                <div key={b.leave_type_id} className="bg-white rounded-2xl border border-slate-200 p-3">
                  <p className="text-xs text-slate-500 truncate">{b.leave_type_code}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{avail.toFixed(0)}</p>
                  <p className="text-xs text-slate-400">of {alloc.toFixed(0)}d</p>
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pending Approvals table — managers only */}
        {(isManager || isHR) && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden md:col-span-2">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Pending Approvals</h3>
                <p className="text-xs text-slate-400 mt-0.5">Requires your action</p>
              </div>
              <button onClick={() => navigate('/approvals')} className="text-xs text-emerald-600 font-semibold hover:underline">View all</button>
            </div>
            {pendingApprovals.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle size={28} className="text-emerald-300 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">All caught up! No pending approvals.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Employee','Leave Type','Duration','Applied','Action'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingApprovals.map(app => (
                      <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs flex-shrink-0">
                              {app.employee_name?.[0]?.toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-slate-900">{app.employee_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-sm">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: app.leave_type_color }}/>
                            {app.leave_type_name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {app.start_date} – {app.end_date} <span className="text-slate-400">({app.total_days}d)</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {new Date(app.applied_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApprove(app.id)}
                              disabled={processing && actionId === app.id}
                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle size={12}/> Approve
                            </button>
                            <button
                              onClick={() => handleReject(app.id)}
                              disabled={processing && actionId === app.id}
                              className="flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg border border-red-200 transition-colors disabled:opacity-50"
                            >
                              <XCircle size={12}/> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Recent leaves */}
        <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden ${isManager || isHR ? '' : 'md:col-span-2'}`}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Recent Applications</h3>
            <button onClick={() => navigate('/my-leaves')} className="text-xs text-emerald-600 font-semibold hover:underline">View all</button>
          </div>
          {recentLeaves.length === 0 ? (
            <div className="p-8 text-center">
              <CalendarDays size={28} className="text-slate-200 mx-auto mb-2"/>
              <p className="text-slate-500 text-sm font-medium">No leave applications yet</p>
              <button onClick={() => navigate('/apply-leave')} className="mt-2 text-emerald-600 text-sm font-semibold hover:underline">Apply now →</button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentLeaves.map(l => (
                <button key={l.id} onClick={() => navigate('/my-leaves')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.leave_type_color }}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{l.leave_type_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{l.start_date} → {l.end_date}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor[l.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {l.status}
                  </span>
                  <ChevronRight size={14} className="text-slate-300 flex-shrink-0"/>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
