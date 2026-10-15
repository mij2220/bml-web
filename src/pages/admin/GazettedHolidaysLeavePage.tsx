import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import api from '../../api/client'

type Holiday = { id: string; date: string; name: string; counts_as_gh: boolean; is_optional: boolean }

const msgOf = (e: any) => e?.response?.data?.message || 'Something went wrong. Please try again.'

/** Gazetted holidays (Engro, 15 Oct 2026). Staff who work on one get a compensatory day,
 *  given by their Supervisor / SIC from the person's Leave Balances. */
export default function GazettedHolidaysLeavePage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [rows, setRows] = useState<Holiday[] | null>(null)
  const [f, setF] = useState({ date: '', name: '' })
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = (y = year) => {
    setRows(null)
    api.get(`/gazetted-holidays/?year=${y}`)
      .then(r => setRows(r.data?.data ?? []))
      .catch(e => { setRows([]); setMsg({ text: msgOf(e), ok: false }) })
  }
  useEffect(() => { const t = document.getElementById('page-title'); if (t) t.textContent = 'Gazetted Holidays' }, [])
  useEffect(() => { load(year) }, [year])

  const add = async () => {
    setBusy(true); setMsg(null)
    try {
      await api.post('/gazetted-holidays/', f)
      setMsg({ text: `${f.name} added.`, ok: true })
      const y = Number(f.date.slice(0, 4)); setF({ date: '', name: '' })
      if (y !== year) setYear(y); else load(year)
    } catch (e) { setMsg({ text: msgOf(e), ok: false }) } finally { setBusy(false) }
  }
  const remove = async (h: Holiday) => {
    if (!confirm(`Remove ${h.name} (${h.date})?`)) return
    setMsg(null)
    try { await api.delete(`/gazetted-holidays/${h.id}/`); setMsg({ text: `${h.name} removed.`, ok: true }); load(year) }
    catch (e) { setMsg({ text: msgOf(e), ok: false }) }
  }

  const input = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <p className="text-sm text-slate-600 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
        Staff who work on a gazetted holiday get one compensatory day (CD). Their Supervisor or SIC adds it
        from the person's <b>Leave Balances</b> in Employees.
      </p>
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setYear(year - 1)} aria-label="Previous year"><ChevronLeft size={18} /></button>
        <h2 className="text-lg font-bold">{year}</h2>
        <button className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setYear(year + 1)} aria-label="Next year"><ChevronRight size={18} /></button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-[170px_1fr_auto] gap-3 items-end">
        <label className="text-xs font-medium text-slate-600">Date
          <input type="date" className={input + ' mt-1'} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
        <label className="text-xs font-medium text-slate-600">Holiday
          <input className={input + ' mt-1'} value={f.name} placeholder="e.g. Pakistan Day" onChange={e => setF({ ...f, name: e.target.value })} /></label>
        <button disabled={!f.date || !f.name.trim() || busy} onClick={add}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg">Add</button>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}
      {!rows ? <p className="text-sm text-slate-400">Loading…</p> : rows.length === 0
        ? <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">No gazetted holidays for {year} yet.</div>
        : (
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {rows.map(h => (
              <div key={h.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="w-40 font-semibold">{new Date(h.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span className="flex-1">{h.name}</span>
                <button aria-label={`Remove ${h.name}`} className="p-2 rounded-lg hover:bg-red-50 text-red-600" onClick={() => remove(h)}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
