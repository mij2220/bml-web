import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { shiftsAdmin, errMsg, todayIso, type Section } from '../../api/shifts'
import { getDepartments } from '../../api/employees'
import { Card, Btn, Chip, Spinner, Empty, Note, Modal, Field, inputCls, setTitle, Toast } from '../../components/shifts/ui'

export default function ShiftSectionsPage() {
  const nav = useNavigate()
  const [rows, setRows] = useState<Section[] | null>(null)
  const [err, setErr] = useState('')
  const [adding, setAdding] = useState(false)
  const load = () => shiftsAdmin.sections.list().then(setRows).catch(e => setErr(errMsg(e)))
  useEffect(() => { setTitle('Shift sections'); load() }, [])
  if (err) return <Note kind="error">{err}</Note>
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 flex-1 min-w-[240px]">A section is one unit's shift area with its own groups, posts and daily sheet (for example Ammonia-2, Production).</p>
        <Btn kind="primary" onClick={() => setAdding(true)}><Plus size={15} /> New section</Btn>
      </div>
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty>No section yet. Start with the pilot section, Ammonia-2 Production.</Empty> : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {rows.map(s => (
            <button key={s.id} onClick={() => nav(`/admin/sections/${s.id}`)} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]"><b>{s.department_name}, {s.name}</b><div className="text-xs text-slate-500">Rotation {s.pattern} · {s.groups.length} groups · {s.posts.length} posts · {s.groups.reduce((a, g) => a + g.member_count, 0)} people</div></div>
              {!s.is_active && <Chip>Switched off</Chip>}
              <span className="text-sm text-emerald-700 font-semibold">Set up</span>
            </button>
          ))}
        </Card>
      )}
      {adding && <NewSection onClose={() => setAdding(false)} onDone={id => nav(`/admin/sections/${id}`)} />}
    </div>
  )
}

function NewSection({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const [units, setUnits] = useState<any[]>([])
  const [f, setF] = useState({ department: '', name: 'Production', code: '', pattern: 'M,M,E,E,N,N,O,O', pattern_anchor: todayIso().slice(0, 8) + '01', print_title: '' })
  const [err, setErr] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => { getDepartments().then(r => setUnits(r.data.data ?? [])).catch(() => {}) }, [])
  const save = async () => {
    setErr('')
    try { const s = await shiftsAdmin.sections.create(f); onDone(s.id) } catch (e) { setErr(errMsg(e)) }
  }
  return (
    <Modal title="New shift section" onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={!f.department || !f.name} onClick={save}>Create</Btn></>}>
      {err && <Note kind="error">{err}</Note>}
      <Field label="Unit"><select className={inputCls} value={f.department} onChange={e => setF({ ...f, department: e.target.value })}>
        <option value="">Choose…</option>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
      <Field label="Section name"><input className={inputCls} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Rotation" hint="Repeats forever. M Morning, E Evening, N Night, G General, O Off. The usual 8-day rota creates groups A-D for you.">
        <input className={inputCls} value={f.pattern} onChange={e => setF({ ...f, pattern: e.target.value })} /></Field>
      <Field label="Rotation starts on" hint="The day on which Group C works the first Morning of the rotation. You can adjust group offsets afterwards.">
        <input type="date" className={inputCls} value={f.pattern_anchor} onChange={e => setF({ ...f, pattern_anchor: e.target.value })} /></Field>
      <Field label="Heading on the printed sheet (optional)"><input className={inputCls} value={f.print_title} placeholder="e.g. Ammonia-2, Production Department" onChange={e => setF({ ...f, print_title: e.target.value })} /></Field>
      <Toast msg={toast} onDone={() => setToast(null)} />
    </Modal>
  )
}
