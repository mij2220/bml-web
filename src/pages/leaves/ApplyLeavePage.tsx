import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLeaveTypes, applyLeave, getMyBalances } from '../../api/leaves'
import { getMyProfile } from '../../api/employees'
import type { LeaveType, LeaveBalance } from '../../types'

export default function ApplyLeavePage() {
  const navigate = useNavigate()
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [form, setForm] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
    is_half_day: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Apply for Leave'
    const load = async () => {
      const [lt, profile] = await Promise.all([getLeaveTypes(), getMyProfile()])
      setLeaveTypes(lt.data.data ?? [])
      const eid = profile.data.data?.id
      if (eid) {
        const bal = await getMyBalances(eid)
        setBalances(bal.data.data ?? [])
      }
    }
    load()
  }, [])

  const selectedBalance = balances.find(b => b.leave_type_id === form.leave_type_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.leave_type_id) return setError('Please select a leave type.')
    if (!form.start_date || !form.end_date) return setError('Please select dates.')
    if (form.start_date > form.end_date) return setError('End date must be after start date.')
    if (form.reason.length < 5) return setError('Please provide a reason (at least 5 characters).')
    setLoading(true)
    try {
      await applyLeave(form)
      navigate('/my-leaves')
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to submit leave application.')
    } finally {
      setLoading(false)
    }
  }

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">New Leave Application</h2>
        <p className="text-sm text-slate-500 mb-6">Fill in the details below to submit your leave request.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Leave type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Leave Type</label>
            <select
              value={form.leave_type_id}
              onChange={e => set('leave_type_id', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select leave type...</option>
              {leaveTypes.map(lt => {
                const bal = balances.find(b => b.leave_type_id === lt.id)
                return (
                  <option key={lt.id} value={lt.id}>
                    {lt.name} {bal ? `(${parseFloat(bal.available).toFixed(1)} days available)` : ''}
                  </option>
                )
              })}
            </select>
            {selectedBalance && (
              <p className="text-xs text-emerald-600 mt-1.5 font-medium">
                Available: {parseFloat(selectedBalance.available).toFixed(1)} days
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">From Date</label>
              <input
                type="date"
                value={form.start_date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => set('start_date', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">To Date</label>
              <input
                type="date"
                value={form.end_date}
                min={form.start_date || new Date().toISOString().split('T')[0]}
                onChange={e => set('end_date', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Half day */}
          {leaveTypes.find(lt => lt.id === form.leave_type_id)?.allow_half_day && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_half_day}
                onChange={e => set('is_half_day', e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="text-sm text-slate-700">Half day</span>
            </label>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason</label>
            <textarea
              value={form.reason}
              onChange={e => set('reason', e.target.value)}
              rows={4}
              placeholder="Please provide a reason for your leave request..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-2 flex-grow-[2] px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
