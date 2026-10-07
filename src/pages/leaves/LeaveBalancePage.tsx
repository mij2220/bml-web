import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw } from 'lucide-react'
import { getMeBalances } from '../../api/leaves'
import type { LeaveBalance } from '../../types'

/**
 * Leave Balance — the Operator's first screen.
 * Columns asked for by the client:
 *   Leave Type | Total Entitlement | Total Availed | Balance | Total Splits
 * Rows are exactly the leave types the employee has a balance for (the same
 * ones the original dashboard listed).
 */

const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'))
  return Number.isFinite(n) ? n : 0
}
// 3 -> "3", 2.5 -> "2.5"
const days = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export default function LeaveBalancePage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<LeaveBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const year = new Date().getFullYear()

  const load = async () => {
    setLoading(true)
    setFailed(false)
    try {
      const { data } = await getMeBalances()
      setRows(data.data ?? [])
    } catch {
      setFailed(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Leave Balance'
    load()
  }, [])

  const view = rows.map(b => {
    const entitlement = num(b.allocated_days ?? b.allocated)
    const availed = num(b.used_days ?? b.used)
    const balance = num(b.remaining_days ?? b.available)
    const splitsAllowed = b.splits_allowed ?? 0
    const splitsUsed = b.splits_used ?? 0
    return {
      key: b.leave_type ?? b.leave_type_id ?? b.leave_type_code,
      name: b.leave_type_name,
      code: b.leave_type_code,
      color: b.leave_type_color ?? '#94a3b8',
      entitlement, availed, balance, splitsAllowed, splitsUsed,
      splitsFull: splitsAllowed > 0 && splitsUsed >= splitsAllowed,
    }
  })

  const splitsText = (r: (typeof view)[number]) =>
    r.splitsAllowed > 0 ? `${r.splitsUsed} of ${r.splitsAllowed}` : '—'

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-900">My leave balance</h2>
          <p className="text-sm text-slate-500">Year {year}. Balance is your entitlement less the leave already approved.</p>
        </div>
        <button
          onClick={() => navigate('/apply-leave')}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} /> Apply Leave
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : failed ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <p className="text-slate-600 font-medium">Could not load your leave balance.</p>
          <button onClick={load} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:underline">
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      ) : view.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
          No leave balance has been set up for you yet. Please contact Admin.
        </div>
      ) : (
        <>
          {/* Desktop / tablet: table */}
          <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Leave Type</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Total Entitlement</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Total Availed</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Balance</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Total Splits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {view.map(r => (
                  <tr key={r.key} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                        {r.name}
                        <span className="text-xs font-normal text-slate-400">{r.code}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-700 tabular-nums">{days(r.entitlement)}</td>
                    <td className="px-4 py-3 text-right text-sm text-slate-700 tabular-nums">{days(r.availed)}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-slate-900 tabular-nums">{days(r.balance)}</td>
                    <td className={`px-4 py-3 text-right text-sm tabular-nums ${r.splitsFull ? 'text-red-600 font-semibold' : 'text-slate-700'}`}>
                      {splitsText(r)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone: one card per leave type */}
          <div className="sm:hidden space-y-3">
            {view.map(r => (
              <div key={r.key} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                  <span className="font-semibold text-slate-900 text-sm">{r.name}</span>
                  <span className="text-xs text-slate-400">{r.code}</span>
                </div>
                <dl className="grid grid-cols-4 gap-2 text-center">
                  {[
                    ['Entitlement', days(r.entitlement), 'text-slate-700'],
                    ['Availed', days(r.availed), 'text-slate-700'],
                    ['Balance', days(r.balance), 'text-slate-900 font-bold'],
                    ['Splits', splitsText(r), r.splitsFull ? 'text-red-600 font-semibold' : 'text-slate-700'],
                  ].map(([label, value, cls]) => (
                    <div key={label}>
                      <dd className={`text-base tabular-nums ${cls}`}>{value}</dd>
                      <dt className="text-[11px] text-slate-500 mt-0.5">{label}</dt>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 px-1">
            Availed counts approved leave, including approved leave that has not started yet.
            Splits: how many separate times you have taken this leave, out of the number allowed this year;
            a dash means there is no limit on splits for that leave type.
          </p>
        </>
      )}
    </div>
  )
}
