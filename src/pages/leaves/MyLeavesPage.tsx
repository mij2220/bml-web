import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyLeaves, cancelLeave, getLeaveDetail } from '../../api/leaves'
import { Plus, Eye, XCircle, ChevronRight } from 'lucide-react'
import type { LeaveApplication } from '../../types'
import { generateLeavePdf } from '../../utils/leavePdf'

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
    getLeaveDetail(id)
      .then(r => { setLeave(r.data.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 md:hidden">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leave ? (
          <>
            <div className="bg-slate-900 p-5 md:rounded-t-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-mono mb-1">{leave.reference_number}</p>
                  <h3 className="text-white font-bold text-lg">{leave.leave_type_name}</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    {leave.start_date} → {leave.end_date} · {leave.total_days} days
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColor[leave.status]}`}>
                  {leave.status}
                </span>
                <button
                  onClick={() => generateLeavePdf({
                    reference_number: leave.reference_number || '',
                    employee_name: leave.employee_name || '',
                    employee_id_code: leave.employee_id_code,
                    department: leave.department,
                    leave_type_name: leave.leave_type_name || '',
                    leave_type_code: leave.leave_type_code || '',
                    start_date: leave.start_date,
                    end_date: leave.end_date,
                    total_days: leave.total_days,
                    reason: leave.reason || '',
                    contact_during_leave: leave.contact_during_leave,
                    address_during_leave: leave.address_during_leave,
                    duty_date_for_cd: leave.duty_date_for_cd,
                    status: leave.status,
                    applied_at: leave.applied_at || '',
                    approvals: leave.approvals,
                  })}
                  className="mt-2 flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Leave Pass
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Applied On</p>
                  <p className="text-sm font-semibold">{new Date(leave.applied_at).toLocaleDateString()}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Duration</p>
                  <p className="text-sm font-semibold">{leave.total_days} working days</p>
                </div>
              </div>

              {(leave as any).reason && (
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Reason</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 leading-relaxed">
                    {(leave as any).reason}
                  </p>
                </div>
              )}

              {/* Attachment */}
              {(leave as any).attachment_url && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Medical Certificate</p>
                  <a
                    href={(leave as any).attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    View Attachment
                  </a>
                </div>
              )}

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
                          <p className="text-sm font-medium">{a.approver_name}</p>
                          <p className="text-xs text-slate-500 capitalize">
                            {a.action} · {new Date(a.actioned_at).toLocaleDateString()}
                          </p>
                          {a.comment && (
                            <p className="text-xs text-slate-600 mt-1 italic">"{a.comment}"</p>
                          )}
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

            <div className="px-5 pb-8 md:pb-5">
              <button
                onClick={onClose}
                className="w-full py-3 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
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

// Mobile card component
function LeaveCard({
  l, onView, onCancel,
}: {
  l: LeaveApplication
  onView: () => void
  onCancel: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onView}
      className="bg-white rounded-2xl border border-slate-200 p-4 active:bg-slate-50 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: l.leave_type_color }}
          />
          <span className="font-semibold text-slate-900 text-sm">{l.leave_type_name}</span>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${statusColor[l.status]}`}>
          {l.status}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
        <span>{l.start_date} → {l.end_date}</span>
        <span className="font-bold text-slate-900">{l.total_days}d</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-mono">{l.reference_number}</span>
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          {l.status === 'pending' && (
            <button
              onClick={onCancel}
              className="text-xs text-red-500 font-semibold px-3 py-1 bg-red-50 rounded-lg active:bg-red-100"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MyLeavesPage() {
  const navigate = useNavigate()
  const [leaves, setLeaves] = useState<LeaveApplication[]>([])
  const [sortKey, setSortKey]   = useState<string | null>(null)
  const [sortDir, setSortDir]   = useState<'asc' | 'desc' | null>('asc')

  const toggleSort = (col: string) => {
    if (sortKey === col) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortKey(null); setSortDir('asc') }
    } else { setSortKey(col); setSortDir('asc') }
  }

  const sortedLeaves = [...leaves].sort((a: any, b: any) => {
    if (!sortKey || !sortDir) return 0
    const av = a[sortKey], bv = b[sortKey]
    if (av == null) return 1; if (bv == null) return -1
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true })
    return sortDir === 'asc' ? cmp : -cmp
  })

  const handleDownload = () => {
    downloadCSV('my-leaves.csv',
      ['Reference', 'Type', 'Start Date', 'End Date', 'Days', 'Status', 'Applied'],
      sortedLeaves.map((l: any) => [l.reference_number, l.leave_type_name, l.start_date, l.end_date, l.total_days, l.status, l.applied_at?.slice(0,10)])
    )
  }
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [viewId, setViewId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      if (search) params.search = search
      const { data } = await getMyLeaves(params)
      setLeaves(data.data ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'My Leaves'
    load()
  }, [statusFilter])

  useEffect(() => {
    const t = setTimeout(() => load(), 400)
    return () => clearTimeout(t)
  }, [search])

  const handleCancel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Cancel this leave application?')) return
    try {
      await cancelLeave(id)
      load()
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Could not cancel.')
    }
  }

  const counts = {
    total: leaves.length,
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-2 md:gap-3">
        {[
          { label: 'Total', value: counts.total, color: 'text-slate-900' },
          { label: 'Pending', value: counts.pending, color: 'text-amber-600' },
          { label: 'Approved', value: counts.approved, color: 'text-emerald-600' },
          { label: 'Rejected', value: counts.rejected, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-2 md:p-3 text-center">
            <p className={`text-xl md:text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leaves..."
          className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"/>
      </div>

      {/* Filters + action */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 md:gap-2 flex-wrap flex-1">
          {['', 'pending', 'approved', 'rejected', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors capitalize ${
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
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs md:text-sm font-semibold px-3 md:px-4 py-2 rounded-lg transition-colors flex-shrink-0"
        >
          <Plus size={15} /> Apply
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leaves.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500 font-medium">No leave applications found</p>
          <button
            onClick={() => navigate('/apply-leave')}
            className="mt-2 text-emerald-600 text-sm font-medium hover:underline"
          >
            Apply for leave →
          </button>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {leaves.map(l => (
              <LeaveCard
                key={l.id}
                l={l}
                onView={() => setViewId(l.id)}
                onCancel={e => handleCancel(l.id, e)}
              />
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {([['Reference','reference_number'],['Type','leave_type_name'],['Period','start_date'],['Days','total_days'],['Status','status'],['Applied','applied_at']] as [string,string][]).map(([h,col]) => (
                    <th key={h} onClick={() => toggleSort(col)}
                      className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap">
                      {h}<span className="text-slate-300 ml-1 text-xs">{sortKey===col?(sortDir==='asc'?'↑':'↓'):'↕'}</span>
                    </th>
                  ))}
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedLeaves.map((l: any) => (
                  <tr
                    key={l.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setViewId(l.id)}
                  >
                    <td className="px-4 py-3 text-sm font-mono text-slate-700">{l.reference_number}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full" style={{ background: l.leave_type_color }} />
                        {l.leave_type_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{l.start_date} → {l.end_date}</td>
                    <td className="px-4 py-3 text-sm font-bold">{l.total_days}d</td>
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
                        <button
                          onClick={() => setViewId(l.id)}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium px-2 py-1 rounded-lg hover:bg-slate-100"
                        >
                          <Eye size={13} /> View
                        </button>
                        {l.status === 'pending' && (
                          <button
                            onClick={e => handleCancel(l.id, e)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50"
                          >
                            <XCircle size={13} /> Cancel
                          </button>
                        )}
                        <ChevronRight size={14} className="text-slate-300" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Detail modal */}
      {viewId && <LeaveDetailModal id={viewId} onClose={() => setViewId(null)} />}
    </div>
  )
}
