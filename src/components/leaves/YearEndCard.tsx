import { useEffect, useState } from 'react'
import api from '../../api/client'

interface Row {
  employee_id: string; name: string; p_number: string; unit: string
  allocated: number | null; carried_in: number | null; used: number | null; left: number | null
  carry: number; lapsed: number; next_allocated: number; next_carried: number | null; next_exists: boolean; next_tier: string
}
interface Data {
  year: number; next_year: number; rows: Row[]; can_create: boolean; can_carry: boolean
  create_from: string; carry_from: string
  totals: { people: number; carry: number; lapsed: number; missing_next: number }
}

const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const n = (v: number | null) => (v == null ? '–' : Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }))

/** Year end (Engro, 16 Oct 2026): next year's balances, then annual leave carry
 *  forward capped at one year's allocation. Nothing runs by itself on the live
 *  server, so Admin starts each step here. */
export default function YearEndCard() {
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(new Date().getMonth() === 0 ? thisYear - 1 : thisYear)
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const load = () => {
    setData(null); setErr('')
    api.get('/leaves/year-end/', { params: { year } }).then(r => setData(r.data.data)).catch(e => setErr(e.response?.data?.message ?? 'Could not load.'))
  }
  useEffect(load, [year])

  const run = async (step: 'create' | 'carry') => {
    const text = step === 'create'
      ? `Create the ${year + 1} leave balances for everyone who does not have them yet?`
      : `Apply the carry forward from ${year}? Each person carries what is left of ${year} annual leave, up to one year's allocation; the rest lapses. You can run it again later; it recalculates.`
    if (!confirm(text)) return
    setBusy(true); setMsg('')
    try { const r = await api.post('/leaves/year-end/', { year, step }); setMsg(r.data.message); load() }
    catch (e: any) { setMsg(e.response?.data?.message ?? 'Could not run.') }
    finally { setBusy(false) }
  }

  const rows = (data?.rows ?? []).filter(r => !q || (r.name + r.p_number + r.unit).toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">Year end</p>
          <p className="text-xs text-slate-500">Annual leave left over carries into the next year only, up to one year's allocation (21 or 30 days); anything above lapses.</p>
        </div>
        <select value={year} onChange={e => setYear(Number(e.target.value))} className="text-sm border border-slate-300 rounded-lg px-3 py-2">
          {[thisYear - 1, thisYear, thisYear + 1].map(y => <option key={y} value={y}>Close {y}</option>)}
        </select>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {!data ? (!err && <p className="text-sm text-slate-400">Loading…</p>) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
            {[['People', data.totals.people], ['Days to carry', data.totals.carry], ['Days that lapse', data.totals.lapsed], [`Without ${data.next_year} balance`, data.totals.missing_next]].map(([l, v]) => (
              <div key={String(l)} className="bg-slate-50 rounded-xl p-2"><div className="text-[11px] text-slate-500">{l}</div><div className="text-lg font-bold">{n(Number(v))}</div></div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-2">
            <div className="border border-slate-200 rounded-xl p-3">
              <p className="text-sm font-semibold">1. Create {data.next_year} balances</p>
              <p className="text-xs text-slate-500 mb-2">From {fmt(data.create_from)}. Everyone gets next year's quota (annual leave by experience) so leave for next year can be applied for. Existing balances are not changed.</p>
              <button disabled={!data.can_create || busy} onClick={() => run('create')}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white disabled:bg-slate-200 disabled:text-slate-500">
                {data.can_create ? `Create ${data.next_year} balances` : `Available from ${fmt(data.create_from)}`}
              </button>
            </div>
            <div className="border border-slate-200 rounded-xl p-3">
              <p className="text-sm font-semibold">2. Carry forward from {data.year}</p>
              <p className="text-xs text-slate-500 mb-2">From {fmt(data.carry_from)}, after the year has ended. Safe to run again (for example after a late leave is approved); it recalculates.</p>
              <button disabled={!data.can_carry || busy} onClick={() => run('carry')}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white disabled:bg-slate-200 disabled:text-slate-500">
                {data.can_carry ? 'Apply carry forward' : `Available from ${fmt(data.carry_from)}`}
              </button>
            </div>
          </div>
          {msg && <p className="text-sm text-emerald-700">{msg}</p>}
          <button onClick={() => setOpen(!open)} className="text-sm text-emerald-700 font-medium">{open ? 'Hide' : 'Show'} the effect per person</button>
          {open && (
            <div className="space-y-2">
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, P.No. or unit" className="w-full md:w-72 text-sm border border-slate-300 rounded-lg px-3 py-2" />
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-slate-100 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0"><tr>
                    <th className="text-left p-2">Name</th><th className="text-left p-2">Unit</th>
                    <th className="p-2">{data.year} allocated</th><th className="p-2">Carried in</th><th className="p-2">Used</th><th className="p-2">Left</th>
                    <th className="p-2">Carry</th><th className="p-2">Lapse</th><th className="p-2">{data.next_year} allocation</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map(r => (
                      <tr key={r.employee_id}>
                        <td className="p-2"><b>{r.name}</b><div className="text-slate-400">{r.p_number}</div></td>
                        <td className="p-2">{r.unit}</td>
                        <td className="p-2 text-center">{n(r.allocated)}</td><td className="p-2 text-center">{n(r.carried_in)}</td>
                        <td className="p-2 text-center">{n(r.used)}</td><td className="p-2 text-center">{n(r.left)}</td>
                        <td className="p-2 text-center font-semibold text-emerald-700">{n(r.carry)}</td>
                        <td className={`p-2 text-center ${r.lapsed ? 'text-red-600 font-semibold' : ''}`}>{n(r.lapsed)}</td>
                        <td className="p-2 text-center">{n(r.next_allocated)} <span className="text-slate-400">({r.next_tier})</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
