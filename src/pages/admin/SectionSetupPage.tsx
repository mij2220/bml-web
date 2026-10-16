import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Upload } from 'lucide-react'
import { shiftsAdmin, errMsg, todayIso, addDays, type Section } from '../../api/shifts'
import { getEmployees } from '../../api/employees'
import { Card, Btn, Chip, Spinner, Note, Modal, Field, inputCls, setTitle, Toast } from '../../components/shifts/ui'

export default function SectionSetupPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [s, setS] = useState<Section | null>(null)
  const [tab, setTab] = useState<'people' | 'shifts' | 'posts' | 'details'>('people')
  const [err, setErr] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const load = () => shiftsAdmin.sections.list().then(r => setS(r.find((x: Section) => x.id === id) ?? null)).catch(e => setErr(errMsg(e)))
  useEffect(() => { setTitle('Section set-up'); load() }, [id])
  if (err) return <Note kind="error">{err}</Note>
  if (!s) return <Spinner />
  const tabs = [['people', 'Groups and people'], ['shifts', 'Shift timings'], ['posts', 'Posts'], ['details', 'Details']] as const
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Btn kind="link" onClick={() => nav('/admin/sections')}><ArrowLeft size={15} /> Sections</Btn>
        <h2 className="text-lg font-bold">{s.department_name}, {s.name}</h2>
        {!s.is_active && <Chip>Switched off</Chip>}
      </div>
      <div className="flex gap-2 flex-wrap" role="tablist">
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
          className={`text-sm font-semibold rounded-full px-3 py-1.5 border ${tab === k ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white border-slate-300'}`}>{l}</button>)}
      </div>
      {tab === 'people' && <People s={s} reload={load} toast={setToast} />}
      {tab === 'shifts' && <Shifts s={s} reload={load} toast={setToast} />}
      {tab === 'posts' && <Posts s={s} reload={load} toast={setToast} />}
      {tab === 'details' && <Details s={s} reload={load} toast={setToast} />}
      <Toast msg={toast} onDone={() => setToast(null)} />
    </div>
  )
}

type P = { s: Section; reload: () => void; toast: (m: string) => void }

// Engro's rota (Abdullah, 6 Oct 2026): 6 mornings, 6 evenings, 6 nights with 2 days off in between
const ROTATIONS: [string, string][] = [
  // Engro Production 2026: Morning -> Night -> Evening, 2 off after each
  ['6-6-6 with 2 off (24 days)', 'M,M,M,M,M,M,O,O,N,N,N,N,N,N,O,O,E,E,E,E,E,E,O,O'],
  ['2-2-2 with 2 off (8 days)', 'M,M,E,E,N,N,O,O'],
  ['General, Mon-Fri', 'G,G,G,G,G,O,O'],
]

function People({ s, reload, toast }: P) {
  const [members, setMembers] = useState<any[] | null>(null)
  const [add, setAdd] = useState<string | null>(null)
  const [edit, setEdit] = useState<any>(null)
  const [importing, setImporting] = useState(false)
  const load = () => shiftsAdmin.members.list({ section: s.id }).then(setMembers).catch(e => toast(errMsg(e)))
  useEffect(() => { load() }, [s.id])
  const saveOffset = async (gid: string, offset: number) => {
    try { await shiftsAdmin.groups.update(gid, { offset }); toast('Group rotation moved'); reload() } catch (e) { toast(errMsg(e)) }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-end">
        <Btn onClick={() => setImporting(true)}><Upload size={15} /> Import from Excel (CSV)</Btn>
      </div>
      {!members ? <Spinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {s.groups.map(g => {
            const m = members.filter(x => x.group === g.id)
            return (
              <Card key={g.id} className="overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2">
                  <h3 className="font-bold flex-1">Group {g.name} <span className="text-sm font-normal text-slate-500">{m.length} people, {m.filter(x => x.is_trainee).length} trainees</span></h3>
                  <label className="text-xs text-slate-500 flex items-center gap-1">Rotation offset
                    <select className="border border-slate-300 rounded px-1 py-0.5" value={g.offset} onChange={e => saveOffset(g.id, Number(e.target.value))}>
                      {s.pattern.split(',').map((_, i) => <option key={i} value={i}>{i}</option>)}
                    </select></label>
                </div>
                {m.map(x => (
                  <button key={x.id} onClick={() => setEdit(x)} className="w-full text-left px-4 py-2 border-b border-slate-50 hover:bg-slate-50 flex items-center gap-2 text-sm">
                    <span className="w-16 text-xs font-semibold text-slate-600">{x.post_code || '—'}</span>
                    <span className="flex-1"><b>{x.employee_name}</b> <span className="text-xs text-slate-500">P.No. {x.p_number}</span></span>
                    {x.is_trainee && <Chip tone="purple">Trainee</Chip>}
                    <span className="text-xs text-emerald-700">Edit</span>
                  </button>
                ))}
                <div className="p-3"><Btn className="w-full border-dashed" onClick={() => setAdd(g.id)}><Plus size={15} /> Add to Group {g.name}</Btn></div>
              </Card>
            )
          })}
        </div>
      )}
      {add && <AddMember s={s} group={add} onClose={() => setAdd(null)} onDone={() => { setAdd(null); toast('Added'); load(); reload() }} />}
      {edit && <EditMember s={s} m={edit} onClose={() => setEdit(null)} onDone={msg => { setEdit(null); toast(msg); load(); reload() }} />}
      {importing && <ImportMembers s={s} onClose={() => setImporting(false)} onDone={() => { setImporting(false); load(); reload() }} />}
    </div>
  )
}

