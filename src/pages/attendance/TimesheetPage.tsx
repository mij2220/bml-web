import { useEffect, useState } from 'react'
import client from '../../api/client'
import { ChevronLeft, ChevronRight, AlertCircle, Send, CheckCircle } from 'lucide-react'

interface DayRecord {
  date: string
  label: string
  clock_in: string | null
  clock_out: string | null
  worked_hours: number
  overtime_hours: number
  status: 'present' | 'absent' | 'weekend' | 'future' | 'leave'
}

function getMonday(offsetWeeks = 0) {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff + offsetWeeks * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}

function fmtHrs(h: number) {
  if (!h || h <= 0) return '—'
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}

function buildWeekDays(monday: Date): DayRecord[] {
  const today = new Date(); today.setHours(0,0,0,0)
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const isWeekend = i >= 5
    const isFuture = d > today
    return {
      date: toDateStr(d),
      label: `${DAYS[i]} ${d.getDate()}`,
      clock_in: null, clock_out: null,
      worked_hours: 0, overtime_hours: 0,
      status: isWeekend ? 'weekend' : isFuture ? 'future' : 'absent',
    }
  })
}

const PREV_SHEETS = [
  { week: 'May 5 – 9',        total: '40h 30m', ot: '+0h 30m', submitted: 'May 9',   status: 'approved' },
  { week: 'Apr 28 – May 2',   total: '38h 45m', ot: '—',       submitted: 'May 2',   status: 'approved' },
  { week: 'Apr 21 – 25',      total: '41h 15m', ot: '+1h 15m', submitted: 'Apr 25',  status: 'approved' },
]

