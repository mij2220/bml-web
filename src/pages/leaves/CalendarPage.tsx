import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { getTeamCalendar } from '../../api/leaves'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import type { CalendarLeave } from '../../types'

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

/**
 * Leave calendar.
 *  - Supervisor / SIC / employee: own team, approved leave (as before).
 *  - Admin: the whole organisation; pending requests can be switched on.
 *  - Rota Manager: own unit, approved AND pending — operators often avail
 *    leave before approval is complete, so both are shown (pending is marked).
 */
export default function CalendarPage() {
  const { isRota, isHR, user } = useAuth()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [leaves, setLeaves] = useState<CalendarLeave[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [adminPending, setAdminPending] = useState(false)

  const showPending = isRota || (isHR && adminPending)
  const title = isRota ? 'Leave Calendar' : 'Team Calendar'
  const subtitle = isRota
    ? `${user?.department ?? 'Your unit'} · who is unavailable`
    : isHR ? 'All units' : 'Team Leave Calendar'

  useEffect(() => {
    document.getElementById('page-title')!.textContent = title
  }, [title])

  useEffect(() => {
    setLoading(true)
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
    getTeamCalendar(monthStr, showPending)
      .then(r => { setLeaves(r.data.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [year, month, showPending])

  const prevMonth = () => {
    setSelectedDay(null)
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    setSelectedDay(null)
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' })
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const isPending = (l: CalendarLeave) => l.status === 'pending'

  // Leaves for a specific day: approved always, pending only when it is being shown
  const getLeavesForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return leaves
      .filter(l =>
        (l.status === 'approved' || (showPending && isPending(l))) &&
        l.start_date <= dateStr &&
        l.end_date >= dateStr
      )
      .sort((a, b) => Number(isPending(a)) - Number(isPending(b)) || a.employee_name.localeCompare(b.employee_name))
  }

  const selectedDayLeaves = selectedDay ? getLeavesForDay(selectedDay) : []
  const selApproved = selectedDayLeaves.filter(l => !isPending(l)).length
  const selPending = selectedDayLeaves.length - selApproved

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Approved = solid colour of the leave type. Pending = same colour as an outline with a dashed border.
  const chipStyle = (l: CalendarLeave): CSSProperties => {
    const c = l.leave_type_color ?? '#10b981'
    return isPending(l)
      ? { background: '#fff', color: '#334155', border: `1px dashed ${c}` }
      : { background: c, color: '#fff', border: `1px solid ${c}` }
  }

  const visibleTypes = Array.from(new Set(leaves.map(l => l.leave_type_name)))

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Calendar header */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <button
            onClick={prevMonth}
            aria-label="Previous month"
            className="p-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors"
          >
            <ChevronLeft size={18} className="text-slate-600" />
          </button>
          <div className="text-center">
            <h2 className="font-bold text-slate-900 text-lg">{monthName} {year}</h2>
            <p className="text-xs text-slate-500">{subtitle}{loading ? ' · loading…' : ''}</p>
          </div>
          <button
            onClick={nextMonth}
            aria-label="Next month"
            className="p-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors"
          >
            <ChevronRight size={18} className="text-slate-600" />
          </button>
        </div>

        {/* Admin only: pending requests are optional. The Rota Manager always sees them. */}
        {isHR && !isRota && (
          <div className="px-5 py-2.5 border-b border-slate-100">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer w-fit">
              <input type="checkbox" checked={adminPending} onChange={e => setAdminPending(e.target.checked)}
                className="w-4 h-4 accent-emerald-600" />
              Also show requests still waiting for approval
            </label>
          </div>
        )}

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
            <div key={`empty-${i}`} className="h-14 md:h-24 border-b border-r border-slate-100" />
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
                className={`h-14 md:h-24 border-b border-r border-slate-100 p-1 cursor-pointer transition-colors ${
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
                  {/* Desktop: up to two names, then a count of the rest */}
                  <div className="hidden md:block flex-1 space-y-0.5 overflow-hidden">
                    {dayLeaves.slice(0, 2).map((l, idx) => (
                      <div
                        key={idx}
                        className="box-border h-[18px] text-xs px-1 rounded truncate font-medium leading-4"
                        style={chipStyle(l)}
                        title={`${l.employee_name} · ${l.leave_type_name}${isPending(l) ? ' · ' + (l.stage_label ?? 'Pending') : ''}`}
                      >
                        {l.employee_name?.split(' ')[0]}
                      </div>
                    ))}
                    {dayLeaves.length > 2 && (
                      <div className="text-[11px] leading-4 text-slate-600 px-1 truncate">
                        +{dayLeaves.length - 2} more{showPending && dayLeaves.slice(2).some(isPending) ? ' (incl. pending)' : ''}
                      </div>
                    )}
                  </div>
                  {/* Phone: a count per kind — solid = approved, dashed = waiting for approval */}
                  {dayLeaves.length > 0 && (() => {
                    const pendingCount = dayLeaves.filter(isPending).length
                    const approvedCount = dayLeaves.length - pendingCount
                    return (
                      <div className="md:hidden flex items-center gap-1 text-[11px] font-semibold leading-none"
                        aria-label={`${approvedCount} approved${showPending ? `, ${pendingCount} pending` : ''}`}>
                        {approvedCount > 0 && (
                          <span className="min-w-[18px] h-[18px] px-1 rounded bg-slate-600 text-white flex items-center justify-center">{approvedCount}</span>
                        )}
                        {pendingCount > 0 && (
                          <span className="box-border min-w-[18px] h-[18px] px-1 rounded bg-white text-slate-700 flex items-center justify-center" style={{ border: '1px dashed #64748b' }}>{pendingCount}</span>
                        )}
                      </div>
                    )
                  })()}
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
            {monthName} {selectedDay} — {selectedDayLeaves.length === 0
              ? 'No leaves'
              : showPending
                ? `${selApproved} on approved leave${selPending > 0 ? `, ${selPending} pending approval` : ''}`
                : `${selectedDayLeaves.length} on leave`}
          </h3>
          {selectedDayLeaves.length === 0 ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <CalendarDays size={16} />
              {showPending ? 'Nobody has leave on this day' : 'Everyone is in today'}
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayLeaves.map(l => (
                <div key={l.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={isPending(l)
                      ? { background: '#fff', border: `2px dashed ${l.leave_type_color ?? '#10b981'}` }
                      : { background: l.leave_type_color ?? '#10b981' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{l.employee_name}</p>
                    <p className="text-xs text-slate-500">
                      {(isRota || isHR) && l.designation ? `${l.designation} · ` : ''}
                      {l.leave_type_name} · {l.start_date} → {l.end_date}
                    </p>
                  </div>
                  {isPending(l) && (
                    <span className="text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {l.stage_label ?? 'Pending'}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {parseFloat(l.total_days)}d
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
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {visibleTypes.map(name => {
            const leave = leaves.find(l => l.leave_type_name === name)
            return (
              <div key={name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <div className="w-3 h-3 rounded-full" style={{ background: leave?.leave_type_color ?? '#94a3b8' }} />
                {name}
              </div>
            )
          })}
          {leaves.length === 0 && (
            <p className="text-xs text-slate-400">
              {showPending ? 'No approved or pending leaves this month' : 'No approved leaves this month'}
            </p>
          )}
        </div>
        {showPending && (
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-6 h-3 rounded" style={{ background: '#64748b' }} /> Approved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-6 h-3 rounded bg-white" style={{ border: '1px dashed #64748b' }} /> Waiting for approval (may still be availed)
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