function PersonSearch({ value, onPick }: { value: any; onPick: (e: any) => void }) {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<any[]>([])
  useEffect(() => {
    if (q.trim().length < 2) { setRows([]); return }
    const t = setTimeout(() => getEmployees({ search: q, page_size: '20', status: 'active' }).then(r => setRows(r.data.data ?? [])).catch(() => {}), 250)
    return () => clearTimeout(t)
  }, [q])
  if (value) return <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 text-sm"><b className="flex-1">{value.full_name}</b><span className="text-slate-500">P.No. {value.p_number}</span><Btn kind="link" onClick={() => onPick(null)}>Change</Btn></div>
  return (
    <div>
      <input className={inputCls} placeholder="Type a name or P.No." value={q} onChange={e => setQ(e.target.value)} autoFocus />
      {rows.length > 0 && <div className="border border-slate-200 rounded-lg mt-1 max-h-52 overflow-y-auto">
        {rows.map(r => <button key={r.id} onClick={() => onPick(r)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"><b>{r.full_name}</b> <span className="text-slate-500">P.No. {r.p_number ?? '—'} · {r.department_name}</span></button>)}
      </div>}
    </div>
  )
}

function AddMember({ s, group, onClose, onDone }: { s: Section; group: string; onClose: () => void; onDone: () => void }) {
  const [emp, setEmp] = useState<any>(null)
  const [post, setPost] = useState('')
  const [ta, setTa] = useState(false)
  const [from, setFrom] = useState(todayIso())
  const [err, setErr] = useState('')
  const save = async () => {
    try { await shiftsAdmin.members.create({ employee: emp.id, group, post: post || null, is_trainee: ta, effective_from: from }); onDone() }
    catch (e) { setErr(errMsg(e)) }
  }
  return (
    <Modal title={`Add to Group ${s.groups.find(g => g.id === group)?.name}`} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={!emp} onClick={save}>Add</Btn></>}>
      {err && <Note kind="error">{err}</Note>}
      <Field label="Person (must exist in Employees)"><PersonSearch value={emp} onPick={setEmp} /></Field>
      <Field label="Post"><select className={inputCls} value={post} onChange={e => setPost(e.target.value)}><option value="">No post</option>{s.posts.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}</select></Field>
      <Field label="From"><input type="date" className={inputCls} value={from} onChange={e => setFrom(e.target.value)} /></Field>
      <label className="flex items-center gap-2 text-sm min-h-[40px]"><input type="checkbox" className="w-5 h-5" checked={ta} onChange={e => setTa(e.target.checked)} /> Trainee (T/A)</label>
    </Modal>
  )
}

function EditMember({ s, m, onClose, onDone }: { s: Section; m: any; onClose: () => void; onDone: (msg: string) => void }) {
  const [post, setPost] = useState(m.post ?? '')
  const [ta, setTa] = useState(!!m.is_trainee)
  const [group, setGroup] = useState(m.group)
  const [from, setFrom] = useState(addDays(todayIso(), 1))
  const [end, setEnd] = useState(todayIso())
  const [err, setErr] = useState('')
  const moving = group !== m.group
  const save = async () => {
    try {
      if (moving) { await shiftsAdmin.moveMember(m.id, { group, post: post || null, is_trainee: ta, from }); onDone('Moved; earlier attendance stays with the old group') }
      else { await shiftsAdmin.members.update(m.id, { post: post || null, is_trainee: ta }); onDone('Saved') }
    } catch (e) { setErr(errMsg(e)) }
  }
  const finish = async () => {
    try { await shiftsAdmin.members.update(m.id, { effective_to: end }); onDone('Removed from the section from the next day') } catch (e) { setErr(errMsg(e)) }
  }
  return (
    <Modal title={m.employee_name} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={save}>{moving ? 'Move' : 'Save'}</Btn></>}>
      {err && <Note kind="error">{err}</Note>}
      <Field label="Group"><select className={inputCls} value={group} onChange={e => setGroup(e.target.value)}>{s.groups.map(g => <option key={g.id} value={g.id}>Group {g.name}</option>)}</select></Field>
      {moving && <Field label="Move applies from" hint="Attendance before this date stays with the old group."><input type="date" className={inputCls} value={from} onChange={e => setFrom(e.target.value)} /></Field>}
      <Field label="Post"><select className={inputCls} value={post} onChange={e => setPost(e.target.value)}><option value="">No post</option>{s.posts.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}</select></Field>
      <label className="flex items-center gap-2 text-sm min-h-[40px]"><input type="checkbox" className="w-5 h-5" checked={ta} onChange={e => setTa(e.target.checked)} /> Trainee (T/A)</label>
      <div className="border-t border-slate-100 pt-3">
        <Field label="Leaves the section after"><div className="flex gap-2"><input type="date" className={inputCls} value={end} onChange={e => setEnd(e.target.value)} /><Btn kind="danger" onClick={finish}>Remove</Btn></div></Field>
      </div>
    </Modal>
  )
}

function ImportMembers({ s, onClose, onDone }: { s: Section; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [res, setRes] = useState<any>(null)
  const [err, setErr] = useState('')
  const run = async (dry: boolean) => {
    if (!file) return
    setErr('')
    try { const r = await shiftsAdmin.importMembers(s.id, file, dry); setRes(r); if (!dry) onDone() } catch (e) { setErr(errMsg(e)) }
  }
  return (
    <Modal title="Import people from a CSV file" onClose={onClose} wide
      footer={<><Btn onClick={onClose}>Close</Btn><Btn disabled={!file} onClick={() => run(true)}>Check the file</Btn><Btn kind="primary" disabled={!file || !res?.would_add} onClick={() => run(false)}>Add {res?.would_add ?? ''} people</Btn></>}>
      <p className="text-sm text-slate-600">Save the sheet from Excel as CSV with these columns: <code>p_number, group, post, trainee, from</code>. Group is A-D, post must exist under Posts, trainee is yes or empty, from is YYYY-MM-DD. People must already be in Employees.</p>
      <input type="file" accept=".csv,text/csv" onChange={e => { setFile(e.target.files?.[0] ?? null); setRes(null) }} />
      {err && <Note kind="error">{err}</Note>}
      {res && (
        <div className="space-y-2 text-sm">
          <Note kind={res.problems.length ? 'warn' : 'info'}>{res.dry_run ? `${res.would_add} people can be added.` : `${res.added} added.`} {res.problems.length ? `${res.problems.length} line(s) have a problem and will be skipped:` : ''}</Note>
          {res.problems.length > 0 && <ul className="max-h-48 overflow-y-auto list-disc pl-5">{res.problems.map((p: any) => <li key={p.line}>Line {p.line}: {p.problem}</li>)}</ul>}
        </div>
      )}
    </Modal>
  )
}

function Shifts({ s, reload, toast }: P) {
  const save = async (id: string, field: string, value: any) => {
    try { await shiftsAdmin.shiftTypes.update(id, { [field]: value }); toast('Saved'); reload() } catch (e) { toast(errMsg(e)) }
  }
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left px-3 py-2">Shift</th><th>Sheet code</th><th>Starts</th><th>Ends</th><th>Hours</th><th>Premium</th><th title="Fewest people the shift needs; the daily sheet shows a shortfall">Min. staff</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {s.shift_types.map(t => (
            <tr key={t.id}>
              <td className="px-3 py-2 font-semibold">{t.name} ({t.code})</td>
              <td className="text-center"><input className="border border-slate-300 rounded px-2 py-1 w-14 text-center" defaultValue={t.sheet_code} onBlur={e => e.target.value !== t.sheet_code && save(t.id, 'sheet_code', e.target.value)} /></td>
              <td className="text-center"><input type="time" className="border border-slate-300 rounded px-1 py-1" defaultValue={t.start_time.slice(0, 5)} onBlur={e => save(t.id, 'start_time', e.target.value)} /></td>
              <td className="text-center"><input type="time" className="border border-slate-300 rounded px-1 py-1" defaultValue={t.end_time.slice(0, 5)} onBlur={e => save(t.id, 'end_time', e.target.value)} /></td>
              <td className="text-center"><input type="number" step={0.5} className="border border-slate-300 rounded px-2 py-1 w-16 text-center" defaultValue={t.hours} onBlur={e => e.target.value !== t.hours && save(t.id, 'hours', e.target.value)} /></td>
              <td className="text-center"><select className="border border-slate-300 rounded px-1 py-1" defaultValue={t.premium} onChange={e => save(t.id, 'premium', e.target.value)}>
                <option value="none">None</option><option value="evening">Evening (12%)</option><option value="night">Night (17%)</option></select></td>
              <td className="text-center"><input type="number" min={0} className="border border-slate-300 rounded px-2 py-1 w-16 text-center" defaultValue={t.min_staff ?? 0} onBlur={e => Number(e.target.value) !== (t.min_staff ?? 0) && save(t.id, 'min_staff', Number(e.target.value) || 0)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-500 p-3">Assumption A-4: 1 Morning 06:00-14:00, 2 Evening 14:00-22:00, 0 Night 22:00-06:00, 8 hours each. PM&S and Encop-3 can be set differently here.</p>
    </Card>
  )
}

function Posts({ s, reload, toast }: P) {
  const [code, setCode] = useState('')
  const add = async () => { try { await shiftsAdmin.posts.create({ section: s.id, code, order: s.posts.length }); setCode(''); toast('Post added'); reload() } catch (e) { toast(errMsg(e)) } }
  const remove = async (id: string) => { try { await shiftsAdmin.posts.remove(id); toast('Post removed'); reload() } catch (e) { toast(errMsg(e)) } }
  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap gap-2">{s.posts.length === 0 && <span className="text-sm text-slate-500">No posts yet.</span>}
        {s.posts.map(p => <span key={p.id} className="inline-flex items-center gap-1 bg-slate-100 rounded-full pl-3 pr-1 py-1 text-sm font-semibold">{p.code}<button aria-label={`Remove ${p.code}`} className="w-6 h-6 rounded-full hover:bg-slate-200" onClick={() => remove(p.id)}>×</button></span>)}</div>
      <div className="flex gap-2 max-w-sm"><input className={inputCls} placeholder="New post, e.g. Board" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && code && add()} /><Btn kind="primary" disabled={!code} onClick={add}>Add</Btn></div>
    </Card>
  )
}

