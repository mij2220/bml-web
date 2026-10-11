import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Printer, Plus, Lock, Check, Undo2, Send, AlertTriangle } from 'lucide-react'
import {
  shiftsApi, errMsg, fmtDay, addDays, todayIso, num, shiftName,
  type Section, type Sheet, type Entry, type Extra, type ShiftsMeta,
} from '../../api/shifts'
import {
  Card, Btn, Spinner, Empty, Note, Chip, Tile, SectionPicker, useSection, Modal, Field, inputCls,
  SignatureFields, Toast, setTitle,
} from '../../components/shifts/ui'

const PRESENT_CODES = ['P', 'SA', 'RT', 'LD']
const blankSig = { signer_name: '', signer_p_number: '' }

export default function DailySheetPage() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [meta, setMeta] = useState<ShiftsMeta | null>(null)
  const [sections, setSections] = useState<Section[] | null>(null)
  const [sectionId, setSectionId] = useSection(sections)
  const day = params.get('date') || todayIso()
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'none' | 'error'>('loading')
  const [problem, setProblem] = useState('')
  const [tab, setTab] = useState<string>('M')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [extraFor, setExtraFor] = useState<{ extra?: Extra; employee?: string; covering?: string; shift?: string } | null>(null)
  const [confirm, setConfirm] = useState<{ action: string; shift?: string; title: string; text: string } | null>(null)
  const [sig, setSig] = useState(blankSig)
  const [sendBack, setSendBack] = useState<string | null>(null)
  const [backText, setBackText] = useState('')
  const [fixFor, setFixFor] = useState<Entry | null>(null)

  useEffect(() => { setTitle('Daily sheet') }, [])
  // A link may name the section (from Corrections or Days)
  useEffect(() => {
    const want = params.get('section')
    if (want && sections?.some(x => x.id === want) && want !== sectionId) setSectionId(want)
  }, [sections])
  useEffect(() => {
    shiftsApi.meta().then(setMeta).catch(() => {})
    shiftsApi.sections('attendance', 'view').then(setSections).catch(e => { setProblem(errMsg(e)); setState('error') })
  }, [])

  const req = useRef(0)
  const load = (quiet = false) => {
    if (!sectionId) return
    if (!quiet) setState('loading')
    const n = ++req.current
    shiftsApi.sheet(sectionId, day).then(s => {
      if (n !== req.current) return
      setSheet(s)
      setState(s ? 'ready' : 'none')
      if (s && !s.shifts.some(x => x.code === tab) && tab !== 'O') setTab(s.shifts[0]?.code ?? 'M')
    }).catch(e => { setProblem(errMsg(e)); setState('error') })
  }
  useEffect(() => { load() }, [sectionId, day])

  const go = (d: string) => setParams(p => { p.set('date', d); return p })
  const apply = (s: Sheet, msg?: string) => { setSheet(s); if (msg) setToast(msg) }
  const run = async (fn: () => Promise<Sheet>, msg?: string) => {
    setBusy(true)
    try { apply(await fn(), msg) } catch (e) { setToast(errMsg(e)); load(true) }
    setBusy(false)
  }

  const codes = meta?.codes ?? []
  const codeLabel = (c: string) => codes.find(x => x.code === c)?.label ?? c
  const shared = !!meta?.is_shared_account

  const p = sheet?.permissions
  const locked = sheet?.status === 'locked'
  const current = sheet?.shifts.find(s => s.code === tab)
  const rows = useMemo(() => (sheet?.entries ?? []).filter(e => tab === 'O' ? e.shift_code === 'O' : e.shift_code === tab), [sheet, tab])
  const rowIds = new Set(rows.map(r => r.employee_id))
  const extrasOf = (eid: string) => (sheet?.extras ?? []).filter(x => x.employee_id === eid && (tab === 'O' || x.shift_code === tab))
  const coverHere = (sheet?.extras ?? []).filter(x => tab !== 'O' && x.shift_code === tab && !rowIds.has(x.employee_id))
  const allSubmitted = !!sheet && sheet.shifts.every(s => s.submission.status === 'submitted')
  const submittedCount = sheet?.shifts.filter(s => s.submission.status === 'submitted').length ?? 0
  const pendingFixes = (sheet?.corrections ?? []).filter(c => c.status === 'pending')
  const openItems = (sheet?.entries ?? []).filter(e => (e.code === 'A' && !e.note) || e.no_leave_application)

  const doAction = async (action: string, shift?: string, extra: any = {}) => {
    const body: any = { ...extra, ...(shift ? { shift } : {}), ...(shared ? sig : {}) }
    const msgs: Record<string, string> = {
      submit: `${shiftName(shift ?? '')} shift submitted`, withdraw: 'Submission withdrawn', review: 'Day marked as reviewed',
      lock: 'Day approved and locked', reopen: 'Day reopened', 'send-back': 'Shift sent back',
    }
    await run(() => shiftsApi.action(sheet!.id, action, body), msgs[action])
    setConfirm(null); setSendBack(null); setBackText('')
  }

  if (state === 'error') return <div className="max-w-3xl mx-auto"><Note kind="error">{problem}</Note></div>
  if (sections && sections.length === 0) return <div className="max-w-3xl mx-auto"><Empty>You have not been given a section to work on. Ask Admin to add you under Admin, Roles and access.</Empty></div>

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Day and section */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="min-w-0">
          <SectionPicker sections={sections ?? []} value={sectionId} onChange={setSectionId} />
          <div className="flex items-center gap-1 mt-1">
            <button className="p-2 rounded-lg hover:bg-slate-100" onClick={() => go(addDays(day, -1))} aria-label="Previous day"><ChevronLeft size={18} /></button>
            <h2 className="text-lg font-bold text-slate-900">{fmtDay(day)}</h2>
            <button className="p-2 rounded-lg hover:bg-slate-100" onClick={() => go(addDays(day, 1))} aria-label="Next day"><ChevronRight size={18} /></button>
            <input type="date" value={day} onChange={e => e.target.value && go(e.target.value)} aria-label="Choose a date"
              className="ml-1 text-sm border border-slate-300 rounded-lg px-2 min-h-[36px]" />
            {sheet?.is_gh && <Chip tone="orange">Gazetted holiday</Chip>}
          </div>
        </div>
        {sheet && p?.print && (
          <Btn onClick={() => nav(`/attendance/print?section=${sectionId}&date=${day}`)}><Printer size={15} /> Print sheet</Btn>
        )}
      </div>

      {state === 'loading' && <Spinner />}
      {state === 'none' && <Empty>Attendance for this day has not been started yet.</Empty>}

      {state === 'ready' && sheet && (
        <>
          {/* Progress */}
          <Card className="p-3 sm:p-4">
            <ol className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Step n={1} done={allSubmitted} cur={!allSubmitted} title="Marked" sub={`${submittedCount} of ${sheet.shifts.length} shifts submitted`} />
              <Step n={2} done={sheet.status !== 'open'} cur={allSubmitted && sheet.status === 'open'} title="Reviewed" sub={sheet.reviewed_by ? `By ${sheet.reviewed_by}` : 'By the Shift Supervisor'} />
              <Step n={3} done={locked} cur={sheet.status === 'reviewed'} title="Locked" sub={sheet.locked_by ? `By ${sheet.locked_by}` : 'By the Unit Manager'} />
              <Step n={4} done={locked} cur={false} title="In monthly hours" sub={locked ? 'Counted' : 'After lock'} />
            </ol>
          </Card>

          {locked && (
            <Note kind="lock">
              <span className="font-semibold">This day is locked.</span> Changes now need a correction approved by the Unit Manager.
              {p?.month_closed && ' Accounts has closed this month, so no more changes are possible.'}
            </Note>
          )}

          {/* Shift tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
            {sheet.shifts.map(s => (
              <button key={s.code} role="tab" aria-selected={tab === s.code} onClick={() => setTab(s.code)}
                className={`flex-shrink-0 text-left rounded-xl border px-3 py-2 min-w-[150px] ${tab === s.code ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="font-semibold text-sm">{s.name} <span className="text-slate-500 font-normal">(code {s.sheet_code})</span></div>
                <div className="text-xs text-slate-500">{s.groups.length ? `Group ${s.groups.join(', ')}` : 'No group'} · {s.start}-{s.end}</div>
                <div className="mt-1"><SubChip status={s.submission.status} /></div>
              </button>
            ))}
            <button role="tab" aria-selected={tab === 'O'} onClick={() => setTab('O')}
              className={`flex-shrink-0 text-left rounded-xl border px-3 py-2 min-w-[130px] ${tab === 'O' ? 'border-slate-500 bg-slate-100' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
              <div className="font-semibold text-sm">Off today</div>
              <div className="text-xs text-slate-500">{sheet.off_groups.length ? `Group ${sheet.off_groups.join(', ')}` : 'Nobody'}</div>
            </button>
          </div>

          {current && tab !== 'O' && (
            <>
              {current.submission.status === 'sent_back' && (
                <Note kind="warn"><span className="font-semibold">Sent back for correction:</span> {current.submission.remarks}</Note>
              )}
              {!locked && p?.mark && current.submission.status !== 'submitted' && (
                <Note>
                  <span className="font-semibold">Already filled in from the roster.</span> Everyone rostered is present for {num(current.hours)} hours and approved leave comes from the Leave module. Change only what is different today.
                </Note>
              )}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <Tile label="On roster" value={current.counts.rostered} />
                <Tile label="Present" value={current.counts.present} tone="green" />
                <Tile label="On leave" value={current.counts.leave} tone="blue" />
                <Tile label="Absent" value={current.counts.absent} tone="red" />
                <Tile label="Attendance hours" value={num(current.counts.attendance_hours)} />
                <Tile label="Extra hours" value={num(current.counts.extra_hours)} tone="orange" />
              </div>
            </>
          )}

          {/* People */}
          <Card className="overflow-hidden">
            <div className="hidden md:grid grid-cols-[minmax(170px,1.2fr)_minmax(320px,1.5fr)_52px_minmax(140px,1fr)_minmax(150px,1fr)] gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <div>Name</div><div>Attendance</div><div>Hours</div><div>Extra hours</div><div>Remarks</div>
            </div>
            {rows.length === 0 && <div className="p-6 text-sm text-slate-500">{tab === 'O' ? 'Nobody is off today.' : 'No group is on this shift today. Check the roster.'}</div>}
            {rows.map(e => (
              <PersonRow key={e.id} e={e} off={tab === 'O'} canMark={!!p?.mark && !busy} codes={codes}
                extras={extrasOf(e.employee_id)} coveredBy={(sheet.extras ?? []).filter(x => x.covering_id === e.employee_id).map(x => x.name)}
                onCode={c => run(() => shiftsApi.setEntry(e.id, { code: c }))}
                onNote={n => run(() => shiftsApi.setEntry(e.id, { note: n }))}
                onAddExtra={() => setExtraFor({ employee: e.employee_id, shift: tab === 'O' ? (sheet.shifts[0]?.code) : tab })}
                onCover={() => setExtraFor({ covering: e.employee_id, shift: e.shift_code })}
                onEditExtra={x => setExtraFor({ extra: x })}
                onCorrect={p?.request_correction ? () => setFixFor(e) : undefined}
              />
            ))}
          </Card>

          {tab !== 'O' && (
            <Card className="p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">Cover and extra staff on this shift</h3>
                {p?.mark && <Btn onClick={() => setExtraFor({ shift: tab })}><Plus size={15} /> Add a person from another group</Btn>}
              </div>
              {coverHere.length === 0 && <p className="text-sm text-slate-500">Nobody from another group is working this shift.</p>}
              {coverHere.map(x => (
                <div key={x.id} className="flex flex-wrap items-center gap-3 border border-orange-200 bg-orange-50 rounded-xl px-3 py-2">
                  <div className="flex-1 min-w-[180px]"><b>{x.name}</b> <span className="text-xs text-slate-500">P.No. {x.p_number}</span><br />
                    <span className="text-xs text-slate-600">{x.reason || 'Extra hours'}{x.covering_name ? `, for ${x.covering_name}` : ''}{x.remarks ? `. ${x.remarks}` : ''}</span></div>
                  <Chip tone="orange">+{num(x.hours)}h {x.kind}</Chip>
                  {p?.mark && <Btn kind="link" onClick={() => setExtraFor({ extra: x })}>Edit</Btn>}
                </div>
              ))}
            </Card>
          )}

          {/* Corrections on this day */}
          {(sheet.corrections.length > 0) && (
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-slate-900">Corrections on this day</h3>
              {sheet.corrections.map(c => (
                <div key={c.id} className="border border-slate-200 rounded-xl p-3 text-sm space-y-1">
                  <div className="flex flex-wrap items-center gap-2"><b>{c.name}</b><span className="text-slate-500">{c.kind_label}</span>
                    <Chip tone={c.status === 'pending' ? 'amber' : c.status === 'approved' ? 'green' : 'slate'}>{c.status}</Chip></div>
                  <div className="text-slate-600">{describeCorrection(c, codeLabel)}</div>
                  <div className="text-slate-600">Reason: {c.reason} <span className="text-xs text-slate-400">({c.requested_by})</span></div>
                  {c.decision_note && <div className="text-slate-600">Manager: {c.decision_note}</div>}
                  {c.status === 'pending' && p?.decide && <DecideButtons id={c.id} onDone={() => load(true)} setToast={setToast} />}
                </div>
              ))}
            </Card>
          )}

          {/* Action bars */}
          {current && tab !== 'O' && !locked && (p?.mark || p?.review) && (
            <div className="sticky bottom-16 md:bottom-0 z-20 bg-white border border-slate-200 rounded-2xl shadow-lg p-3 flex flex-wrap items-center gap-3">
              <p className="flex-1 min-w-[200px] text-xs text-slate-500">
                {current.submission.status === 'submitted'
                  ? `Submitted by ${current.submission.by ?? ''}. You can still edit until the Unit Manager locks the day.`
                  : 'Submitting records your name and the time in place of the supervisor initials.'}
              </p>
              {current.submission.status === 'submitted' ? (
                <>
                  {p?.review && <Btn kind="danger" disabled={busy} onClick={() => setSendBack(current.code)}><Undo2 size={15} /> Send back</Btn>}
                  {p?.mark && <Btn disabled={busy} onClick={() => doAction('withdraw', current.code)}>Withdraw</Btn>}
                </>
              ) : p?.mark && (
                <Btn kind="primary" disabled={busy} onClick={() => setConfirm({ action: 'submit', shift: current.code, title: `Submit ${current.name.toLowerCase()} shift`, text: `${current.counts.present} present, ${current.counts.leave} on leave, ${current.counts.absent} absent, ${num(current.counts.extra_hours)} extra hours.` })}>
                  <Send size={15} /> Submit {current.name.toLowerCase()} shift
                </Btn>
              )}
            </div>
          )}

          <DayBar sheet={sheet} busy={busy} allSubmitted={allSubmitted} openItems={openItems.length} pendingFixes={pendingFixes.length}
            onReview={() => setConfirm({ action: 'review', title: 'Mark the day as reviewed', text: openItems.length ? `${openItems.length} item(s) need attention: absences without a reason or leave without an application.` : 'All shifts are submitted.' })}
            onLock={() => setConfirm({ action: 'lock', title: 'Approve and lock the day', text: 'After locking, entries cannot be edited without a logged correction.' })}
            onReopen={() => setConfirm({ action: 'reopen', title: 'Reopen this day', text: 'The day goes back to Reviewed and can be edited. Use only when many entries are wrong; single changes should be corrections.' })} />
        </>
      )}

      {confirm && (
        <Modal title={confirm.title} onClose={() => setConfirm(null)}
          footer={<><Btn onClick={() => setConfirm(null)}>Cancel</Btn><Btn kind="primary" disabled={busy || (shared && (!sig.signer_name || !sig.signer_p_number))} onClick={() => doAction(confirm.action, confirm.shift)}>Confirm</Btn></>}>
          <p className="text-sm text-slate-700">{confirm.text}</p>
          {shared && <SignatureFields value={sig} onChange={setSig} />}
        </Modal>
      )}

      {sendBack && (
        <Modal title={`Send ${shiftName(sendBack).toLowerCase()} shift back`} onClose={() => setSendBack(null)}
          footer={<><Btn onClick={() => setSendBack(null)}>Cancel</Btn><Btn kind="danger" disabled={busy || !backText.trim()} onClick={() => doAction('send-back', sendBack, { remarks: backText })}>Send back</Btn></>}>
          <Field label="What needs correcting (required)">
            <textarea className={`${inputCls} py-2`} rows={3} value={backText} onChange={e => setBackText(e.target.value)} />
          </Field>
        </Modal>
      )}

      {extraFor && sheet && meta && (
        <ExtraModal sheet={sheet} meta={meta} init={extraFor} busy={busy} onClose={() => setExtraFor(null)}
          onSave={async (body, id) => { await run(() => id ? shiftsApi.changeExtra(id, body) : shiftsApi.addExtra(sheet.id, body), 'Extra hours saved'); setExtraFor(null) }}
          onRemove={async id => { await run(() => shiftsApi.removeExtra(id), 'Extra hours removed'); setExtraFor(null) }} />
      )}

      {fixFor && sheet && meta && (
        <CorrectionModal sheet={sheet} meta={meta} entry={fixFor} onClose={() => setFixFor(null)}
          onSent={() => { setFixFor(null); setToast('Sent to the Unit Manager'); load(true) }} />
      )}

      <Toast msg={toast} onDone={() => setToast(null)} />
    </div>
  )
}

