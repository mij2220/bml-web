import { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Download, RefreshCw, Search } from 'lucide-react'
import { getTeamDashboard } from '../../api/leaves'
import { downloadCSV } from '../../utils/tableUtils'
import type { TeamDashboard, TeamDashboardLeaveRef, TeamDashboardRow } from '../../types'

/**
 * Employee Leave Dashboard — Shift Supervisor / SIC.
 * One row per employee under the signed-in person:
 *   Employee Name | Total Leave Availed | Annual Leave Availed | BD Availed |
 *   Other Leave Types | Leave Balance | Current Leave Status
 */

const days = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

const period = (l: TeamDashboardLeaveRef) =>
  l.start_date === l.end_date ? fmtDate(l.start_date) : `${fmtDate(l.start_date)} – ${fmtDate(l.end_date)}`

function otherText(r: TeamDashboardRow) {
  if (r.other_breakdown.length === 0) return '—'
  return r.other_breakdown.map(o => `${o.code} ${days(o.used)}`).join(', ')
}

function statusText(r: TeamDashboardRow) {
  const parts: string[] = []
  if (r.on_leave_now) parts.push(`On leave (${r.on_leave_now.leave_type_code}) until ${fmtDate(r.on_leave_now.end_date)}`)
  if (r.upcoming_leave) parts.push(`Next: ${r.upcoming_leave.leave_type_code} ${period(r.upcoming_leave)}`)
  return parts.length ? parts.join('; ') : 'Available'
}

function CurrentStatus({ r }: { r: TeamDashboardRow }) {
  return (
    <div className="space-y-1">
      {r.on_leave_now && (
        <div>
          <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            On leave
          </span>
          <span className="block text-xs text-slate-600 mt-0.5">
            {r.on_leave_now.leave_type_code} until {fmtDate(r.on_leave_now.end_date)}
          </span>
        </div>
      )}
      {r.upcoming_leave && (
        <div>
          <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
            Upcoming
          </span>
          <span className="block text-xs text-slate-600 mt-0.5">
            {r.upcoming_leave.leave_type_code} {period(r.upcoming_leave)} ({days(r.upcoming_leave.total_days)}d)
          </span>
        </div>
      )}
      {!r.on_leave_now && !r.upcoming_leave && (
        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
          Available
        </span>
      )}
      {r.pending_requests > 0 && (
        <span className="block text-xs text-slate-500">
          {r.pending_requests} request{r.pending_requests > 1 ? 's' : ''} awaiting approval
        </span>
      )}
    </div>
  )
}

