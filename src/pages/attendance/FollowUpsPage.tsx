import { useEffect, useRef, useState } from 'react'
import { shiftsApi, errMsg, monthNow, type Section } from '../../api/shifts'
import { Card, Spinner, Empty, Note, Btn, Chip, MonthPicker, SectionPicker, useSection, setTitle, Toast } from '../../components/shifts/ui'

const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

/** Things the Supervisor / Manager follows up from the sheets:
 *  compensatory days for gazetted holidays worked, and leave marked without an application. */
export default function FollowUpsPage() {
  const [sections, setSections] = useState<Section[] | null>(null)
  const [sectionId, setSectionId] = useSection(sections)
  const [month, setMonth] = useState(monthNow())
  const [tab, setTab] = useState<'cd' | 'leave'>('cd')
  const [cd, setCd] = useState<any[] | null>(null)
  const [leave, setLeave] = useState<any[] | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { setTitle('Follow-ups'); shiftsApi.sections('attendance', 'review').then(setSections).catch(e => setErr(errMsg(e))) }, [])
  const req = useRef(0)
  const load = () => {
    if (!sectionId) return
    const n = ++req.current
    setCd(null); setLeave(null)
    shiftsApi.cdDue(sectionId, month).then(r => n === req.current && setCd(r)).catch(e => setErr(errMsg(e)))
    shiftsApi.unplanned(sectionId, month).then(r => n === req.current && setLeave(r)).catch(e => setErr(errMsg(e)))
  }
  useEffect(load, [sectionId, month])

  const give = async (r: any) => {
    setBusy(r.employee_id + r.holiday_id)
    try { const res = await shiftsApi.giveCd({ section: sectionId, employee_id: r.employee_id, holiday_id: r.holiday_id }); setToast(res.message); load() }
    catch (e) { setToast(errMsg(e)) } finally { setBusy('') }
  }
  const raise = async (r: any) => {
    setBusy(r.employee_id + r.start)
    try { const res = await shiftsApi.raiseLeave({ section: sectionId, employee_id: r.employee_id, code: r.code, start: r.start, end: r.end }); setToast(res.message); load() }
    catch (e) { setToast(errMsg(e)) } finally { setBusy('') }
  }

  if (err) return <Note kind="error">{err}</Note>
  if (sections && !sections.length) return <Empty>Follow-ups are for the section Supervisor and Manager.</Empty>
  const tabBtn = (k: 'cd' | 'leave', label: string, n?: number) => (
    <button onClick={() => setTab(k)} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tab === k ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
      {label}{n ? <span className="ml-1.5 bg-red-500 text-white text-xs font-bold px-1.5 rounded-full">{n}</span> : null}
    </button>
  )
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionPicker sections={sections ?? []} value={sectionId} onChange={setSectionId} />
        <MonthPicker value={month} onChange={setMonth} />
      </div>
      <div className="inline-flex bg-slate-100 rounded-xl p-1">
        {tabBtn('cd', 'Gazetted holiday worked', cd?.length)}
        {tabBtn('leave', 'Leave without application', leave?.length)}
      </div>

      {tab === 'cd' && (
        <>
          <Note>People who worked on a gazetted holiday, from <b>locked</b> days. Give each one compensatory day (CD); it is added to their leave balance and they are notified. (Whether holiday work is also paid as overtime is one of the open overtime questions.)</Note>
          {!cd ? <Spinner /> : cd.length === 0 ? <Empty>Nobody is waiting for a compensatory day this month.</Empty> : (
            <Card className="divide-y divide-slate-100">
              {cd.map(r => (
                <div key={r.employee_id + r.holiday_id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <div className="flex-1 min-w-[180px]"><b>{r.name}</b><div className="text-xs text-slate-500">P.No. {r.p_number}</div></div>
                  <div className="min-w-[180px]">{fmt(r.date)} · {r.holiday}<div className="text-xs text-slate-500">{r.worked}</div></div>
                  <Btn kind="primary" disabled={busy === r.employee_id + r.holiday_id} onClick={() => give(r)}>Give 1 CD</Btn>
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      {tab === 'leave' && (
        <>
          <Note>Leave marked on the sheet with no leave application. <b>Raise application</b> creates it for the person; it then goes for the normal approval (Supervisor, then SIC) and the balance is deducted only when approved.</Note>
          {!leave ? <Spinner /> : leave.length === 0 ? <Empty>No leave without an application this month.</Empty> : (
            <Card className="divide-y divide-slate-100">
              {leave.map(r => (
                <div key={r.employee_id + r.start + r.code} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <div className="flex-1 min-w-[180px]"><b>{r.name}</b><div className="text-xs text-slate-500">P.No. {r.p_number}</div></div>
                  <div className="min-w-[200px]">
                    <Chip tone="blue">{r.code}</Chip> {r.code_label}
                    <div className="text-xs text-slate-500">{fmt(r.start)}{r.end !== r.start ? ` – ${fmt(r.end)}` : ''} · {r.days} day{r.days > 1 ? 's' : ''}{r.note ? ` · ${r.note}` : ''}</div>
                  </div>
                  {r.leave_type
                    ? <Btn kind="primary" disabled={busy === r.employee_id + r.start} onClick={() => raise(r)}>Raise application</Btn>
                    : <span className="text-xs text-slate-500">No leave type linked</span>}
                </div>
              ))}
            </Card>
          )}
        </>
      )}
      <Toast msg={toast} onDone={() => setToast(null)} />
    </div>
  )
}
