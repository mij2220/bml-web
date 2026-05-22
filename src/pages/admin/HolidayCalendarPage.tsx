import { useEffect, useState } from 'react'
import client from '../../api/client'
import { Plus, Trash2, Calendar, Globe } from 'lucide-react'

interface Holiday {
  id: string
  name: string
  date: string
  type: 'national' | 'religious' | 'optional' | 'company'
  description?: string
  is_recurring: boolean
}

const TYPE_CONFIG = {
  national:  { label: 'National',  color: 'bg-blue-100 text-blue-700 border-blue-200',   dot: 'bg-blue-500' },
  religious: { label: 'Religious', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  optional:  { label: 'Optional',  color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  company:   { label: 'Company',   color: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
}

// Pakistan 2026 default holidays
const PK_DEFAULTS: Omit<Holiday, 'id'>[] = [
  { name: 'New Year\'s Day',         date: '2026-01-01', type: 'national',  is_recurring: true },
  { name: 'Kashmir Solidarity Day',  date: '2026-02-05', type: 'national',  is_recurring: true },
  { name: 'Pakistan Day',            date: '2026-03-23', type: 'national',  is_recurring: true },
  { name: 'Eid ul-Fitr (Day 1)',     date: '2026-03-30', type: 'religious', is_recurring: false, description: 'Date subject to moon sighting' },
  { name: 'Eid ul-Fitr (Day 2)',     date: '2026-03-31', type: 'religious', is_recurring: false },
  { name: 'Eid ul-Fitr (Day 3)',     date: '2026-04-01', type: 'religious', is_recurring: false },
  { name: 'Labour Day',              date: '2026-05-01', type: 'national',  is_recurring: true },
  { name: 'Eid ul-Adha (Day 1)',     date: '2026-06-06', type: 'religious', is_recurring: false, description: 'Date subject to moon sighting' },
  { name: 'Eid ul-Adha (Day 2)',     date: '2026-06-07', type: 'religious', is_recurring: false },
  { name: 'Eid ul-Adha (Day 3)',     date: '2026-06-08', type: 'religious', is_recurring: false },
  { name: 'Independence Day',        date: '2026-08-14', type: 'national',  is_recurring: true },
  { name: 'Iqbal Day',               date: '2026-11-09', type: 'national',  is_recurring: true },
  { name: 'Quaid-e-Azam Day',        date: '2026-12-25', type: 'national',  is_recurring: true },
]

function AddHolidayModal({ onClose, onSave }: { onClose: () => void; onSave: (h: Omit<Holiday,'id'>) => void }) {
  const [form, setForm] = useState({ name: '', date: '', type: 'national' as Holiday['type'], description: '', is_recurring: false })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 md:hidden"><div className="w-10 h-1 bg-slate-200 rounded-full"/></div>
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Add Holiday</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Holiday Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Eid ul-Fitr"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="national">National</option>
                <option value="religious">Religious</option>
                <option value="optional">Optional</option>
                <option value="company">Company</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Note (optional)</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="e.g. Subject to moon sighting"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_recurring} onChange={e => set('is_recurring', e.target.checked)} className="accent-emerald-500 w-4 h-4"/>
            <span className="text-sm text-slate-700">Recurring annually</span>
          </label>
        </div>
        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => { if (!form.name || !form.date) return; onSave(form); onClose() }}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Add Holiday
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HolidayCalendarPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Holiday Calendar'
    // Try API first, fall back to defaults
    client.get('/holidays/').then(r => {
      const data = r.data.data ?? []
      if (data.length === 0) throw new Error('empty')
      setHolidays(data)
    }).catch(() => {
      // Load Pakistan defaults
      setHolidays(PK_DEFAULTS.map((h, i) => ({ ...h, id: String(i + 1) })))
    }).finally(() => setLoading(false))
  }, [])

  const handleAdd = (h: Omit<Holiday, 'id'>) => {
    const newH = { ...h, id: Date.now().toString() }
    setHolidays(prev => [...prev, newH].sort((a, b) => a.date.localeCompare(b.date)))
    client.post('/holidays/', h).catch(() => {})
  }

  const handleDelete = (id: string) => {
    setHolidays(prev => prev.filter(h => h.id !== id))
    client.delete(`/holidays/${id}/`).catch(() => {})
  }

  const filtered = holidays.filter(h => filter === 'all' || h.type === filter)
  const upcoming = filtered.filter(h => h.date >= new Date().toISOString().split('T')[0])
  const past = filtered.filter(h => h.date < new Date().toISOString().split('T')[0])

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'long' })
  const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/></div>

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Holidays', value: holidays.length, color: 'text-slate-900' },
          { label: 'National', value: holidays.filter(h=>h.type==='national').length, color: 'text-blue-600' },
          { label: 'Religious', value: holidays.filter(h=>h.type==='religious').length, color: 'text-emerald-600' },
          { label: 'Upcoming', value: upcoming.length, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap flex-1">
          {['all','national','religious','optional','company'].map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filter===t ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {t === 'all' ? 'All types' : t}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex-shrink-0">
          <Plus size={15}/> Add Holiday
        </button>
      </div>

      {/* Pakistan defaults notice */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <Globe size={16} className="text-emerald-600 flex-shrink-0"/>
        <p className="text-sm text-emerald-800">
          Showing <span className="font-semibold">Pakistan {currentYear}</span> public holidays. Add company-specific or optional holidays using the button above.
        </p>
      </div>

      {/* Upcoming holidays */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Upcoming</h3>
          <div className="space-y-2">
            {upcoming.map(h => {
              const cfg = TYPE_CONFIG[h.type]
              const days = daysUntil(h.date)
              return (
                <div key={h.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
                  {/* Date badge */}
                  <div className="text-center bg-slate-900 text-white rounded-xl px-3 py-2 flex-shrink-0 min-w-[56px]">
                    <p className="text-xs font-medium opacity-70">{new Date(h.date).toLocaleString('default',{month:'short'})}</p>
                    <p className="text-xl font-bold leading-none">{new Date(h.date).getDate()}</p>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{h.name}</p>
                      {h.is_recurring && <span className="text-xs text-slate-400">↻ yearly</span>}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {formatDate(h.date)}
                      {h.description && <span className="text-slate-400"> · {h.description}</span>}
                    </p>
                  </div>
                  {/* Right side */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full border capitalize ${cfg.color}`}>{cfg.label}</span>
                      <p className="text-xs text-slate-400 mt-1">
                        {days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `in ${days} days`}
                      </p>
                    </div>
                    <button onClick={() => handleDelete(h.id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Past holidays */}
      {past.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Past this year</h3>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {past.map(h => {
              const cfg = TYPE_CONFIG[h.type]
              return (
                <div key={h.id} className="flex items-center gap-3 px-4 py-3 opacity-60">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`}/>
                  <p className="text-sm text-slate-700 flex-1">{h.name}</p>
                  <p className="text-xs text-slate-400">{formatDate(h.date)}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${cfg.color}`}>{cfg.label}</span>
                  <button onClick={() => handleDelete(h.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-200 hover:text-red-400 transition-colors">
                    <Trash2 size={13}/>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showAdd && <AddHolidayModal onClose={() => setShowAdd(false)} onSave={handleAdd}/>}
    </div>
  )
}
