import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../../api/client'
import { AlertCircle, CheckCircle } from 'lucide-react'

const CORRECTION_TYPES = [
  { value: 'missing_in',  label: 'Missed clock-in', sub: 'I was present but forgot to clock in' },
  { value: 'missing_out', label: 'Missed clock-out', sub: 'I forgot to clock out at end of day' },
  { value: 'wrong_time',  label: 'Wrong time recorded', sub: 'The time was recorded incorrectly' },
  { value: 'full_day',    label: 'Full day — neither recorded', sub: 'I worked but neither in/out was captured' },
]

export default function AttendanceCorrectionPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    correction_type: 'missing_out',
    correct_clock_in: '09:00',
    correct_clock_out: '18:00',
    explanation: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<any>(null)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Attendance Correction'
    client.get('/attendance/today/').then(r => setCurrentRecord(r.data.data)).catch(() => {})
  }, [])

  const handleSubmit = async () => {
    if (!form.explanation.trim()) return alert('Please provide an explanation.')
    setSubmitting(true)
    try {
      await client.post('/attendance/correction/', form).catch(() => {})
      setSuccess(true)
    } catch {}
    setSubmitting(false)
  }

  if (success) return (
    <div className="max-w-lg mx-auto flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
        <CheckCircle size={32} className="text-emerald-500"/>
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Correction submitted!</h2>
      <p className="text-slate-500 text-sm mb-6">Your manager will review and approve the correction.</p>
      <button onClick={() => navigate('/clock')} className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
        Back to Attendance
      </button>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button onClick={() => navigate('/clock')} className="hover:text-slate-700">Attendance</button>
        <span>›</span>
        <span className="text-slate-900">Request Correction</span>
      </div>

      {/* Warning banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-amber-800">
        <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5"/>
        Missed a clock-in/out? Submit a correction — your manager will review it.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Correction form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-semibold text-slate-900">Correction Request</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Correction Type</label>
            <div className="space-y-2">
              {CORRECTION_TYPES.map(ct => (
                <label key={ct.value} className={`flex items-start gap-3 p-3 border-2 rounded-xl cursor-pointer transition-colors ${
                  form.correction_type === ct.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input type="radio" name="corr" value={ct.value} checked={form.correction_type === ct.value}
                    onChange={() => set('correction_type', ct.value)} className="accent-emerald-500 mt-0.5 flex-shrink-0"/>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{ct.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{ct.sub}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Correct Clock In</label>
              <input type="time" value={form.correct_clock_in} onChange={e => set('correct_clock_in', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Correct Clock Out</label>
              <input type="time" value={form.correct_clock_out} onChange={e => set('correct_clock_out', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Explanation *</label>
            <textarea value={form.explanation} onChange={e => set('explanation', e.target.value)} rows={3}
              placeholder="Explain what happened..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"/>
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('/clock')}
              className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-semibold rounded-xl transition-colors">
              {submitting ? 'Submitting...' : 'Submit Correction'}
            </button>
          </div>
        </div>

        {/* Current record */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3">
            Current Record — {new Date(form.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </h3>

          {!currentRecord?.clock_in && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3 text-sm text-red-800 flex items-center gap-2">
              <AlertCircle size={14}/> No attendance record found for this date
            </div>
          )}
          {currentRecord?.clock_in && !currentRecord?.clock_out && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3 text-sm text-amber-800 flex items-center gap-2">
              <AlertCircle size={14}/> Clock-out missing
            </div>
          )}

          <div className="space-y-2.5">
            {[
              { label: 'Clock In',  value: currentRecord?.clock_in ? new Date(currentRecord.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—', ok: !!currentRecord?.clock_in },
              { label: 'Clock Out', value: currentRecord?.clock_out ? new Date(currentRecord.clock_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Missing', ok: !!currentRecord?.clock_out },
              { label: 'Status',    value: currentRecord?.status ?? 'No record', ok: currentRecord?.status === 'present' },
            ].map(({ label, value, ok }) => (
              <div key={label} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0">
                <span className="text-sm text-slate-500">{label}</span>
                <span className={`text-sm font-semibold ${ok ? 'text-slate-900 font-mono' : 'text-red-500'}`}>{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">After correction is approved by your manager, the attendance record will be updated automatically.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
