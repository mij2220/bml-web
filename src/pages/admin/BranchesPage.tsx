import { useEffect, useState } from 'react'
import client from '../../api/client'
import { Plus, MapPin, Users, Building, Edit2 } from 'lucide-react'

interface Branch { id: string; name: string; city: string; country: string; employee_count: number; head_name: string; holiday_calendar: string; color: string }

const DEFAULTS: Branch[] = [
  { id:'1', name:'Karachi HQ',    city:'Karachi', country:'Pakistan', employee_count:35, head_name:'Admin User',  holiday_calendar:'Pakistan 2026',           color:'#10b981' },
  { id:'2', name:'Lahore Office', city:'Lahore',  country:'Pakistan', employee_count:12, head_name:'Sarah Khan',  holiday_calendar:'Pakistan 2026 (Lahore)',   color:'#3b82f6' },
]

function BranchModal({ branch, onClose, onSave }: { branch?: Branch | null; onClose: () => void; onSave: (b: any) => void }) {
  const [form, setForm] = useState({
    name: branch?.name ?? '', city: branch?.city ?? '', country: branch?.country ?? 'Pakistan',
    head_name: branch?.head_name ?? '', holiday_calendar: branch?.holiday_calendar ?? 'Pakistan 2026', color: branch?.color ?? '#10b981',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const inp = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 md:hidden"><div className="w-10 h-1 bg-slate-200 rounded-full"/></div>
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">{branch ? 'Edit Branch' : 'Add New Branch'}</h3>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs font-medium text-slate-600 mb-1">Branch Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Karachi HQ" className={inp}/></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">City *</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Karachi" className={inp}/></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Country</label>
              <input value={form.country} onChange={e => set('country', e.target.value)} className={inp}/></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Branch Head</label>
              <input value={form.head_name} onChange={e => set('head_name', e.target.value)} placeholder="Name" className={inp}/></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Holiday Calendar</label>
              <select value={form.holiday_calendar} onChange={e => set('holiday_calendar', e.target.value)} className={inp}>
                <option value="Pakistan 2026">Pakistan 2026</option>
                <option value="Pakistan 2026 (Lahore)">Pakistan 2026 (Lahore)</option>
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={e => set('color', e.target.value)} className="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer"/>
                <span className="text-xs text-slate-400 font-mono">{form.color}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50">Cancel</button>
          <button onClick={() => { if (!form.name || !form.city) return; onSave(form); onClose() }}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors">
            {branch ? 'Save Changes' : 'Add Branch'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Branches'
    client.get('/branches/').then(r => setBranches(r.data.data?.length ? r.data.data : DEFAULTS))
      .catch(() => setBranches(DEFAULTS)).finally(() => setLoading(false))
  }, [])

  const handleSave = (form: any) => {
    if (editing) {
      setBranches(prev => prev.map(b => b.id === editing.id ? { ...b, ...form } : b))
    } else {
      setBranches(prev => [...prev, { ...form, id: Date.now().toString(), employee_count: 0 }])
    }
    client.post('/branches/', form).catch(() => {})
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/></div>

  const total = branches.reduce((s, b) => s + b.employee_count, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{branches.length} branches · {total} total employees</p>
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus size={15}/> Add Branch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {branches.map(b => (
          <div key={b.id} className="bg-white rounded-2xl border-l-4 border border-slate-200 p-5" style={{ borderLeftColor: b.color }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{b.name}</h3>
                <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-sm">
                  <MapPin size={13}/> {b.city}, {b.country}
                </div>
              </div>
              <button onClick={() => { setEditing(b); setShowModal(true) }}
                className="flex items-center gap-1.5 text-xs text-slate-500 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50">
                <Edit2 size={11}/> Edit
              </button>
            </div>
            <div className="space-y-2.5">
              {[
                { icon: Users,    label: 'Employees',        value: String(b.employee_count) },
                { icon: Building, label: 'Branch Head',      value: b.head_name || '—' },
                { icon: null,     label: 'Holiday Calendar', value: b.holiday_calendar },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    {Icon && <Icon size={13}/>}{label}
                  </span>
                  <span className="font-semibold text-slate-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Add new card */}
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-5 flex flex-col items-center justify-center min-h-[180px] hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors group">
          <Building size={32} className="text-slate-300 group-hover:text-emerald-400 mb-3 transition-colors"/>
          <p className="font-semibold text-slate-400 group-hover:text-emerald-600 transition-colors">Add New Branch</p>
          <p className="text-xs text-slate-300 mt-1">Expand to a new location</p>
        </button>
      </div>

      {showModal && <BranchModal branch={editing} onClose={() => { setShowModal(false); setEditing(null) }} onSave={handleSave}/>}
    </div>
  )
}