function Breakdown({ r }: { r: TeamDashboardRow }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-500">
            <th className="text-left font-semibold py-1.5 pr-3">Leave type</th>
            <th className="text-right font-semibold py-1.5 px-3">Entitlement</th>
            <th className="text-right font-semibold py-1.5 px-3">Availed</th>
            <th className="text-right font-semibold py-1.5 px-3">Balance</th>
            <th className="text-right font-semibold py-1.5 pl-3">Splits</th>
          </tr>
        </thead>
        <tbody>
          {r.balances.map(b => (
            <tr key={b.code} className="border-t border-slate-200">
              <td className="py-1.5 pr-3 text-slate-800">
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: b.color }} />
                {b.name} <span className="text-slate-400">{b.code}</span>
              </td>
              <td className="py-1.5 px-3 text-right tabular-nums text-slate-700">{days(b.allocated)}</td>
              <td className="py-1.5 px-3 text-right tabular-nums text-slate-700">{days(b.used)}</td>
              <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-slate-900">{days(b.available)}</td>
              <td className="py-1.5 pl-3 text-right tabular-nums text-slate-700">
                {b.splits_allowed > 0 ? `${b.splits_used} of ${b.splits_allowed}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function TeamLeaveDashboardPage() {
  const [data, setData] = useState<TeamDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_leave' | 'upcoming' | 'available'>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await getTeamDashboard()
      setData(res.data.data)
    } catch {
      setFailed(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Employee Leave Dashboard'
    load()
  }, [])

  const all = data?.employees ?? []
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return all.filter(r => {
      if (statusFilter === 'on_leave' && !r.on_leave_now) return false
      if (statusFilter === 'upcoming' && !r.upcoming_leave) return false
      if (statusFilter === 'available' && (r.on_leave_now || r.upcoming_leave)) return false
      if (!q) return true
      return [r.full_name, r.employee_id, r.p_number ?? '', r.designation ?? '']
        .some(v => v.toLowerCase().includes(q))
    })
  }, [all, search, statusFilter])

  const counts = {
    all: all.length,
    on_leave: all.filter(r => r.on_leave_now).length,
    upcoming: all.filter(r => r.upcoming_leave).length,
    available: all.filter(r => !r.on_leave_now && !r.upcoming_leave).length,
  }

  const handleDownload = () => {
    downloadCSV(`employee-leave-dashboard-${data?.year ?? ''}.csv`,
      ['Employee', 'P.No', 'Designation', 'Total Leave Availed', 'Annual Leave Availed', 'BD Availed',
        'Other Leave Types', 'Leave Balance', 'Current Leave Status'],
      rows.map(r => [r.full_name, r.p_number || r.employee_id, r.designation ?? '', days(r.total_availed),
        days(r.al_availed), days(r.bd_availed), otherText(r), days(r.total_balance), statusText(r)]))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (failed) return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-10 text-center">
      <p className="text-slate-600 font-medium">Could not load the dashboard.</p>
      <button onClick={load} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:underline">
        <RefreshCw size={14} /> Try again
      </button>
    </div>
  )

  const filters: [typeof statusFilter, string][] = [
    ['all', 'All'], ['on_leave', 'On leave today'], ['upcoming', 'Upcoming leave'], ['available', 'Available'],
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          {data?.is_admin_view ? 'All employees' : 'Employees under you'}
        </h2>
        <p className="text-sm text-slate-500">
          Leave availed and balance for {data?.year}. Select a row to see every leave type.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or P.No."
            aria-label="Search employees"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {filters.map(([key, label]) => (
            <button key={key} onClick={() => setStatusFilter(key)} aria-pressed={statusFilter === key}
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                statusFilter === key
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              {label} <span className={statusFilter === key ? 'text-white' : 'text-slate-500'}>{counts[key]}</span>
            </button>
          ))}
        </div>
        <button onClick={handleDownload} disabled={rows.length === 0}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 font-medium disabled:opacity-50">
          <Download size={13} /> CSV
        </button>
      </div>

      {all.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          No employees are assigned to you yet. Admin sets each employee's Supervisor and SIC on the employee's profile.
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
          No employee matches. <button onClick={() => { setSearch(''); setStatusFilter('all') }} className="text-emerald-600 font-semibold hover:underline">Clear search and filter</button>
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Employee Name', 'Total Leave Availed', 'Annual Leave Availed', 'BD Availed', 'Other Leave Types', 'Leave Balance', 'Current Leave Status', ''].map((h, i) => (
                    <th key={i} className={`text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 ${i >= 1 && i <= 3 || i === 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => {
                  const open = openId === r.id
                  return (
                    <Fragment key={r.id}>
                      <tr className="hover:bg-slate-50 cursor-pointer align-top" onClick={() => setOpenId(open ? null : r.id)}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-slate-900">{r.full_name}</p>
                          <p className="text-xs text-slate-500">{r.p_number || r.employee_id}{r.designation ? ` · ${r.designation}` : ''}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 tabular-nums">{days(r.total_availed)}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-700 tabular-nums">{days(r.al_availed)}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-700 tabular-nums">{days(r.bd_availed)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{otherText(r)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 tabular-nums">{days(r.total_balance)}</td>
                        <td className="px-4 py-3"><CurrentStatus r={r} /></td>
                        <td className="px-2 py-3 text-slate-400">
                          <button aria-label={open ? `Hide leave types for ${r.full_name}` : `Show leave types for ${r.full_name}`} aria-expanded={open}
                            className="p-1 rounded hover:bg-slate-100">
                            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-slate-50">
                          <td colSpan={8} className="px-4 py-3"><Breakdown r={r} /></td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Phone: cards */}
          <div className="md:hidden space-y-3">
            {rows.map(r => {
              const open = openId === r.id
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <button className="w-full text-left p-4" onClick={() => setOpenId(open ? null : r.id)} aria-expanded={open}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm">{r.full_name}</p>
                        <p className="text-xs text-slate-500">{r.p_number || r.employee_id}{r.designation ? ` · ${r.designation}` : ''}</p>
                      </div>
                      {open ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0 mt-0.5" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />}
                    </div>
                    <dl className="grid grid-cols-4 gap-2 text-center mt-3">
                      {[['Availed', r.total_availed], ['Annual', r.al_availed], ['BD', r.bd_availed], ['Balance', r.total_balance]].map(([label, v]) => (
                        <div key={label as string}>
                          <dd className="text-base font-bold text-slate-900 tabular-nums">{days(v as number)}</dd>
                          <dt className="text-[11px] text-slate-500">{label}</dt>
                        </div>
                      ))}
                    </dl>
                    {r.other_breakdown.length > 0 && (
                      <p className="text-xs text-slate-600 mt-2">Other: {otherText(r)}</p>
                    )}
                    <div className="mt-3"><CurrentStatus r={r} /></div>
                  </button>
                  {open && <div className="border-t border-slate-100 bg-slate-50 px-4 py-3"><Breakdown r={r} /></div>}
                </div>
              )
            })}
          </div>

          <p className="text-xs text-slate-500 px-1">
            Leave Balance is the total still available across all leave types. Availed counts approved leave,
            including approved leave that has not started yet. Showing {rows.length} of {all.length}.
          </p>
        </>
      )}
    </div>
  )
}