function Step({ n, done, cur, title, sub }: { n: number; done: boolean; cur: boolean; title: string; sub: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${done ? 'bg-emerald-500 text-white' : cur ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-400' : 'bg-slate-100 text-slate-500'}`}>{done ? <Check size={13} /> : n}</span>
      <div className="min-w-0"><div className="font-semibold">{title}</div><div className="text-xs text-slate-500 truncate">{sub}</div></div>
    </li>
  )
}

function SubChip({ status }: { status: string }) {
  if (status === 'submitted') return <Chip tone="green">Submitted</Chip>
  if (status === 'sent_back') return <Chip tone="red">Sent back</Chip>
  return <Chip>Draft</Chip>
}

function PersonRow({ e, off, canMark, codes, extras, coveredBy, onCode, onNote, onAddExtra, onCover, onEditExtra, onCorrect }: {
  e: Entry; off: boolean; canMark: boolean; codes: ShiftsMeta['codes']; extras: Extra[]; coveredBy: string[]
  onCode: (c: string) => void; onNote: (n: string) => void; onAddExtra: () => void; onCover: () => void
  onEditExtra: (x: Extra) => void; onCorrect?: () => void
}) {
  const [note, setNote] = useState(e.note)
  useEffect(() => setNote(e.note), [e.note])
  const present = PRESENT_CODES.includes(e.code)
  const choices = codes.filter(c => c.code !== 'O')
  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(170px,1.2fr)_minmax(320px,1.5fr)_52px_minmax(140px,1fr)_minmax(150px,1fr)] gap-2 md:gap-3 px-4 py-3 border-b border-slate-100 last:border-0 items-center">
      <div className="min-w-0">
        <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">{e.name}{e.is_trainee && <Chip tone="purple">Trainee</Chip>}</div>
        <div className="text-xs text-slate-500">{e.post && <span className="font-medium text-slate-700 mr-1">{e.post}</span>}P.No. {e.p_number} · Group {e.group}</div>
      </div>
      <div>
        {off ? <span className="text-sm text-slate-500">{e.code === 'O' ? 'Day off' : e.code_label}</span> : canMark ? (
          <div className="flex gap-1 flex-wrap" role="group" aria-label={`Attendance for ${e.name}`}>
            <SegBtn on={present} tone="green" onClick={() => !present && onCode('P')}>Present</SegBtn>
            <select aria-label={`Leave or other code for ${e.name}`} value={present || e.code === 'A' ? '' : e.code}
              onChange={ev => ev.target.value && onCode(ev.target.value)}
              className={`text-sm border rounded-lg px-2 min-h-[36px] w-[140px] ${!present && e.code !== 'A' ? 'border-blue-500 bg-blue-50 text-blue-800 font-semibold' : 'border-slate-300 bg-white'}`}>
              <option value="">Leave / other</option>
              {choices.filter(c => !['P', 'A'].includes(c.code)).map(c => <option key={c.code} value={c.code}>{c.code}, {c.label}</option>)}
            </select>
            <SegBtn on={e.code === 'A'} tone="red" onClick={() => e.code !== 'A' && onCode('A')}>Absent</SegBtn>
          </div>
        ) : (
          <span className="text-sm"><b>{e.code}</b> {e.code_label}</span>
        )}
        {e.no_leave_application && <div className="text-xs text-amber-700 mt-1 flex items-center gap-1"><AlertTriangle size={12} /> No leave application</div>}
        {e.leave_reference && <div className="text-xs text-blue-700 mt-1">Leave {e.leave_reference}</div>}
      </div>
      <div className="text-sm font-semibold tabular-nums">{num(e.hours)}h</div>
      <div className="flex flex-wrap gap-1 items-center">
        {extras.map(x => (
          <button key={x.id} disabled={!canMark} onClick={() => onEditExtra(x)}
            className="text-xs font-semibold rounded-full px-2 py-1 bg-orange-100 text-orange-800 disabled:cursor-default">+{num(x.hours)}h {x.kind}{off ? `, ${x.shift_code}` : ''}</button>
        ))}
        {canMark && (present || off) && <Btn kind="link" className="text-xs min-h-[32px]" onClick={onAddExtra}><Plus size={13} /> {off ? 'Called in' : 'Extra hours'}</Btn>}
        {!present && !off && (coveredBy.length
          ? <span className="text-xs text-slate-600">Covered by {coveredBy.join(', ')}</span>
          : canMark && <Btn kind="link" className="text-xs min-h-[32px]" onClick={onCover}>Arrange cover</Btn>)}
      </div>
      <div className="flex gap-2 items-center">
        {canMark ? (
          <input className={`${inputCls} min-h-[36px]`} placeholder={e.code === 'A' ? 'Reason for absence' : 'Remark'} value={note}
            aria-label={`Remarks for ${e.name}`} onChange={ev => setNote(ev.target.value)} onBlur={() => note !== e.note && onNote(note)} />
        ) : <span className="text-sm text-slate-600">{e.note}</span>}
        {onCorrect && <Btn kind="link" className="text-xs whitespace-nowrap" onClick={onCorrect}>Request correction</Btn>}
      </div>
    </div>
  )
}

