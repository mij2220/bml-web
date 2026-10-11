import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { shiftsAdmin, errMsg, type Section } from '../../api/shifts'
import { getEmployees } from '../../api/employees'
import { Card, Btn, Chip, Spinner, Note, Modal, Field, inputCls, setTitle, Toast } from '../../components/shifts/ui'

const ROLES: Record<string, { label: string; does: string }[]> = {
  attendance: [
    { label: 'marker', does: 'Boardman: marks attendance and extra hours, submits each shift' },
    { label: 'reviewer', does: 'Shift Supervisor: marks, reviews the day, sends a shift back' },
    { label: 'manager', does: 'Unit Manager: approves and locks the day, decides corrections' },
    { label: 'clerk', does: 'Office Assistant: views and prints sheets' },
    { label: 'accounts', does: 'Accounts / PRD: monthly hours for the section(s)' },
  ],
  overtime: [
    { label: 'viewer', does: 'Sees the overtime statement and exports it' },
    { label: 'accounts', does: 'Accounts / PRD: overtime statement, export, closes the month' },
  ],
}
const NAME: Record<string, string> = { marker: 'Marker (Boardman)', reviewer: 'Reviewer (Shift Supervisor)', manager: 'Manager (Unit Manager)', clerk: 'Clerk (Office Assistant)', accounts: 'Accounts / PRD', viewer: 'Viewer' }

export default function AccessPage() {
  const [settings, setSettings] = useState<any>(null)
  const [roles, setRoles] = useState<any[] | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [filter, setFilter] = useState('attendance')
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const load = () => shiftsAdmin.roles.list().then(setRoles).catch(e => setErr(errMsg(e)))
  useEffect(() => {
    setTitle('Roles and access')
    shiftsAdmin.settings().then(setSettings).catch(e => setErr(errMsg(e)))
    shiftsAdmin.sections.list().then(setSections).catch(() => {})
    load()
  }, [])
  const toggle = async (k: string, v: boolean) => {
    try { setSettings(await shiftsAdmin.saveSettings({ [k]: v })); setToast('Saved. People see the change after they reload the app.') } catch (e) { setToast(errMsg(e)) }
  }
  const remove = async (id: string) => { try { await shiftsAdmin.roles.remove(id); setToast('Role removed'); load() } catch (e) { setToast(errMsg(e)) } }
  if (err) return <Note kind="error">{err}</Note>
  const shown = (roles ?? []).filter(r => r.module === filter)
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-bold">Modules</h3>
        <p className="text-sm text-slate-600">Leave is always on. Attendance and Overtime appear only for people who belong to a shift group or have a role below. Admin sees everything.</p>
        {!settings ? <Spinner /> : (
          <div className="flex flex-wrap gap-6">
            {[['attendance_enabled', 'Attendance'], ['overtime_enabled', 'Overtime']].map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-sm font-semibold min-h-[40px]">
                <input type="checkbox" className="w-5 h-5" checked={!!settings[k]} onChange={e => toggle(k, e.target.checked)} /> {l} switched on
              </label>
            ))}
          </div>
        )}
      </Card>
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2">
          <div className="flex gap-2" role="tablist">
            {['attendance', 'overtime'].map(m => <button key={m} role="tab" aria-selected={filter === m} onClick={() => setFilter(m)}
              className={`text-sm font-semibold rounded-full px-3 py-1.5 border ${filter === m ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white border-slate-300'}`}>{m === 'attendance' ? 'Attendance roles' : 'Overtime roles'}</button>)}
          </div>
          <div className="flex-1" />
          <Btn kind="primary" onClick={() => setAdding(true)}><Plus size={15} /> Give a role</Btn>
        </div>
        <div className="px-4 py-3 bg-slate-50 text-xs text-slate-600 space-y-0.5">
          {ROLES[filter].map(r => <div key={r.label}><b>{NAME[r.label]}</b>: {r.does}</div>)}
          {filter === 'overtime' && <div>Attendance reviewers and managers also see their own section's overtime statement.</div>}
        </div>
        {!roles ? <Spinner /> : shown.length === 0 ? <p className="p-4 text-sm text-slate-500">Nobody has a role here yet.</p> : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="text-left px-4 py-2">Person</th><th className="text-left">Role</th><th className="text-left">Section</th><th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map(r => (
                <tr key={r.id}>
                  <td className="px-4 py-2"><b>{r.employee_name}</b> <span className="text-xs text-slate-500">P.No. {r.p_number}</span></td>
                  <td>{NAME[r.role] ?? r.role}</td>
                  <td>{r.section ? r.section_name : <Chip tone="blue">All sections</Chip>}</td>
                  <td className="text-right pr-3"><button aria-label="Remove role" className="p-2 rounded-lg hover:bg-red-50 text-red-600" onClick={() => remove(r.id)}><Trash2 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {adding && <AddRole module={filter} sections={sections} onClose={() => setAdding(false)} onDone={() => { setAdding(false); setToast('Role given'); load() }} />}
      <Toast msg={toast} onDone={() => setToast(null)} />
    </div>
  )
}

function AddRole({ module, sections, onClose, onDone }: { module: string; sections: Section[]; onClose: () => void; onDone: () => void }) {
  const [q, setQ] = useState('')
  const [people, setPeople] = useState<any[]>([])
  const [emp, setEmp] = useState<any>(null)
  const [role, setRole] = useState(ROLES[module][0].label)
  const [section, setSection] = useState(sections[0]?.id ?? '')
  const [err, setErr] = useState('')
  useEffect(() => {
    if (q.trim().length < 2) { setPeople([]); return }
    const t = setTimeout(() => getEmployees({ search: q, page_size: '20', status: 'active' }).then(r => setPeople(r.data.data ?? [])).catch(() => {}), 250)
    return () => clearTimeout(t)
  }, [q])
  const save = async () => {
    try { await shiftsAdmin.roles.create({ employee: emp.id, module, role, section: section || null }); onDone() } catch (e) { setErr(errMsg(e)) }
  }
  return (
    <Modal title={`Give a ${module} role`} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={!emp} onClick={save}>Give role</Btn></>}>
      {err && <Note kind="error">{err}</Note>}
      <Field label="Person">
        {emp ? <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 text-sm"><b className="flex-1">{emp.full_name}</b><Btn kind="link" onClick={() => setEmp(null)}>Change</Btn></div> : (
          <>
            <input className={inputCls} placeholder="Type a name or P.No." value={q} onChange={e => setQ(e.target.value)} autoFocus />
            {people.length > 0 && <div className="border border-slate-200 rounded-lg mt-1 max-h-48 overflow-y-auto">
              {people.map(p => <button key={p.id} onClick={() => setEmp(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"><b>{p.full_name}</b> <span className="text-slate-500">P.No. {p.p_number ?? '—'} · {p.department_name}</span></button>)}
            </div>}
          </>
        )}
      </Field>
      <Field label="Role"><select className={inputCls} value={role} onChange={e => setRole(e.target.value)}>{ROLES[module].map(r => <option key={r.label} value={r.label}>{NAME[r.label]}</option>)}</select></Field>
      <Field label="Section"><select className={inputCls} value={section} onChange={e => setSection(e.target.value)}>
        {sections.map(s => <option key={s.id} value={s.id}>{s.department_name}, {s.name}</option>)}
        <option value="">All sections</option></select></Field>
    </Modal>
  )
}
