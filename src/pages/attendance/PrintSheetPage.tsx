import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Printer, ArrowLeft } from 'lucide-react'
import { shiftsApi, errMsg, num, type Sheet } from '../../api/shifts'
import { Btn, Spinner, Note, setTitle } from '../../components/shifts/ui'

/** The daily sheet laid out like Engro's paper form (A-22), for printing and the PRD file. */
export default function PrintSheetPage() {
  const nav = useNavigate()
  const [q] = useSearchParams()
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    setTitle('Print sheet')
    shiftsApi.sheet(q.get('section') ?? '', q.get('date') ?? '').then(s => s ? setSheet(s) : setErr('This day has not been started.')).catch(e => setErr(errMsg(e)))
  }, [])
  if (err) return <Note kind="error">{err}</Note>
  if (!sheet) return <Spinner />
  const code = (s: string) => sheet.shifts.find(x => x.code === s)?.sheet_code ?? ''
  const groups = Array.from(new Set(sheet.entries.map(e => e.group))).sort()
  const extras = (eid: string) => sheet.extras.filter(x => x.employee_id === eid)
  const sum = (eid: string, k: string) => extras(eid).filter(x => k === 'training' ? x.kind === 'training' : x.kind !== 'training').reduce((a, x) => a + Number(x.hours), 0)
  const day = new Date(sheet.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const sub = (c: string) => sheet.shifts.find(s => s.code === c)?.submission
  const visitors = sheet.extras.filter(x => !sheet.entries.some(e => e.employee_id === x.employee_id))
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex gap-2 mb-3 print:hidden">
        <Btn onClick={() => nav(-1)}><ArrowLeft size={15} /> Back</Btn>
        <Btn kind="primary" onClick={() => window.print()}><Printer size={15} /> Print</Btn>
        {sheet.status !== 'locked' && <span className="text-sm text-amber-700 self-center">This day is not locked yet; the print is a draft.</span>}
      </div>
      <div className="bg-white p-4 print:p-0 text-[12px] text-black">
        <div className="text-center mb-2">
          <div className="font-bold text-base">DAILY ATTENDANCE SHEET {sheet.status !== 'locked' && '(DRAFT)'}</div>
          <div>{sheet.print_title}</div>
          <div>{day}{sheet.is_gh ? ' — Gazetted holiday' : ''}</div>
        </div>
        <table className="w-full border-collapse" style={{ fontSize: 12 }}>
          <thead>
            <tr className="bg-sky-100">
              {['S.#', 'Name', 'P.No.', 'Post', 'Shift code', 'O/T code', 'Attend. hrs', 'O/T normal / training', 'Total hrs', 'Remarks'].map(h =>
                <th key={h} className="border border-black px-1 py-1">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <FragmentRows key={g} g={g} rows={sheet.entries.filter(e => e.group === g)} code={code} extras={extras} sum={sum} />
            ))}
            {visitors.length > 0 && <tr><th colSpan={10} className="border border-black text-left bg-orange-100 px-1">Others working today</th></tr>}
            {visitors.map((x, i) => (
              <tr key={x.id}><td className="border border-black text-center">{i + 1}</td><td className="border border-black px-1">{x.name}</td>
                <td className="border border-black text-center">{x.p_number}</td><td className="border border-black" /><td className="border border-black" />
                <td className="border border-black text-center">{code(x.shift_code)}</td><td className="border border-black" />
                <td className="border border-black text-center">{x.kind !== 'training' ? num(x.hours) : ''} / {x.kind === 'training' ? num(x.hours) : ''}</td>
                <td className="border border-black text-center">{num(x.hours)}</td><td className="border border-black px-1">{x.reason}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="grid grid-cols-4 gap-4 mt-6 text-center">
          {sheet.shifts.map(s => (
            <div key={s.code}><div className="border-t border-black pt-1">{s.name} shift supervisor</div><div className="text-[11px]">{sub(s.code)?.by ?? ''}</div></div>
          ))}
          <div><div className="border-t border-black pt-1">Unit Manager</div><div className="text-[11px]">{sheet.locked_by ?? ''}</div></div>
        </div>
        <p className="mt-3 text-[11px]">Codes: 1 Morning, 2 Evening, 0 Night; V annual, C casual, S sick, CD compensatory, BD birthday, L without pay, A absent, GH gazetted holiday, SA special assignment, RT rotational training, LD light duty, O off.</p>
      </div>
    </div>
  )
}

function FragmentRows({ g, rows, code, extras, sum }: { g: string; rows: Sheet['entries']; code: (s: string) => string; extras: (id: string) => Sheet['extras']; sum: (id: string, k: string) => number }) {
  return (
    <>
      <tr><th colSpan={10} className="border border-black text-left bg-orange-200 px-1">Shift Group {g}</th></tr>
      {rows.map((e, i) => {
        const xs = extras(e.employee_id)
        const present = ['P', 'SA', 'RT', 'LD'].includes(e.code)
        const n = sum(e.employee_id, 'normal'), t = sum(e.employee_id, 'training')
        return (
          <tr key={e.id}>
            <td className="border border-black text-center">{i + 1}</td>
            <td className="border border-black px-1">{e.name}{e.is_trainee ? ' (T/A)' : ''}</td>
            <td className="border border-black text-center">{e.p_number}</td>
            <td className="border border-black text-center">{e.post}</td>
            <td className="border border-black text-center">{e.shift_code === 'O' ? (e.code !== 'O' ? e.code : '') : present ? code(e.shift_code) : e.code}</td>
            <td className="border border-black text-center">{xs.map(x => code(x.shift_code)).join(', ')}</td>
            <td className="border border-black text-center">{Number(e.hours) > 0 ? num(e.hours) : ''}</td>
            <td className="border border-black text-center">{n || ''} / {t || ''}</td>
            <td className="border border-black text-center">{Number(e.hours) + n + t || ''}</td>
            <td className="border border-black px-1">{[e.note, ...xs.map(x => x.reason)].filter(Boolean).join('; ')}</td>
          </tr>
        )
      })}
    </>
  )
}
