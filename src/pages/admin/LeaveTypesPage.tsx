import { useEffect, useState } from 'react'
import client from '../../api/client'
import { Plus, Settings, CheckCircle, XCircle, Edit2 } from 'lucide-react'

interface LeaveType {
  id: string
  name: string
  code: string
  is_paid: boolean
  accrual_type: string
  accrual_amount: string
  max_balance: string
  carryover_limit: string
  approval_levels: number
  allow_half_day: boolean
  allow_hourly: boolean
  color: string
  is_active: boolean
  gender_restriction: string
}

function LeaveTypeModal({ leaveType, onClose, onSave }: {
  leaveType?: LeaveType | null
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState({
    name: leaveType?.name ?? '',
    code: leaveType?.code ?? '',
    is_paid: leaveType?.is_paid ?? true,
    accrual_type: leaveType?.accrual_type ?? 'on_join',
    accrual_amount: leaveType?.accrual_amount ?? '0',
    max_balance: leaveType?.max_balance ?? '30',
    carryover_limit: leaveType?.carryover_limit ?? '0',
    approval_levels: leaveType?.approval_levels ?? 1,
    allow_half_day: leaveType?.allow_half_day ?? false,
    color: leaveType?.color ?? '#10b981',
    gender_restriction: leaveType?.gender_restriction ?? 'none',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name || !form.code) return setError('Name and code are required.')
    setSaving(true)
    try {
      if (leaveType) {
        await client.patch(`/leave-types/${leaveType.id}/`, form)
      } else {
        await client.post('/leave-types/', form)
      }
      onSave()
      onClose()
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Save failed.')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-lg">{leaveType ? 'Edit Leave Type' : 'New Leave Type'}</h3>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg border border-red-200">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Code *</label>
              <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} maxLength={10}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Days Allocated</label>
              <input type="number" value={form.accrual_amount} onChange={e => set('accrual_amount', e.target.value)} min="0" max="365"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max Balance</label>
              <input type="number" value={form.max_balance} onChange={e => set('max_balance', e.target.value)} min="0"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Carryover Limit</label>
              <input type="number" value={form.carryover_limit} onChange={e => set('carryover_limit', e.target.value)} min="0"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Approval Levels</label>
              <select value={form.approval_levels} onChange={e => set('approval_levels', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value={1}>1 level</option>
                <option value={2}>2 levels</option>
                <option value={3}>3 levels</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                  className="w-10 h-9 border border-slate-200 rounded-lg cursor-pointer" />
                <span className="text-sm text-slate-500 font-mono">{form.color}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Gender</label>
              <select value={form.gender_restriction} onChange={e => set('gender_restriction', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="none">All genders</option>
                <option value="male">Male only</option>
                <option value="female">Female only</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <input type="checkbox" checked={form.is_paid} onChange={e => set('is_paid', e.target.checked)} className="accent-emerald-500" />
              Paid leave
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <input type="checkbox" checked={form.allow_half_day} onChange={e => set('allow_half_day', e.target.checked)} className="accent-emerald-500" />
              Allow half day
            </label>
          </div>
        </div>
        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving ? 'Saving...' : (leaveType ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LeaveTypesPage() {
  const [types, setTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LeaveType | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await client.get('/leave-types/')
      setTypes(data.data ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Leave Types'
    load()
  }, [])

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this leave type?')) return
    await client.delete(`/leave-types/${id}/`)
    load()
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setEditing(null); setModalOpen(true) }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> New Leave Type
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : types.map(lt => (
          <div key={lt.id} className="bg-white rounded-xl border border-slate-200 p-5 relative overflow-hidden">
            {/* Color bar */}
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: lt.color }} />

            <div className="flex items-start justify-between mb-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: lt.color }} />
                <span className="font-bold text-slate-900">{lt.name}</span>
              </div>
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{lt.code}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-slate-50 rounded-lg p-2.5">
                <p className="text-xs text-slate-500">Allocated</p>
                <p className="text-lg font-bold text-slate-900">{parseFloat(lt.accrual_amount).toFixed(0)}d</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5">
                <p className="text-xs text-slate-500">Max Balance</p>
                <p className="text-lg font-bold text-slate-900">{parseFloat(lt.max_balance).toFixed(0)}d</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {lt.is_paid && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">Paid</span>}
              {lt.allow_half_day && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Half day</span>}
              {lt.carryover_limit !== '0.00' && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">Carryover</span>}
              {lt.gender_restriction !== 'none' && (
                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full capitalize">{lt.gender_restriction} only</span>
              )}
              <span className="text-xs bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full">{lt.approval_levels}L approval</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setEditing(lt); setModalOpen(true) }}
                className="flex-1 flex items-center justify-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Edit2 size={12} /> Edit
              </button>
              <button
                onClick={() => handleDeactivate(lt.id)}
                className="flex-1 flex items-center justify-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium py-1.5 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
              >
                <XCircle size={12} /> Deactivate
              </button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <LeaveTypeModal
          leaveType={editing}
          onClose={() => { setModalOpen(false); setEditing(null) }}
          onSave={load}
        />
      )}
    </div>
  )
}
