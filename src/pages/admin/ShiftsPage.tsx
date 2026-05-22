import { useEffect, useState } from 'react'
import client from '../../api/client'
import { Plus, Users, Edit2, Clock } from 'lucide-react'

interface Shift { id: string; name: string; code: string; start_time: string; end_time: string; total_hours: string; grace_minutes: number; employee_count: number; color: string; is_night: boolean }
interface Assignment { id: string; employee_name: string; department_name: string; shift_name: string; shift_color: string; effective_from: string }

const DEFAULTS: Shift[] = [
  { id:'1', name:'Morning Shift', code:'MS', start_time:'09:00', end_time:'18:00', total_hours:'8', grace_minutes:10, employee_count:28, color:'#10b981', is_night:false },
  { id:'2', name:'Evening Shift', code:'ES', start_time:'14:00', end_time:'23:00', total_hours:'8', grace_minutes:10, employee_count:10, color:'#3b82f6', is_night:false },
  { id:'3', name:'Night Shift',   code:'NS', start_time:'22:00', end_time:'07:00', total_hours:'8', grace_minutes:15, employee_count:5,  color:'#1e293b', is_night:true  },
  { id:'4', name:'Flexible',      code:'FL', start_time:'08:00', end_time:'20:00', total_hours:'8 core', grace_minutes:30, employee_count:4,  color:'#8b5cf6', is_night:false },
]

const DEMO_ASSIGNMENTS: Assignment[] = [
  { id:'1', employee_name:'Ahmed Khan',    department_name:'Finance',     shift_name:'Morning Shift', shift_color:'#10b981', effective_from:'Apr 1, 2020' },
  { id:'2', employee_name:'Sarah Khan',    department_name:'Engineering', shift_name:'Morning Shift', shift_color:'#10b981', effective_from:'Jan 1, 2022' },
  { id:'3', employee_name:'Usman Ahmed',   department_name:'Finance',     shift_name:'Morning Shift', shift_color:'#10b981', effective_from:'Jun 15, 2021' },
  { id:'4', employee_name:'Ali Raza',      department_name:'Engineering', shift_name:'Evening Shift', shift_color:'#3b82f6', effective_from:'Mar 1, 2024' },
  { id:'5', employee_name:'Fatima Malik',  department_name:'Engineering', shift_name:'Flexible',      shift_color:'#8b5cf6', effective_from:'Sep 1, 2023' },
]

function ShiftModal({ shift, onClose, onSave }: { shift?: Shift | null; onClose: () => void; onSave: (s: any) => void }) {
  const [form, setForm] = useState({
    name: shift?.name ?? '', code: shift?.code ?? '',
    start_time: shift?.start_time ?? '09:00', end_time: shift?.end_time ?? '18:00',
    grace_minutes: shift?.grace_minutes ?? 10, color: shift?.color ?? '#10b981',
    is_night: shift?.is_night ?? false,
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const inp = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 md:hidden"><div className="w-10 h-1 bg-slate-200 rounded-full"/></div>
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">{shift ? 'Edit Shift' : 'Create Shift'}</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Shift Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Morning Shift" className={inp}/></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Code *</label>
              <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="MS" maxLength={4} className={inp}/></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Start Time</label>
              <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className={inp}/></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">End Time</label>
              <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className={inp}/></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Grace Period (min)</label>
              <input type="number" value={form.grace_minutes} onChange={e => set('grace_minutes', parseInt(e.target.value))} min={0} max={60} className={inp}/></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={e => set('color', e.target.value)} className="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer"/>
                <span className="text-xs text-slate-400 font-mono">{form.color}</span>
              </div>
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_night} onChange={e => set('is_night', e.target.checked)} className="accent-emerald-500 w-4 h-4"/>
            <span className="text-sm text-slate-700">Night shift (crosses midnight)</span>
          </label>
        </div>
        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50">Cancel</button>
          <button onClick={() => { if (!form.name || !form.code) return; onSave(form); onClose() }}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors">
            {shift ? 'Save Changes' : 'Create Shift'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>(DEMO_ASSIGNMENTS)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Shift | null>(null)
  const [search, setSearch] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Shifts'
    client.get('/shifts/').then(r => setShifts(r.data.data?.length ? r.data.data : DEFAULTS))
      .catch(() => setShifts(DEFAULTS))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = (form: any) => {
    if (editing) {
      setShifts(prev => prev.map(s => s.id === editing.id ? { ...s, ...form } : s))
    } else {
      setShifts(prev => [...prev, { ...form, id: Date.now().toString(), employee_count: 0, total_hours: '8' }])
    }
    client.post('/shifts/', form).catch(() => {})
  }

  const totalEmployees = shifts.reduce((s, sh) => s + sh.employee_count, 0)
  const filtered = assignments.filter(a =>
    (!search || a.employee_name.toLowerCase().includes(search.toLowerCase())) &&
    (!shiftFilter || a.shift_name === shiftFilter)
  )

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/></div>

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{shifts.length} shifts configured · {totalEmployees} employees assigned</p>
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus size={15}/> Create Shift
        </button>
      </div>

      {/* Shift cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {shifts.map(s => (
          <div key={s.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="h-1.5" style={{ background: s.color }}/>
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-slate-900">{s.name}</p>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">{s.code}{s.is_night ? ' · 🌙 Night' : ''}</p>
                </div>
                <button onClick={() => { setEditing(s); setShowModal(true) }}
                  className="text-xs text-slate-500 border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-50 flex items-center gap-1">
                  <Edit2 size={11}/> Edit
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Start Time', value: s.start_time },
                  { label: 'End Time',   value: s.end_time },
                  { label: 'Total Hrs',  value: `${s.total_hours}h` },
                  { label: 'Grace',      value: `${s.grace_minutes} min` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-2.5">
                    <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-slate-900 font-mono">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-500"><span className="font-semibold text-slate-900">{s.employee_count}</span> employees</span>
                <button className="text-xs text-emerald-600 font-semibold border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-50 flex items-center gap-1">
                  <Users size={11}/> Assign
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Employee shift assignments */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Employee Shift Assignments</h3>
        </div>
        <div className="px-5 py-3 border-b border-slate-100 flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
          </div>
          <select value={shiftFilter} onChange={e => setShiftFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">All Shifts</option>
            {shifts.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Employee','Department','Current Shift','Effective From','Action'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(a => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-semibold text-slate-900">{a.employee_name}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{a.department_name}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: a.shift_color }}/>
                    {a.shift_name}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">{a.effective_from}</td>
                <td className="px-4 py-3">
                  <button className="text-xs text-emerald-600 font-semibold border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-50">Change</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <ShiftModal shift={editing} onClose={() => { setShowModal(false); setEditing(null) }} onSave={handleSave}/>}
    </div>
  )
}