function Details({ s, reload, toast }: P) {
  const [f, setF] = useState({ name: s.name, code: s.code, pattern: s.pattern, pattern_anchor: s.pattern_anchor, print_title: s.print_title, is_active: s.is_active })
  const save = async () => { try { await shiftsAdmin.sections.update(s.id, f); toast('Saved'); reload() } catch (e) { toast(errMsg(e)) } }
  const spread = async () => {
    if (f.pattern !== s.pattern) { toast('Save the rotation first'); return }
    try { const r = await shiftsAdmin.spreadGroups(s.id); toast(r.message); reload() } catch (e) { toast(errMsg(e)) }
  }
  const engro2026 = async () => {
    if (!confirm("Set this section to Engro's 2026 shift schedule (groups A-D)? Days not yet locked follow the new schedule.")) return
    try { const r = await shiftsAdmin.spreadGroups(s.id, 'engro_2026'); toast(r.message); reload() } catch (e) { toast(errMsg(e)) }
  }
  return (
    <Card className="p-4 space-y-3 max-w-xl">
      <Field label="Section name"><input className={inputCls} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Heading on the printed sheet"><input className={inputCls} value={f.print_title} onChange={e => setF({ ...f, print_title: e.target.value })} /></Field>
      <Field label="Rotation" hint="Changing it changes the roster for every day not yet locked."><input className={inputCls} value={f.pattern} onChange={e => setF({ ...f, pattern: e.target.value })} /></Field>
      <div className="flex flex-wrap gap-2 -mt-1">
        <span className="text-xs text-slate-500 self-center">Quick fill:</span>
        {ROTATIONS.map(([label, p]) => <Btn key={label} onClick={() => setF({ ...f, pattern: p })}>{label}</Btn>)}
      </div>
      <Field label="Rotation starts on"><input type="date" className={inputCls} value={f.pattern_anchor} onChange={e => setF({ ...f, pattern_anchor: e.target.value })} /></Field>
      <label className="flex items-center gap-2 text-sm min-h-[40px]"><input type="checkbox" className="w-5 h-5" checked={f.is_active} onChange={e => setF({ ...f, is_active: e.target.checked })} /> Section in use (untick to switch it off; nothing is deleted)</label>
      <div className="flex flex-wrap gap-2">
        <Btn kind="primary" onClick={save}>Save</Btn>
        <Btn onClick={spread} title="Group A starts the rotation; each next group starts evenly later">Place groups evenly on the rotation</Btn>
        <Btn onClick={engro2026} title="Rotation, start date and groups A-D exactly as Engro's Production Department Shift Schedule 2026">Use Engro 2026 schedule</Btn>
      </div>
      <p className="text-xs text-slate-500">After changing the rotation, place the groups evenly, then open Roster and check one day against the plant (e.g. "today Group B is on Morning"). Move a group with its rotation offset under People if needed.</p>
    </Card>
  )
}
