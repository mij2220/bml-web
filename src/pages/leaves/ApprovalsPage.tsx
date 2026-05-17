import { useEffect, useState } from 'react'
import { getPendingApprovals, approveLeave, rejectLeave } from '../../api/leaves'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import type { LeaveApplication } from '../../types'

export default function ApprovalsPage() {
  const [apps, setApps] = useState<LeaveApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getPendingApprovals()
      setApps(data.data ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Pending Approvals'
    load()
  }, [])

  const openAction = (id: string, type: 'approve' | 'reject') => {
    setActionId(id)
    setActionType(type)
    setComment('')
  }

  const submit = async () => {
    if (!actionId || !actionType) return
    if (actionType === 'reject' && !comment.trim()) {
      alert('Comment is required when rejecting.')
      return
    }
    setSubmitting(true)
    try {
      if (actionType === 'approve') await approveLeave(actionId, comment)
      else await rejectLeave(actionId, comment)
      setActionId(null)
      setActionType(null)
      load()
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Action failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl space-y-4">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : apps.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <CheckCircle size={48} className="text-emerald-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">All caught up!</h3>
          <p className="text-slate-400 text-sm">No pending approvals right now.</p>
        </div>
      ) : (
        apps.map(app => (
          <div key={app.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0">
                    {app.employee_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{app.employee_name}</p>
                    <p className="text-xs text-slate-500">{app.department} · {app.employee_id_code}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Leave Type</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{app.leave_type_name}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Period</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{app.start_date} → {app.end_date}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Duration</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{app.total_days} days</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Applied</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{new Date(app.applied_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openAction(app.id, 'approve')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-lg transition-colors"
                >
                  <CheckCircle size={16} /> Approve
                </button>
                <button
                  onClick={() => openAction(app.id, 'reject')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold rounded-lg transition-colors"
                >
                  <XCircle size={16} /> Reject
                </button>
              </div>
            </div>

            {/* Inline action form */}
            {actionId === app.id && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  {actionType === 'approve' ? 'Add a comment (optional)' : 'Reason for rejection (required)'}
                </p>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={2}
                  placeholder={actionType === 'approve' ? 'e.g. Approved. Enjoy your time off!' : 'e.g. Peak period — all hands needed.'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setActionId(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                  <button
                    onClick={submit}
                    disabled={submitting}
                    className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${
                      actionType === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {submitting ? 'Processing...' : actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
