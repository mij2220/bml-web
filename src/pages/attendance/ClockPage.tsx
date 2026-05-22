import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { clockIn, clockOut, getTodayAttendance } from '../../api/attendance'
import { Clock, AlertCircle } from 'lucide-react'

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}

function fmtHrs(h: number) {
  if (!h || h <= 0) return '0h 0m'
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return `${hrs}h ${mins}m`
}

function getWeekDays() {
  const today = new Date()
  const monday = new Date(today)
  const day = today.getDay()
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return {
      label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
      date: d.toISOString().split('T')[0],
      isToday: d.toDateString() === today.toDateString(),
    }
  })
}

export default function ClockPage() {
  const navigate = useNavigate()
  const [time, setTime] = useState(new Date())
  const [record, setRecord] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [clocking, setClocking] = useState(false)
  const weekDays = getWeekDays()

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Attendance'
    const iv = setInterval(() => setTime(new Date()), 1000)
    loadToday()
    return () => clearInterval(iv)
  }, [])

  const loadToday = async () => {
    setLoading(true)
    try {
      const { data } = await getTodayAttendance()
      setRecord(data.data)
    } catch {}
    setLoading(false)
  }

  const handleClockIn = async () => {
    setClocking(true)
    try {
      await clockIn()
      await loadToday()
    } catch (e: any) { alert(e.response?.data?.message ?? 'Clock-in failed.') }
    setClocking(false)
  }

  const handleClockOut = async () => {
    setClocking(true)
    try {
      await clockOut()
      await loadToday()
    } catch (e: any) { alert(e.response?.data?.message ?? 'Clock-out failed.') }
    setClocking(false)
  }

  const isClockedIn = !!record?.clock_in && !record?.clock_out
  const workedHours = parseFloat(record?.worked_hours ?? '0')
  const overtimeHours = parseFloat(record?.overtime_hours ?? '0')

  // Mock TOIL balance (would come from API)
  const toilBalance = 8.5

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Main clock card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white text-center">
        <p className="text-slate-400 text-sm mb-1">
          {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <p className="text-5xl font-bold font-mono tracking-tight mb-1">
          {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        <p className="text-slate-400 text-sm mb-5">Asia/Karachi (PKT)</p>

        {/* Clock button */}
        {loading ? (
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        ) : isClockedIn ? (
          <button onClick={handleClockOut} disabled={clocking}
            className="bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white font-bold px-8 py-3 rounded-2xl text-base transition-colors flex items-center gap-2 mx-auto">
            <Clock size={18}/>{clocking ? 'Clocking out...' : 'Clock Out'}
          </button>
        ) : record?.clock_out ? (
          <div className="flex items-center justify-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-5 py-3 w-fit mx-auto">
            <Clock size={16} className="text-emerald-400"/>
            <span className="text-emerald-300 font-semibold">Day complete — {fmtHrs(workedHours)} worked</span>
          </div>
        ) : (
          <button onClick={handleClockIn} disabled={clocking}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-bold px-8 py-3 rounded-2xl text-base transition-colors flex items-center gap-2 mx-auto">
            <Clock size={18}/>{clocking ? 'Clocking in...' : 'Clock In'}
          </button>
        )}

        {!record?.clock_in && (
          <p className="text-slate-400 text-xs mt-3">📍 Location will be captured on clock-in</p>
        )}
      </div>

      {/* Three info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Today</h3>
          <div className="space-y-2">
            {[
              { label: 'Status', value: record?.clock_out ? 'Complete' : record?.clock_in ? 'In progress' : 'Not started',
                color: record?.clock_out ? 'text-emerald-600' : record?.clock_in ? 'text-blue-600' : 'text-slate-400' },
              { label: 'Clock In',  value: fmtTime(record?.clock_in),  color: 'text-slate-900' },
              { label: 'Clock Out', value: record?.clock_out ? fmtTime(record.clock_out) : '—', color: 'text-slate-900' },
              { label: 'Worked',    value: fmtHrs(workedHours), color: 'text-slate-900' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                <span className="text-sm text-slate-500">{label}</span>
                <span className={`text-sm font-semibold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/attendance-correction')}
            className="mt-4 w-full text-xs text-amber-600 font-semibold border border-amber-200 py-2 rounded-xl hover:bg-amber-50 transition-colors flex items-center justify-center gap-1.5">
            <AlertCircle size={12}/> Request Correction
          </button>
        </div>

        {/* This Week */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3">This Week</h3>
          <div className="space-y-1.5">
            {weekDays.map(day => (
              <div key={day.date} className={`flex justify-between items-center text-xs py-1 border-b border-slate-50 last:border-0 ${day.isToday ? 'font-semibold' : ''}`}>
                <span className={day.isToday ? 'text-emerald-600' : 'text-slate-500'}>{day.label}</span>
                {day.isToday && record?.clock_in ? (
                  <span className="font-mono text-slate-700">{fmtTime(record.clock_in)} – {record.clock_out ? fmtTime(record.clock_out) : 'now'}</span>
                ) : day.isToday ? (
                  <span className="text-slate-300">—</span>
                ) : new Date(day.date) > new Date() ? (
                  <span className="text-slate-200">—</span>
                ) : (
                  <span className="font-mono text-slate-400">09:00 – 18:00</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs font-semibold">
            <span className="text-slate-700">Total</span>
            <span className="font-mono text-slate-900">{fmtHrs(workedHours + 33.6)}</span>
          </div>
        </div>

        {/* TOIL Balance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3">TOIL Balance</h3>
          <div className="text-center py-2">
            <p className="text-4xl font-bold text-amber-600">{toilBalance}h</p>
            <p className="text-xs text-slate-400 mt-1">Accrued from overtime</p>
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(toilBalance / 20) * 100}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Max 20h per quarter</p>
          </div>
          <button onClick={() => navigate('/apply-leave')}
            className="mt-4 w-full text-xs text-amber-700 font-semibold border border-amber-200 py-2 rounded-xl hover:bg-amber-50 transition-colors">
            Use as Leave →
          </button>
          {overtimeHours > 0 && (
            <p className="text-center text-xs text-amber-600 mt-2">+{fmtHrs(overtimeHours)} from today</p>
          )}
        </div>
      </div>
    </div>
  )
}
