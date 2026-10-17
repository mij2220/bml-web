import { useState } from 'react'
import api from '../../api/client'
import { downloadCSV } from '../../utils/tableUtils'

const PLACE: Record<string, string> = { '': 'Staff', supervisor: 'Supervisor / Engineer', sic: 'SIC', manager: 'Unit Manager' }
const ACTION: Record<string, [string, string]> = {
  create: ['New - login created', 'bg-emerald-100 text-emerald-800'],
  update: ['Updated', 'bg-sky-100 text-sky-800'],
  same: ['No change', 'bg-slate-100 text-slate-500'],
  skip: ['Skipped', 'bg-amber-100 text-amber-800'],
}

/** Admin > Employees > Load organogram: Engro's organogram Excel (sheet
 *  "Staff List") sets each person's unit and place, and creates missing people
 *  with a login. Preview first; nothing changes until "Load". */
export default function OrganogramModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [res, setRes] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('')

  const send = async (apply: boolean) => {
    if (!file) return
    if (apply && !confirm('Load the organogram? Units and places are updated and new people get a login. Nothing is deleted.')) return
    setBusy(true); setErr('')
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('apply', apply ? 'true' : 'false')
      const r = await api.post('/employees/organogram-import/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setRes(r.data.data)
      if (apply) onDone()
    } catch (e: any) { setErr(e.response?.data?.message ?? 'Could not read the file.') }
    finally { setBusy(false) }
  }

  const rows = (res?.rows ?? []).filter((r: any) => !filter || r.action === filter)
  const s = res?.summary ?? {}

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Load organogram</h2>
          <p className="text-sm text-slate-500">Engro's organogram Excel (sheet "Staff List": Unit, Level, Name, Cadre / P.No, Role). People are matched by P.No., otherwise by name. Their unit and place (Unit Manager, SIC, Supervisor / Engineer, staff) are set, and anyone not yet in the app gets an employee record and a login. Nothing is deleted.</p>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-2">
            <input type="file" accept=".xlsx" onChange={e => { setFile(e.target.files?.[0] ?? null); setRes(null) }} className="text-sm" />
            <button disabled={!file || busy} onClick={() => send(false)} className="px-3 py-2 rounded-lg text-sm border border-slate-300 disabled:opacity-40">Preview</button>
            <button disabled={!file || busy || !res || res.applied} onClick={() => send(true)} className="px-3 py-2 rounded-lg text-sm bg-emerald-600 text-white disabled:bg-slate-200 disabled:text-slate-500">Load</button>
            {busy && <span className="text-sm text-slate-400">Working…</span>}
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          {res && (
            <>
              <div className={`text-sm rounded-xl p-3 ${res.applied ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                {res.applied ? 'Loaded. ' : 'Preview - nothing has changed yet. '}
                {s.create ?? 0} new, {s.update ?? 0} updated, {s.same ?? 0} unchanged, {s.skip ?? 0} skipped.
                {s.new_units?.length ? ` New units: ${s.new_units.join(', ')}.` : ''}
                {s.sic_links ? ` Shared SICs: ${s.sic_links} link(s) (AMM-3 SICs also cover URUT-3, AMM-2 cover Urea-2, URUT-1 cover PM&S).` : ''}
                {!res.applied && ' New people get gender "male", joining date 1 Jan 2026 and a temporary MPT ID when the sheet has no P.No. - correct them afterwards in their record.'}
              </div>
              {res.applied && res.logins?.length > 0 && (
                <button onClick={() => downloadCSV('new-logins.csv', ['Name', 'Unit', 'Place', 'Sign in with', 'First password'],
                  res.logins.map((l: any) => [l.name, l.unit, PLACE[l.place === 'staff' ? '' : l.place] ?? l.place, l.login, l.password]))}
                  className="px-3 py-2 rounded-lg text-sm bg-slate-800 text-white">Download the {res.logins.length} new logins (CSV)</button>
              )}
              <div className="flex gap-1 text-xs">
                {['', 'create', 'update', 'same', 'skip'].map(k => (
                  <button key={k} onClick={() => setFilter(k)} className={`px-2 py-1 rounded-full border ${filter === k ? 'bg-slate-800 text-white' : 'border-slate-300'}`}>
                    {k ? ACTION[k][0] : 'All'} {k ? `(${s[k] ?? 0})` : ''}
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500"><tr>
                    <th className="text-left p-2">Name</th><th className="text-left p-2">Unit</th><th className="text-left p-2">Place</th>
                    <th className="text-left p-2">P.No. / cadre</th><th className="text-left p-2">Result</th><th className="text-left p-2">Details</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r: any, i: number) => (
                      <tr key={i}>
                        <td className="p-2 font-medium">{r.name}{r.current_name && r.current_name !== r.name ? <div className="text-slate-400">in app: {r.current_name}</div> : null}</td>
                        <td className="p-2">{r.unit_name ?? r.unit}</td>
                        <td className="p-2">{PLACE[r.unit_role] ?? r.unit_role}</td>
                        <td className="p-2">{r.p_number || r.cadre}</td>
                        <td className="p-2"><span className={`px-2 py-0.5 rounded-full ${ACTION[r.action]?.[1]}`}>{ACTION[r.action]?.[0] ?? r.action}</span></td>
                        <td className="p-2 text-slate-500">{[...(r.changes ?? []), ...(r.also_covers?.length ? [`also covers ${r.also_covers.join(', ')}`] : [])].join('; ') || r.reason || (r.matched_by ? `matched by ${r.matched_by}` : '')}{r.login ? ` · sign in: ${r.login}` : ''}</td>
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
