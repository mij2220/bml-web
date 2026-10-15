import { useEffect, useState } from 'react'
import { shiftsApi, errMsg, num } from '../../api/shifts'
import { Card, Spinner, Note, Btn, Chip, Field, inputCls, setTitle } from '../../components/shifts/ui'

const DAY_TYPES = [
  ['WORK', 'Working day'], ['FO', 'First Day Off'], ['SO', 'Second Day Off'], ['GH', 'Gazetted holiday'],
]
const KINDS = [['normal', 'Normal overtime'], ['training', 'Training overtime'], ['callout', 'Emergency call-out']]

/** Try the overtime rules on one case, and check them against the SOP's worked examples. */
export default function CalculatorPage() {
  const [info, setInfo] = useState<any>(null)
  const [f, setF] = useState({ day_type: 'WORK', kind: 'normal', hours: '2', crew_complete: false, shift: 'M' })
  const [res, setRes] = useState<any>(null)
  const [err, setErr] = useState('')

  useEffect(() => { setTitle('Overtime calculator'); shiftsApi.calculator().then(setInfo).catch(e => setErr(errMsg(e))) }, [])
  const run = async () => {
    setErr('')
    try { setRes(await shiftsApi.calculate(f)) } catch (e) { setRes(null); setErr(errMsg(e)) }
  }
  useEffect(() => { run() }, [f])

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Note kind="warn">The rules below are our reading of the overtime SOP and are <b>not yet confirmed by Engro</b>. Use this page to check them; Admin can change the numbers under Overtime rules.</Note>
      <Card className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <Field label="Day"><select className={inputCls} value={f.day_type} onChange={e => setF({ ...f, day_type: e.target.value })}>{DAY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Kind"><select className={inputCls} value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Hours"><input type="number" min="0.5" max="24" step="0.5" className={inputCls} value={f.hours} onChange={e => setF({ ...f, hours: e.target.value })} /></Field>
        <Field label="Shift worked"><select className={inputCls} value={f.shift} onChange={e => setF({ ...f, shift: e.target.value })}><option value="M">Morning</option><option value="E">Evening</option><option value="N">Night</option><option value="G">General</option></select></Field>
        <label className="flex items-center gap-2 text-sm min-h-[40px]">
          <input type="checkbox" checked={f.crew_complete} disabled={f.day_type !== 'WORK' || f.kind === 'callout'} onChange={e => setF({ ...f, crew_complete: e.target.checked })} />
          48-hour week already complete
        </label>
      </Card>
      {err && <Note kind="error">{err}</Note>}
      {res && (
        <Card className="p-4">
          <p className="text-sm text-slate-700 mb-3">{res.explanation}.</p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center">
            {[['Single', res.single], ['Double', res.double], ['Triple', res.triple], ['Paid as (single-rate hours)', res.equivalent_single],
              ['Evening premium hours', res.evening_premium_hours], ['Night premium hours', res.night_premium_hours]].map(([l, v]) => (
              <div key={l} className="bg-slate-50 rounded-xl p-3"><div className="text-xs text-slate-500">{l}</div><div className="text-xl font-bold">{num(v)}</div></div>
            ))}
          </div>
        </Card>
      )}
      <Card className="p-4">
        <h3 className="font-semibold text-slate-800 mb-2">Worked examples from the SOP</h3>
        {!info ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500"><tr><th className="text-left py-2">Situation</th><th>SOP says</th><th>System gives</th><th></th><th></th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {info.examples.map((e: any) => (
                  <tr key={e.title}>
                    <td className="py-2">{e.title}<div className="text-xs text-slate-500">{e.result.explanation}</div></td>
                    <td className="text-center">{e.expected} h</td>
                    <td className="text-center font-semibold">{num(e.result.equivalent_single)} h</td>
                    <td className="text-center">{e.matches_sop ? <Chip tone="green">Matches</Chip> : <Chip tone="red">Differs</Chip>}</td>
                    <td className="text-right"><Btn onClick={() => setF({ day_type: e.day_type, kind: e.kind, hours: String(e.hours), crew_complete: e.crew_complete, shift: 'M' })}>Try</Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
