import { useEffect, useState } from 'react'
import { getTeamCalendar } from '../../api/leaves'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import type { LeaveApplication } from '../../types'

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [leaves, setLeaves] = useState<LeaveApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Team Calendar'
  }, [])

  useEffect(() => {
    setLoading(true)
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
    getTeamCalendar(monthStr)
      .then(r => { setLeaves(r.data.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [year, month])

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' })
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  // Get leaves for a specific day
  const getLeavesForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return leaves.filter(l =>
      l.status === 'approved' &&
      l.start_date <= dateStr &&
      l.end_date >= dateStr
    )
  }

  const selectedDayLeaves = selectedDay ? getLeavesForDay(selectedDay) : []

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Calendar header */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors"
          >
            <ChevronLeft size={18} className="text-slate-600" />
          </button>
          <div className="text-center">
            <h2 className="font-bold text-slate-900 text-lg">{monthName} {year}</h2>
            <p className="text-xs text-slate-500">Team Leave Calendar</p>
          </div>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors"
          >
            <ChevronRight size={18} className="text-slate-600" />
          </button>
        </div>

        {/* Week day headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {weekDays.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells for first week */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-14 md:h-20 border-b border-r border-slate-100" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dayLeaves = getLeavesForDay(day)
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
            const isSelected = day === selectedDay
            const isWeekend = (firstDay + i) % 7 === 0 || (firstDay + i) % 7 === 6

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                className={`h-14 md:h-20 border-b border-r border-slate-100 p-1 cursor-pointer transition-colors ${
                  isSelected ? 'bg-emerald-50' :
                  isWeekend ? 'bg-slate-50/50' :
                  'hover:bg-slate-50'
                }`}
              >
                <div className="flex flex-col h-full">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1 ${
                    isToday ? 'bg-emerald-500 text-white' :
                    isWeekend ? 'text-slate-400' :
                    'text-slate-700'
                  }`}>
                    {day}
                  </div>
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {dayLeaves.slice(0, 2).map((l, idx) => (
                      <div
                        key={idx}
                        className="text-xs px-1 rounded truncate text-white font-medium leading-4"
                        style={{ background: l.leave_type_color ?? '#10b981' }}
                      >
                        <span className="hidden md:inline">{l.employee_name?.split(' ')[0]}</span>
                        <span className="md:hidden">·</span>
                      </div>
                    ))}
                    {dayLeaves.length > 2 && (
                      <div className="text-xs text-slate-400 px-1">+{dayLeaves.length - 2}</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900 mb-3">
            {monthName} {selectedDay} — {selectedDayLeaves.length > 0 ? `${selectedDayLeaves.length} on leave` : 'No leaves'}
          </h3>
          {selectedDayLeaves.length === 0 ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <CalendarDays size={16} />
              Everyone is in today
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayLeaves.map(l => (
                <div key={l.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: l.leave_type_color ?? '#10b981' }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{l.employee_name}</p>
                    <p className="text-xs text-slate-500">{l.leave_type_name} · {l.start_date} → {l.end_date}</p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {l.total_days}d
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Leave Types</p>
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(leaves.map(l => l.leave_type_name))).map(name => {
            const leave = leaves.find(l => l.leave_type_name === name)
            return (
              <div key={name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <div className="w-3 h-3 rounded-full" style={{ background: leave?.leave_type_color ?? '#94a3b8' }} />
                {name}
              </div>
            )
          })}
          {leaves.length === 0 && <p className="text-xs text-slate-400">No approved leaves this month</p>}
        </div>
      </div>
    </div>
  )
}
