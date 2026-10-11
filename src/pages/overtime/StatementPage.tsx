import { useEffect, useRef, useState } from 'react'
import { Download, Lock } from 'lucide-react'
import { shiftsApi, errMsg, monthNow, num, fmtMonth, type Section, type StatementRow, type StatementSummary } from '../../api/shifts'
import { Card, Btn, Chip, Spinner, Empty, Note, MonthPicker, SectionPicker, useSection, setTitle, Modal, Toast } from '../../components/shifts/ui'

/**
 * mode 'overtime': the Overtime statement (hours by rate) for Accounts / PRD.
 * mode 'attendance': Monthly hours (days, leave, absence, extra hours).
 * Both come from the same calculation on locked days only.
 */
export default function StatementPage({ mode }: { mode: 'overtime' | 'attendance' }) {
  const [sections, setSections] = useState<Section[] | null>(null)
  const [sectionId, setSectionId] = useSection(sections)
  const [month, setMonth] = useState(monthNow())
  const [data, setData] = useState<{ summary: StatementSummary; rows: StatementRow[] } | null>(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [onlyOt, setOnlyOt] = useState(false)
  const [open, setOpen] = useState<StatementRow | null>(null)
  const [closing, setClosing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [canClose, setCanClose] = useState(false)

  useEffect(() => {
    setTitle(mode === 'overtime' ? 'Overtime statement' : 'Monthly hours')
    shiftsApi.sections(mode === 'overtime' ? 'overtime' : 'attendance', mode === 'overtime' ? 'view' : 'monthly').then(setSections).catch(e => setErr(errMsg(e)))
    shiftsApi.meta().then(m => setCanClose(m.overtime.close === 'all' || (Array.isArray(m.overtime.close) && m.overtime.close.length > 0))).catch(() => {})
  }, [mode])
  const req = useRef(0)
  const load = () => {
    if (!sectionId) return
    setData(null)
    const n = ++req.current
    const p = mode === 'overtime' ? shiftsApi.statement(sectionId, month) : shiftsApi.monthly(sectionId, month)
    p.then(d => n === req.current && setData(d)).catch(e => setErr(errMsg(e)))
  }
  useEffect(load, [sectionId, month, mode])

  const showDetail = async (r: StatementRow) => {
    try {
      const full = await shiftsApi.statement(sectionId, month, true)
      setOpen(full.rows.find(x => x.employee_id === r.employee_id) ?? r)
    } catch { setOpen(r) }
  }
  const exportCsv = () => shiftsApi.download(mode === 'overtime' ? '/overtime/statement/' : '/shifts/monthly/', { section: sectionId, month },
    `${(sections?.find(s => s.id === sectionId)?.name ?? 'section').replace(/\s+/g, '_')}-${month}-${mode}.csv`).catch(e => setToast(errMsg(e)))
  const close = async () => {
    try { await shiftsApi.closeMonth(sectionId, month); setToast('Month closed'); setClosing(false); load() }
    catch (e) { setToast(errMsg(e)); setClosing(false) }
  }

  if (err) return <Note kind="error">{err}</Note>
  if (sections && !sections.length) return <Empty>You have not been given access to any section here.</Empty>
  const s = data?.summary
  const rows = (data?.rows ?? []).filter(r => (!q || r.name.toLowerCase().includes(q.toLowerCase()) || r.p_number.includes(q)) && (!onlyOt || Number(r.ot_total) > 0))
  const tot = (k: keyof StatementRow) => rows.reduce((a, r) => a + Number(r[k] as any || 0), 0)
  const ot = mode === 'overtime'

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionPicker sections={sections ?? []} value={sectionId} onChange={setSectionId} />
        <div className="flex flex-wrap gap-2 items-center">
          <MonthPicker value={month} onChange={setMonth} />
          <Btn onClick={exportCsv} disabled={!data}><Download size={15} /> Export for Excel</Btn>
          {ot && canClose && s && !s.closed && <Btn kind="primary" onClick={() => setClosing(true)}><Lock size={15} /> Close month</Btn>}
        </div>
      </div>
      {!data ? <Spinner /> : (
        <>
          <Card className="p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <b>{s!.locked_days} of {s!.days_in_month} days locked</b>
              {s!.closed ? <Chip tone="green">Closed by {s!.closed_by}</Chip> : s!.locked_days < s!.days_due ? <Chip tone="amber">{s!.days_due - s!.locked_days} day(s) so far not locked</Chip> : null}
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.round(100 * s!.locked_days / s!.days_in_month)}%` }} /></div>
            <p className="text-xs text-slate-500">Built only from days the Unit Manager has locked.{ot ? ' Hours are split by the SOP rates; payroll applies the hourly rate (monthly gross / ' + (s!.rules?.hourly_divisor ?? 182) + '). "Provisional" means part of the crew week is not locked yet.' : ''}</p>
          </Card>
          <div className="flex flex-wrap gap-2 items-center">
            <input className="text-sm border border-slate-300 rounded-lg px-3 min-h-[40px] flex-1 min-w-[200px] max-w-sm" placeholder="Search name or P.No." value={q} onChange={e => setQ(e.target.value)} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyOt} onChange={e => setOnlyOt(e.target.checked)} className="w-4 h-4" /> Only people with extra hours</label>
          </div>
          {rows.length === 0 ? <Empty>Nobody to show for {fmtMonth(month)}.</Empty> : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-3 py-2">Person</th><th className="px-2 py-2">Group</th>
                    {!ot && <><th className="px-2 py-2">Days worked</th><th className="px-2">Leave</th><th className="px-2">Absent</th><th className="px-2">Attend. hrs</th></>}
                    <th className="px-2">OT normal</th><th className="px-2">OT training</th><th className="px-2">Call-out</th>
                    {ot && <><th className="px-2">Single</th><th className="px-2">Double</th><th className="px-2">Triple</th><th className="px-2">Equiv. single</th><th className="px-2">Evening prem.</th><th className="px-2">Night prem.</th></>}
                    {!ot && <th className="px-2">Cover shifts</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {rows.map(r => (
                    <tr key={r.employee_id} className="hover:bg-slate-50 cursor-pointer" onClick={() => ot && showDetail(r)}>
                      <td className="px-3 py-2"><b>{r.name}</b> {r.trainee && <Chip tone="purple">Trainee</Chip>} {r.provisional && <Chip tone="amber">Provisional</Chip>}<div className="text-xs text-slate-500">P.No. {r.p_number}{r.post ? ` · ${r.post}` : ''}</div></td>
                      <td className="text-center">{r.group}</td>
                      {!ot && <><td className="text-center">{r.days_worked}</td><td className="text-center">{r.leave_days}</td><td className="text-center">{r.absent_days}</td><td className="text-center font-semibold">{num(r.attendance_hours)}</td></>}
                      <td className="text-center">{num(r.ot_normal)}</td><td className="text-center">{num(r.ot_training)}</td><td className="text-center">{num(r.ot_callout)}</td>
                      {ot && <><td className="text-center">{num(r.single)}</td><td className="text-center">{num(r.double)}</td><td className="text-center">{num(r.triple)}</td><td className="text-center font-bold">{num(r.equivalent_single)}</td><td className="text-center">{num(r.evening_hours)}</td><td className="text-center">{num(r.night_hours)}</td></>}
                      {!ot && <td className="text-center">{r.cover_shifts}</td>}
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td className="px-3 py-2">Total, {rows.length} people</td><td />
                    {!ot && <><td className="text-center">{tot('days_worked')}</td><td className="text-center">{tot('leave_days')}</td><td className="text-center">{tot('absent_days')}</td><td className="text-center">{num(tot('attendance_hours'))}</td></>}
                    <td className="text-center">{num(tot('ot_normal'))}</td><td className="text-center">{num(tot('ot_training'))}</td><td className="text-center">{num(tot('ot_callout'))}</td>
                    {ot && <><td className="text-center">{num(tot('single'))}</td><td className="text-center">{num(tot('double'))}</td><td className="text-center">{num(tot('triple'))}</td><td className="text-center">{num(tot('equivalent_single'))}</td><td className="text-center">{num(tot('evening_hours'))}</td><td className="text-center">{num(tot('night_hours'))}</td></>}
                    {!ot && <td className="text-center">{tot('cover_shifts')}</td>}
                  </tr>
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
      {open && <DayBreakdown row={open} onClose={() => setOpen(null)} />}
      {closing && (
        <Modal title={`Close ${fmtMonth(month)}`} onClose={() => setClosing(false)}
          footer={<><Btn onClick={() => setClosing(false)}>Cancel</Btn><Btn kind="primary" onClick={close}>Close month</Btn></>}>
          <p className="text-sm text-slate-700">After closing, no correction can be made to any day of this month. Every day must be locked and no correction may be waiting. Only Admin can reopen a closed month.</p>
        </Modal>
      )}
      <Toast msg={toast} onDone={() => setToast(null)} />
    </div>
  )
}

const DAY_TYPE: Record<string, string> = { WORK: 'Working day', FO: 'First day off', SO: 'Second day off', GH: 'Gazetted holiday' }

export function DayBreakdown({ row, onClose }: { row: StatementRow; onClose: () => void }) {
  const days = row.days.filter(d => Number(d.extra) > 0 || Number(d.triple) > 0)
  return (
    <Modal title={`${row.name}, overtime by day`} onClose={onClose} wide>
      {days.length === 0 ? <p className="text-sm text-slate-500">No overtime this month.</p> : (
        <table className="w-full text-sm tabular-nums">
          <thead className="text-xs text-slate-500 uppercase"><tr><th className="text-left py-1">Day</th><th className="text-left">Type</th><th>Code</th><th>Extra hrs</th><th>Single</th><th>Double</th><th>Triple</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {days.map(d => (
              <tr key={d.date}><td className="py-1.5">{new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                <td>{DAY_TYPE[d.day_type] ?? d.day_type}</td><td className="text-center">{d.code}</td><td className="text-center">{num(d.extra)}</td>
                <td className="text-center">{num(d.single)}</td><td className="text-center">{num(d.double)}</td><td className="text-center">{num(d.triple)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-xs text-slate-500">Normal working day: first hour single, rest double; all double when the 48-hour crew week is complete. First day off double; second day off first 8 hours single. Gazetted holiday triple. Call-out up to 2.5 hours counts as 4 hours single.</p>
    </Modal>
  )
}
