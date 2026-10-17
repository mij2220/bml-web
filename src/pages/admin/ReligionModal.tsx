import { useState } from 'react'
import api from '../../api/client'

const ACTION: Record<string, [string, string]> = {
  update: ['Will change', 'bg-sky-100 text-sky-800'],
  same: ['No change', 'bg-slate-100 text-slate-500'],
  skip: ['Skipped', 'bg-amber-100 text-amber-800'],
}

/** Admin > Employees > Load religion list (Engro, 17 Oct 2026): religion-based
 *  gazetted holidays go only to people of that religion. Excel or CSV with a
 *  "Religion" column and "P.No" / "Employee ID" / "Name". Preview first; only the
 *  religion field changes. */
export default function ReligionModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [res, setRes] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('')

  const send = async (apply: boolean) => {
    if (!file) return
    if (apply && !confirm('Save the religion of the matched people? Nothing else changes.')) return
    setBusy(true); setErr('')
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('apply', apply ? 'true' : 'false')
      const r = await api.post('/employees/religion-import/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setRes(r.data.data)
      if (apply) onDone()
    } catch (e: any) { setErr(e.response?.data?.message ?? 'Could not read the file.') }
    finally { setBusy(false) }
  }

  const rows = (res?.rows ?? []).filter((r: any) => !filter || r.action === filter)
  const s = res?.summary ?? {}
  const by = Object.entries(s.by_religion ?? {}).map(([k, v]) => `${k} ${v}`).join(', ')

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Load religion list</h2>
          <p className="text-sm text-slate-500">Excel or CSV with a <b>Religion</b> column and a <b>P.No</b>, <b>Employee ID</b> or <b>Name</b> column. People are matched by P.No., then Employee ID, then name (only when exactly one person has it). Holidays marked for one religion (Admin &gt; Gazetted Holidays) then apply only to those people. Only the religion is changed.</p>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-2">
            <input type="file" accept=".xlsx,.csv" onChange={e => { setFile(e.target.files?.[0] ?? null); setRes(null) }} className="text-sm" />
            <button disabled={!file || busy} onClick={() => send(false)} className="px-3 py-2 rounded-lg text-sm border border-slate-300 disabled:opacity-40">Preview</button>
            <button disabled={!file || busy || !res || res.applied} onClick={() => send(true)} className="px-3 py-2 rounded-lg text-sm bg-emerald-600 text-white disabled:bg-slate-200 disabled:text-slate-500">Save</button>
            {busy && <span className="text-sm text-slate-400">Working…</span>}
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          {res && (
            <>
              <div className={`text-sm rounded-xl p-3 ${res.applied ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                {res.applied ? 'Saved. ' : 'Preview - nothing has changed yet. '}
                {s.update ?? 0} to change, {s.same ?? 0} unchanged, {s.skip ?? 0} skipped.{by ? ` In the list: ${by}.` : ''}
              </div>
              <div className="flex gap-1 text-xs">
                {['', 'update', 'same', 'skip'].map(k => (
                  <button key={k} onClick={() => setFilter(k)} className={`px-2 py-1 rounded-full border ${filter === k ? 'bg-slate-800 text-white' : 'border-slate-300'}`}>
                    {k ? ACTION[k][0] : 'All'} {k ? `(${s[k] ?? 0})` : ''}
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500"><tr>
                    <th className="text-left p-2">In the file</th><th className="text-left p-2">P.No. / ID</th><th className="text-left p-2">Religion</th>
                    <th className="text-left p-2">Result</th><th className="text-left p-2">Details</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r: any, i: number) => (
                      <tr key={i}>
                        <td className="p-2 font-medium">{r.name || '-'}{r.current_name && r.current_name !== r.name ? <div className="text-slate-400">in app: {r.current_name}</div> : null}</td>
                        <td className="p-2">{r.p_number || r.employee_id}</td>
                        <td className="p-2">{r.religion_text}</td>
                        <td className="p-2"><span className={`px-2 py-0.5 rounded-full ${ACTION[r.action]?.[1]}`}>{ACTION[r.action]?.[0] ?? r.action}</span></td>
                        <td className="p-2 text-slate-500">{r.reason || (r.action === 'update' ? `${r.current_label} -> ${r.new_label}` : '')}{r.matched_by ? ` · matched by ${r.matched_by}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 text-right">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-slate-300">Close</button>
        </div>
      </div>
    </div>
  )
}
