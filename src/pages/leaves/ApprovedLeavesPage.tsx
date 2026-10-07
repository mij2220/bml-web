import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Download, RefreshCw, Search } from 'lucide-react'
import { getMyLeaves } from '../../api/leaves'
import { getNotifications } from '../../api/notifications'
import { downloadCSV } from '../../utils/tableUtils'
import StageBadge, { stageLabelOf } from '../../components/leaves/StageBadge'
import { useAuth } from '../../hooks/useAuth'
import type { LeaveApplication, Notification } from '../../types'

/**
 * Approved Leaves — NMPT Rota Manager (read-only).
 * Who in the unit is, or will be, away. Pending requests can be shown too,
 * because operators often avail leave before the approval is complete.
 * The latest approval / cancellation notices are listed alongside.
 */

type Show = 'approved' | 'pending' | 'both'
type When = 'current' | 'past' | 'all'

const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const fmtShort = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
// "6 Oct 2026" for one day, "6 – 9 Oct 2026" style ranges kept simple and unambiguous
const fmtPeriod = (from: string, to: string) =>
  from === to ? fmtDate(from)
    : from.slice(0, 4) === to.slice(0, 4) ? `${fmtShort(from)} – ${fmtDate(to)}`
    : `${fmtDate(from)} – ${fmtDate(to)}`

async function fetchAll(params: Record<string, string>): Promise<LeaveApplication[]> {
  // The list endpoint is paginated (100 per page at most)
  const out: LeaveApplication[] = []
  for (let page = 1; page <= 10; page++) {
    const { data } = await getMyLeaves({ ...params, page_size: '100', page: String(page) })
    out.push(...(data.data ?? []))
    if (!data.pagination?.next) break
  }
  return out
}

export default function ApprovedLeavesPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<LeaveApplication[]>([])
  const [notices, setNotices] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [show, setShow] = useState<Show>('approved')
  const [when, setWhen] = useState<When>('current')
  const [search, setSearch] = useState('')
  const today = todayIso()
  const latestRequest = useRef(0)

  const load = async () => {
    // If the person changes the filter again before this answer arrives, drop this answer
    const mine = ++latestRequest.current
    setLoading(true)
    setFailed(false)
    try {
      const params: Record<string, string> = {
        status: show === 'both' ? 'approved,pending' : show,
      }
      if (when === 'current') params.date_from = today
      if (when === 'past') params.date_to = today
      let list = await fetchAll(params)
      if (when === 'past') list = list.filter(l => l.end_date < today)
      list.sort((a, b) => when === 'past'
        ? b.start_date.localeCompare(a.start_date)
        : a.start_date.localeCompare(b.start_date))
      if (mine !== latestRequest.current) return
      setRows(list)
    } catch {
      if (mine !== latestRequest.current) return
      setFailed(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Approved Leaves'
    getNotifications()
      .then(r => setNotices((r.data.data ?? []).filter(n => ['leave_approved', 'leave_cancelled'].includes(n.type)).slice(0, 8)))
      .catch(() => {})
  }, [])

  useEffect(() => { load() }, [show, when])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(l =>
      [l.employee_name, l.employee_id_code ?? '', l.employee_p_number ?? '', l.leave_type_name, l.reference_number]
        .some(v => v.toLowerCase().includes(q)))
  }, [rows, search])

  const awayToday = rows.filter(l => l.status === 'approved' && l.start_date <= today && l.end_date >= today).length

  const handleDownload = () => {
    downloadCSV('unit-leaves.csv',
      ['Employee', 'P.No', 'Leave Type', 'From', 'To', 'Days', 'Status', 'Reference'],
      visible.map(l => [l.employee_name, l.employee_p_number || l.employee_id_code, l.leave_type_name,
        l.start_date, l.end_date, l.total_days, stageLabelOf(l), l.reference_number]))
  }

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors ${
      active ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Leave in {user?.department ?? 'your unit'}</h2>
        <p className="text-sm text-slate-500">
          View only. {when === 'current' && show !== 'pending' && !loading && !failed
            ? `${awayToday} ${awayToday === 1 ? 'person is' : 'people are'} on approved leave today.` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
        <div className="space-y-3 min-w-0">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-14">Show</span>
              {([['approved', 'Approved'], ['pending', 'Pending approval'], ['both', 'Both']] as [Show, string][]).map(([k, label]) => (
                <button key={k} onClick={() => setShow(k)} aria-pressed={show === k} className={chip(show === k)}>{label}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-14">When</span>
              {([['current', 'Today and upcoming'], ['past', 'Past'], ['all', 'All']] as [When, string][]).map(([k, label]) => (
                <button key={k} onClick={() => setWhen(k)} aria-pressed={when === k} className={chip(when === k)}>{label}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search name, P.No. or leave type" aria-label="Search leaves"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <button onClick={handleDownload} disabled={visible.length === 0}
                className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 font-medium disabled:opacity-50">
                <Download size={13} /> CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : failed ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <p className="text-slate-600 font-medium">Could not load the leave list.</p>
              <button onClick={load} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:underline">
                <RefreshCw size={14} /> Try again
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
              {rows.length === 0 ? 'No leave to show for this selection.' : 'Nothing matches your search.'}
            </div>
          ) : (
            <>
              <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Employee', 'Leave Type', 'Period', 'Days', 'Status'].map(h => (
                        <th key={h} className={`text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3 first:pl-4 last:pr-4 ${h === 'Days' ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visible.map(l => {
                      const away = l.status === 'approved' && l.start_date <= today && l.end_date >= today
                      return (
                        <tr key={l.id} className={away ? 'bg-amber-50/60' : ''}>
                          <td className="pl-4 pr-3 py-3">
                            <p className="text-sm font-semibold text-slate-900">{l.employee_name}</p>
                            <p className="text-xs text-slate-500">{l.employee_p_number || l.employee_id_code}{away ? ' · away today' : ''}</p>
                          </td>
                          <td className="px-3 py-3 text-sm">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.leave_type_color }} />
                              {l.leave_type_name}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-700 whitespace-nowrap">{fmtPeriod(l.start_date, l.end_date)}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-right tabular-nums">{parseFloat(l.total_days)}</td>
                          <td className="pl-3 pr-4 py-3"><StageBadge leave={l} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3">
                {visible.map(l => (
                  <div key={l.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm">{l.employee_name}</p>
                        <p className="text-xs text-slate-500">{l.employee_p_number || l.employee_id_code}</p>
                      </div>
                      <StageBadge leave={l} />
                    </div>
                    <p className="text-sm text-slate-700 mt-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.leave_type_color }} />
                      {l.leave_type_name} · {parseFloat(l.total_days)}d
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{fmtPeriod(l.start_date, l.end_date)}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 px-1">{visible.length} {visible.length === 1 ? 'entry' : 'entries'}</p>
            </>
          )}
        </div>

        {/* Latest notices */}
        <aside className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Bell size={15} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">Latest notices</h3>
          </div>
          {notices.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">
              You will be told here when a leave in your unit is approved or cancelled.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notices.map(n => (
                <li key={n.id} className={`px-4 py-3 ${!n.is_read ? 'bg-emerald-50/50' : ''}`}>
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.body}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  )
}