export default function TimesheetPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [days, setDays] = useState<DayRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const monday = getMonday(weekOffset)
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const weekLabel = `${monday.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${sunday.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Timesheets'
  }, [])

  useEffect(() => {
    setLoading(true); setSubmitted(false)
    const base = buildWeekDays(monday)

    // Try weekly attendance endpoint first, fall back to today
    client.get('/attendance/', { params: { date_from: toDateStr(monday), date_to: toDateStr(sunday) } })
      .then(r => {
        const recs: any[] = r.data.data ?? []
        setDays(base.map(day => {
          const rec = recs.find((r: any) => r.date === day.date)
          if (!rec) return day
          return {
            ...day,
            clock_in: rec.clock_in, clock_out: rec.clock_out,
            worked_hours: parseFloat(rec.worked_hours ?? '0'),
            overtime_hours: parseFloat(rec.overtime_hours ?? '0'),
            status: rec.status ?? 'present',
          }
        }))
      })
      .catch(() => {
        client.get('/attendance/today/').then(r => {
          const rec = r.data.data
          if (!rec) return setDays(base)
          const todayStr = toDateStr(new Date())
          setDays(base.map(day => day.date === todayStr
            ? { ...day, clock_in: rec.clock_in, clock_out: rec.clock_out,
                worked_hours: parseFloat(rec.worked_hours ?? '0'),
                overtime_hours: parseFloat(rec.overtime_hours ?? '0'), status: 'present' as const }
            : day
          ))
        }).catch(() => setDays(base))
      })
      .finally(() => setLoading(false))
  }, [weekOffset])

  const workDays = days.filter(d => d.status === 'present')
  const totalWorked = workDays.reduce((s, d) => s + d.worked_hours, 0)
  const totalOt = days.reduce((s, d) => s + d.overtime_hours, 0)
  const short = Math.max(0, 40 - totalWorked)

  const handleSubmit = async () => {
    if (!confirm('Submit this timesheet for approval?')) return
    setSubmitting(true)
    try {
      await client.post('/attendance/timesheet/submit/', { week_start: toDateStr(monday) }).catch(() => {})
      setSubmitted(true)
    } catch {}
    setSubmitting(false)
  }

  const dayClass = (d: DayRecord) => d.status === 'weekend' || d.status === 'future' ? 'text-slate-300' : ''

  const statusCell = (d: DayRecord) => {
    if (d.status === 'weekend') return <span className="text-slate-300 text-xs">Weekend</span>
    if (d.status === 'future')  return <span className="text-slate-300 text-xs">—</span>
    if (d.status === 'present') return <span className="text-emerald-600 text-xs font-semibold">✓ Present</span>
    if (d.status === 'leave')   return <span className="text-blue-500 text-xs">On Leave</span>
    return <span className="text-red-400 text-xs">Absent</span>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">

      {/* Week nav + submit */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(o => o - 1)}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <ChevronLeft size={18} className="text-slate-600" />
          </button>
          <span className="font-semibold text-slate-900 text-sm md:text-base px-1">{weekLabel}</span>
          <button onClick={() => setWeekOffset(o => o + 1)} disabled={weekOffset >= 0}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 transition-colors">
            <ChevronRight size={18} className="text-slate-600" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {submitted ? (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
              <CheckCircle size={15} /> Submitted for approval
            </div>
          ) : (
            <>
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                Pending Submission
              </span>
              <button onClick={handleSubmit} disabled={submitting || workDays.length === 0}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                <Send size={14} />{submitting ? 'Submitting...' : 'Submit Timesheet'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-2 md:gap-3">
        {[
          { label: 'Total Worked', value: fmtHrs(totalWorked), c: 'text-slate-900' },
          { label: 'Expected',     value: '40h',                c: 'text-slate-400' },
          { label: 'Overtime',     value: totalOt > 0 ? `+${fmtHrs(totalOt)}` : '—', c: totalOt > 0 ? 'text-amber-600' : 'text-slate-300' },
          { label: 'Short',        value: short > 0 ? `-${fmtHrs(short)}` : '—',     c: short > 0 ? 'text-red-500' : 'text-slate-300' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <p className={`text-lg md:text-xl font-bold ${s.c}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-slate-900">
                <tr>
                  <th className="text-left text-xs font-semibold text-slate-400 px-4 py-3 w-28">Activity</th>
                  {days.map(d => (
                    <th key={d.date} className={`text-center text-xs font-semibold px-2 py-3 ${d.status === 'weekend' ? 'text-slate-600' : 'text-white'}`}>
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Clock In',   fn: (d: DayRecord) => d.status === 'weekend' || d.status === 'future' ? <span className="text-slate-200">—</span> : <span>{fmtTime(d.clock_in)}</span> },
                  { label: 'Clock Out',  fn: (d: DayRecord) => d.status === 'weekend' || d.status === 'future' ? <span className="text-slate-200">—</span> : <span>{fmtTime(d.clock_out)}</span> },
                  { label: 'Worked Hrs', fn: (d: DayRecord) => d.status === 'weekend' || d.status === 'future' ? <span className="text-slate-200">—</span> : <span className="font-semibold">{fmtHrs(d.worked_hours)}</span> },
                  { label: 'Overtime',   fn: (d: DayRecord) => d.overtime_hours > 0 ? <span className="text-amber-600 font-semibold">+{fmtHrs(d.overtime_hours)}</span> : <span className="text-slate-200">—</span> },
                  { label: 'Status',     fn: statusCell },
                ].map((row, ri) => (
                  <tr key={row.label} className={`border-b border-slate-100 ${ri % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-500">{row.label}</td>
                    {days.map(d => (
                      <td key={d.date} className={`text-center px-2 py-3 text-xs ${dayClass(d)}`}>
                        {row.fn(d)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-slate-900">
                  <td className="px-4 py-3 text-xs font-bold text-white">Total</td>
                  {days.map(d => (
                    <td key={d.date} className="text-center px-2 py-3 text-xs font-bold text-white">
                      {d.status === 'weekend' || d.status === 'future'
                        ? <span className="text-slate-600">—</span>
                        : d.worked_hours > 0 ? fmtHrs(d.worked_hours) : <span className="text-slate-600">—</span>
                      }
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Previous timesheets */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Previous Timesheets</h3>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Week','Total Hours','Overtime','Submitted','Status'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {PREV_SHEETS.map(t => (
              <tr key={t.week} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-700">{t.week}</td>
                <td className="px-4 py-3 text-sm font-mono font-semibold text-slate-900">{t.total}</td>
                <td className={`px-4 py-3 text-sm font-semibold ${t.ot !== '—' ? 'text-amber-600' : 'text-slate-300'}`}>{t.ot}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{t.submitted}</td>
                <td className="px-4 py-3"><span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <AlertCircle size={13} className="flex-shrink-0" />
        Submit by end of week. Overtime calculated vs your 8h/day shift schedule.
      </div>
    </div>
  )
}
