import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { shiftsApi, errMsg, type Correction, type ShiftsMeta } from '../../api/shifts'
import { Card, Chip, Spinner, Empty, Note, setTitle, Toast } from '../../components/shifts/ui'
import { describeCorrection, DecideButtons } from './DailySheetPage'

export default function CorrectionsPage() {
  const nav = useNavigate()
  const [meta, setMeta] = useState<ShiftsMeta | null>(null)
  const [rows, setRows] = useState<Correction[] | null>(null)
  const [status, setStatus] = useState('pending')
  const [err, setErr] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const load = () => shiftsApi.corrections(status ? { status } : {}).then(setRows).catch(e => setErr(errMsg(e)))
  useEffect(() => { setTitle('Corrections'); shiftsApi.meta().then(setMeta).catch(() => {}) }, [])
  useEffect(() => { setRows(null); load() }, [status])
  const label = (c: string) => meta?.codes.find(x => x.code === c)?.label ?? c
  const canDecide = (sid: string) => {
    const d = meta?.attendance.decide
    return d === 'all' || (Array.isArray(d) && d.includes(sid))
  }
  if (err) return <Note kind="error">{err}</Note>
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Note>A locked day is never edited directly. A change is requested with a reason, the Unit Manager decides, and the history is kept.</Note>
      <div className="flex gap-2" role="tablist">
        {[['pending', 'Waiting'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['', 'All']].map(([v, l]) => (
          <button key={v} role="tab" aria-selected={status === v} onClick={() => setStatus(v)}
            className={`text-sm font-semibold rounded-full px-3 py-1.5 border ${status === v ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white border-slate-300'}`}>{l}</button>
        ))}
      </div>
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty>No correction requests here.</Empty> : rows.map(c => (
        <Card key={c.id} className="p-4 space-y-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-slate-900">{c.name}</b><span className="text-slate-500">P.No. {c.p_number}</span>
            <Chip tone={c.status === 'pending' ? 'amber' : c.status === 'approved' ? 'green' : 'slate'}>{c.status}</Chip>
            <button className="ml-auto text-emerald-700 hover:underline" onClick={() => nav(`/attendance/sheet?date=${c.date}&section=${c.section_id}`)}>
              {new Date(c.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}, {c.section}
            </button>
          </div>
          <div><span className="text-slate-500">{c.kind_label}:</span> {describeCorrection(c, label)}</div>
          <div><span className="text-slate-500">Reason:</span> {c.reason} <span className="text-xs text-slate-400">({c.requested_by}, {new Date(c.requested_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })})</span></div>
          {c.decided_by && <div className="text-slate-600">Decided by {c.decided_by}{c.decision_note ? `: ${c.decision_note}` : ''}</div>}
          {c.status === 'pending' && canDecide(c.section_id) && <DecideButtons id={c.id} onDone={load} setToast={setToast} />}
        </Card>
      ))}
      <Toast msg={toast} onDone={() => setToast(null)} />
    </div>
  )
}