function SegBtn({ on, tone, children, onClick }: { on: boolean; tone: 'green' | 'red'; children: React.ReactNode; onClick: () => void }) {
  const c = on ? (tone === 'green' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-red-500 border-red-500 text-white') : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
  return <button aria-pressed={on} onClick={onClick} className={`text-sm font-semibold rounded-lg border px-3 min-h-[36px] ${c}`}>{children}</button>
}

function DayBar({ sheet, busy, allSubmitted, openItems, pendingFixes, onReview, onLock, onReopen }: {
  sheet: Sheet; busy: boolean; allSubmitted: boolean; openItems: number; pendingFixes: number
  onReview: () => void; onLock: () => void; onReopen: () => void
}) {
  const p = sheet.permissions
  if (sheet.status === 'locked') {
    if (!p.reopen && !pendingFixes) return null
    return (
      <Card className="p-3 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] text-sm"><b>Locked{sheet.locked_at ? ` ${new Date(sheet.locked_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}.</b>{pendingFixes ? ` ${pendingFixes} correction(s) waiting.` : ''}</div>
        {p.reopen && <Btn disabled={busy} onClick={onReopen}>Reopen the whole day</Btn>}
      </Card>
    )
  }
  if (sheet.status === 'open' && p.review) {
    return (
      <Card className="p-3 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] text-sm">
          {allSubmitted ? <><b>Shift Supervisor: check the day.</b> {openItems ? `${openItems} item(s) need attention.` : 'No open items.'}</>
            : <><b>Waiting for {sheet.shifts.filter(s => s.submission.status !== 'submitted').length} shift(s)</b> to be submitted.</>}
        </div>
        <Btn kind="primary" disabled={busy || !allSubmitted} onClick={onReview}><Check size={15} /> Mark as reviewed</Btn>
      </Card>
    )
  }
  if (sheet.status === 'reviewed') {
    return (
      <Card className="p-3 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] text-sm"><b>Reviewed by {sheet.reviewed_by}.</b> {p.lock ? 'Unit Manager: approve and lock the day.' : 'Waiting for the Unit Manager to lock the day.'}</div>
        {p.lock && <Btn kind="primary" disabled={busy} onClick={onLock}><Lock size={15} /> Approve and lock</Btn>}
      </Card>
    )
  }
  return null
}

function ExtraModal({ sheet, meta, init, busy, onClose, onSave, onRemove }: {
  sheet: Sheet; meta: ShiftsMeta; init: { extra?: Extra; employee?: string; covering?: string; shift?: string }; busy: boolean
  onClose: () => void; onSave: (body: any, id?: string) => void; onRemove: (id: string) => void
}) {
  const x = init.extra
  const people = sheet.entries
  const [f, setF] = useState({
    employee: x?.employee_id ?? init.employee ?? '',
    hours: x ? num(x.hours) : init.covering ? '8' : '2',
    kind: x?.kind ?? 'normal',
    shift_code: x?.shift_code ?? init.shift ?? sheet.shifts[0]?.code ?? 'M',
    reason: x?.reason ?? (init.covering ? 'Covering an absent colleague' : ''),
    covering: x?.covering_id ?? init.covering ?? '',
    remarks: x?.remarks ?? '',
  })
  const pick = !x && !init.employee
  const away = people.filter(p => p.shift_code === f.shift_code && !PRESENT_CODES.includes(p.code))
  const set = (k: string, v: string) => setF(s => ({ ...s, [k]: v }))
  const name = people.find(p => p.employee_id === f.employee)
  return (
    <Modal title={x ? 'Edit extra hours' : init.covering ? 'Arrange cover' : 'Add extra hours'} onClose={onClose}
      footer={<>
        {x && <Btn kind="danger" disabled={busy} onClick={() => onRemove(x.id)}>Remove</Btn>}
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" disabled={busy || !f.employee || !f.hours} onClick={() => onSave({ ...f, covering: f.covering || null }, x?.id)}>Save</Btn>
      </>}>
      {pick ? (
        <Field label="Person">
          <select className={inputCls} value={f.employee} onChange={e => set('employee', e.target.value)}>
            <option value="">Choose…</option>
            {people.filter(p => p.shift_code !== f.shift_code || init.covering).map(p => (
              <option key={p.employee_id} value={p.employee_id}>{p.name}, {p.post || 'no post'}, Group {p.group}{p.shift_code === 'O' ? ' (off today)' : ''}</option>
            ))}
          </select>
        </Field>
      ) : <div className="text-sm bg-slate-50 rounded-lg px-3 py-2"><b>{name?.name ?? x?.name}</b> <span className="text-slate-500">P.No. {name?.p_number ?? x?.p_number}</span></div>}
      <Field label="Hours" hint="In half hours, up to 24.">
        <div className="flex gap-2 items-center flex-wrap">
          <input type="number" min={0.5} max={24} step={0.5} className={`${inputCls} w-24`} value={f.hours} onChange={e => set('hours', e.target.value)} />
          {['2', '4', '8'].map(n => <button key={n} type="button" onClick={() => set('hours', n)}
            className={`text-sm rounded-lg border px-3 min-h-[36px] ${f.hours === n ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-300'}`}>{n}h</button>)}
        </div>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Type">
          <select className={inputCls} value={f.kind} onChange={e => set('kind', e.target.value)}>
            {meta.extra_kinds.map(k => <option key={k.code} value={k.code}>{k.label}</option>)}
          </select>
        </Field>
        <Field label="Worked in which shift">
          <select className={inputCls} value={f.shift_code} onChange={e => set('shift_code', e.target.value)}>
            {sheet.shifts.map(s => <option key={s.code} value={s.code}>{s.name} (code {s.sheet_code})</option>)}
          </select>
        </Field>
      </div>
      <Field label="Reason">
        <select className={inputCls} value={f.reason} onChange={e => set('reason', e.target.value)}>
          <option value="">Choose…</option>
          {meta.extra_reasons.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>
      <Field label="Covering for (if anyone)">
        <select className={inputCls} value={f.covering} onChange={e => set('covering', e.target.value)}>
          <option value="">Nobody</option>
          {away.map(p => <option key={p.employee_id} value={p.employee_id}>{p.name}, {p.post} ({p.code_label.toLowerCase()})</option>)}
        </select>
      </Field>
      <Field label="Remarks (optional)">
        <input className={inputCls} value={f.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Anything the manager or Accounts should know" />
      </Field>
      <p className="text-xs text-slate-500">Only the hours are recorded here. The overtime rate is worked out from the SOP when the day is locked.</p>
    </Modal>
  )
}

function CorrectionModal({ sheet, meta, entry, onClose, onSent }: { sheet: Sheet; meta: ShiftsMeta; entry: Entry; onClose: () => void; onSent: () => void }) {
  const extras = sheet.extras.filter(x => x.employee_id === entry.employee_id)
  const [kind, setKind] = useState('code')
  const [code, setCode] = useState(entry.code === 'P' ? 'A' : 'P')
  const [extra, setExtra] = useState(extras[0]?.id ?? '')
  const [hours, setHours] = useState('2')
  const [shift, setShift] = useState(sheet.shifts[0]?.code ?? 'M')
  const [xkind, setXkind] = useState('normal')
  const [reason, setReason] = useState('')
  const [sig, setSig] = useState(blankSig)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const send = async () => {
    setBusy(true); setErr('')
    const body: any = { kind, employee: entry.employee_id, reason, ...(meta.is_shared_account ? sig : {}) }
    if (kind === 'code') body.code = code
    if (kind === 'extra_add') Object.assign(body, { hours, shift_code: shift, extra_kind: xkind })
    if (kind === 'extra_change') Object.assign(body, { extra, hours })
    if (kind === 'extra_remove') body.extra = extra
    try { await shiftsApi.requestCorrection(sheet.id, body); onSent() } catch (e) { setErr(errMsg(e)) }
    setBusy(false)
  }
  return (
    <Modal title={`Request a correction for ${entry.name}`} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={busy || !reason.trim()} onClick={send}>Send to Unit Manager</Btn></>}>
      {err && <Note kind="error">{err}</Note>}
      <Field label="What should change">
        <select className={inputCls} value={kind} onChange={e => setKind(e.target.value)}>
          <option value="code">Attendance code (now {entry.code}, {entry.code_label})</option>
          <option value="extra_add">Add extra hours</option>
          {extras.length > 0 && <option value="extra_change">Change extra hours</option>}
          {extras.length > 0 && <option value="extra_remove">Remove extra hours</option>}
        </select>
      </Field>
      {kind === 'code' && (
        <Field label="Correct code">
          <select className={inputCls} value={code} onChange={e => setCode(e.target.value)}>
            {meta.codes.filter(c => c.code !== entry.code && (entry.shift_code === 'O' ? c.code === 'O' : c.code !== 'O')).map(c => <option key={c.code} value={c.code}>{c.code}, {c.label}</option>)}
          </select>
        </Field>
      )}
      {(kind === 'extra_change' || kind === 'extra_remove') && (
        <Field label="Which line">
          <select className={inputCls} value={extra} onChange={e => setExtra(e.target.value)}>
            {extras.map(x => <option key={x.id} value={x.id}>{num(x.hours)}h {x.kind}, {shiftName(x.shift_code)}</option>)}
          </select>
        </Field>
      )}
      {(kind === 'extra_add' || kind === 'extra_change') && (
        <div className="grid grid-cols-3 gap-2">
          <Field label="Hours"><input type="number" step={0.5} min={0.5} max={24} className={inputCls} value={hours} onChange={e => setHours(e.target.value)} /></Field>
          {kind === 'extra_add' && <Field label="Shift"><select className={inputCls} value={shift} onChange={e => setShift(e.target.value)}>{sheet.shifts.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select></Field>}
          {kind === 'extra_add' && <Field label="Type"><select className={inputCls} value={xkind} onChange={e => setXkind(e.target.value)}>{meta.extra_kinds.map(k => <option key={k.code} value={k.code}>{k.label}</option>)}</select></Field>}
        </div>
      )}
      <Field label="Reason (required)">
        <textarea rows={3} className={`${inputCls} py-2`} value={reason} onChange={e => setReason(e.target.value)} placeholder="Why the locked entry is wrong" />
      </Field>
      {meta.is_shared_account && <SignatureFields value={sig} onChange={setSig} />}
    </Modal>
  )
}

export function describeCorrection(c: { kind: string; previous: any; requested: any }, label: (c: string) => string) {
  if (c.kind === 'code') return `${c.previous.code} ${label(c.previous.code)} → ${c.requested.code} ${label(c.requested.code)}`
  if (c.kind === 'extra_add') return `Add ${num(c.requested.hours)}h ${c.requested.kind}, ${shiftName(c.requested.shift_code)}`
  if (c.kind === 'extra_remove') return `Remove ${num(c.previous.hours)}h ${c.previous.kind}, ${shiftName(c.previous.shift_code)}`
  return `${num(c.previous.hours)}h → ${num(c.requested.hours)}h`
}

export function DecideButtons({ id, onDone, setToast }: { id: string; onDone: () => void; setToast: (s: string) => void }) {
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const decide = async (approve: boolean) => {
    setBusy(true)
    try { await shiftsApi.decide(id, approve, note); setToast(approve ? 'Correction approved and applied' : 'Correction rejected'); onDone() }
    catch (e) { setToast(errMsg(e)) }
    setBusy(false)
  }
  return rejecting ? (
    <div className="flex flex-wrap gap-2 pt-1">
      <input className={`${inputCls} flex-1 min-w-[200px]`} placeholder="Reason for rejecting (required)" value={note} onChange={e => setNote(e.target.value)} />
      <Btn onClick={() => setRejecting(false)}>Cancel</Btn>
      <Btn kind="danger" disabled={busy || !note.trim()} onClick={() => decide(false)}>Reject</Btn>
    </div>
  ) : (
    <div className="flex flex-wrap gap-2 justify-end pt-1">
      <Btn kind="danger" disabled={busy} onClick={() => setRejecting(true)}>Reject</Btn>
      <Btn kind="primary" disabled={busy} onClick={() => decide(true)}>Approve change</Btn>
    </div>
  )
}
