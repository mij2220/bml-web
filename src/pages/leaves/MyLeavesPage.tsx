import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyLeaves, cancelLeave, getLeaveDetail } from '../../api/leaves'
import { Plus, Eye, XCircle, ChevronRight } from 'lucide-react'
import type { LeaveApplication } from '../../types'

const statusColor: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border border-red-200',
  cancelled: 'bg-slate-100 text-slate-500 border border-slate-200',
}

function LeaveDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [leave, setLeave] = useState<LeaveApplication | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLeaveDetail(id).then(r => {
      setLeave(r.data.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leave ? (
          <>
            {/* Header */}
            <div className="bg-slate-900 rounded-t-2xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-mono mb-1">{leave.reference_number}</p>
                  <h3 className="text-white font-bold text-lg">{leave.leave_type_name}</h3>
                  <p className="text-slate-400 text-sm mt-1">{leave.start_date} → {leave.end_date} · {leave.total_days} days</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColor[leave.status]}`}>
                  {leave.status}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Applied On</p>
                  <p className="text-sm font-semibold text-slate-900">{new Date(leave.applied_at).toLocaleDateString()}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Duration</p>
                  <p className="text-sm font-semibold text-slate-900">{leave.total_days} working days</p>
                </div>
                {leave.is_half_day && (
                  <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                    <p className="text-xs text-slate-500 mb-1">Half Day</p>
                    <p className="text-sm font-semibold text-slate-900 capitalize">{leave.half_day_period} session</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1.5">Reason</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 leading-relaxed">{(leave as any).reason || '—'}</p>
              </div>

              {/* Approval trail */}
              {leave.approvals && leave.approvals.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Approval History</p>
                  <div className="space-y-2">
                    {leave.approvals.map(a => (
                      <div key={a.id} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          a.action === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {a.action === 'approved' ? '✓' : '✗'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{a.approver_name}</p>
                          <p className="text-xs text-slate-500">{a.action} · {new Date(a.actioned_at).toLocaleDateString()}</p>
                          {a.comment && <p className="text-xs text-slate-600 mt-1 italic">"{a.comment}"</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {leave.status === 'pending' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                  ⏳ Awaiting Level {leave.current_approval_level} approval
                </div>
              )}
            </div>

            <div className="px-5 pb-5 flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                Close
              </button>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-slate-400">Could not load details.</div>
        )}
      </div>
    </div>
  )
}

export default function MyLeavesPage() {
  const navigate = useNavigate()
  const [leaves, setLeaves] = useState<LeaveApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [viewId, setViewId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      const { data } = await getMyLeaves(params)
      setLeaves(data.data ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'My Leaves'
    load()
  }, [statusFilter])

  const handleCancel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Cancel this leave application?')) return
    try {
      await cancelLeave(id)
      load()
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Could not cancel.')
    }
  }

  const statusCounts = {
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
  }

  return (
    <div className="max-w-5xl space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: leaves.length, color: 'text-slate-900' },
          { label: 'Pending', value: statusCounts.pending, color: 'text-amber-600' },
          { label: 'Approved', value: statusCounts.approved, color: 'text-emerald-600' },
          { label: 'Rejected', value: leaves.filter(l => l.status === 'rejected').length, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + action */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {['', 'pending', 'approved', 'rejected', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                statusFilter === s
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <button
          onClick={() => navigate('/apply-leave')}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Apply Leave
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <p className="font-medium">No leave applications found</p>
            <button onClick={() => navigate('/apply-leave')} className="mt-2 text-emerald-600 text-sm font-medium hover:underline">
              Apply for leave →
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Reference', 'Type', 'Period', 'Days', 'Status', 'Applied', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaves.map(l => (
                <tr
                  key={l.id}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setViewId(l.id)}
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-slate-700 font-medium">{l.reference_number}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.leave_type_color }} />
                      {l.leave_type_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {l.start_date} → {l.end_date}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-slate-900">{l.total_days}d</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColor[l.status]}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {new Date(l.applied_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      {/* View */}
                      <button
                        onClick={e => { e.stopPropagation(); setViewId(l.id) }}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                        title="View details"
                      >
                        <Eye size={13} /> View
                      </button>

                      {/* Edit — only pending */}
                      {l.status === 'pending' && (
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/apply-leave?edit=${l.id}`) }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          Edit
                        </button>
                      )}

                      {/* Cancel — only pending */}
                      {l.status === 'pending' && (
                        <button
                          onClick={e => handleCancel(l.id, e)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <XCircle size={13} /> Cancel
                        </button>
                      )}

                      {/* Chevron */}
                      <ChevronRight size={14} className="text-slate-300 ml-1" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {viewId && <LeaveDetailModal id={viewId} onClose={() => setViewId(null)} />}
    </div>
  )
}
