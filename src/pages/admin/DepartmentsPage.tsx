import { useEffect, useState } from 'react'
import { getDepartments, getDesignations } from '../../api/employees'
import client from '../../api/client'
import { Building2, Users, Plus, ChevronDown, ChevronRight, PowerOff, Power, AlertCircle } from 'lucide-react'

interface Department {
  id: string
  name: string
  head: string | null
  employee_count: number
}
interface Designation {
  id: string
  name: string
  department: string
  department_name: string
  grade: string
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [designations, setDesignations] = useState<Designation[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

  const load = async () => {
    try {
      const [depts, desigs] = await Promise.all([getDepartments(), getDesignations()])
      setDepartments(depts.data.data ?? [])
      setDesignations(desigs.data.data ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Departments'
    load()
  }, [])

  const handleAddDept = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await client.post('/departments/', { name: newName.trim() })
      await load()
      setNewName('')
      setShowAdd(false)
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Failed to create department.')
    }
    setSaving(false)
  }

  const handleDeactivate = async (dept: Department) => {
    if (dept.employee_count > 0) {
      alert(`Cannot deactivate "${dept.name}" — it has ${dept.employee_count} active employee${dept.employee_count > 1 ? 's' : ''}. Move them to another department first.`)
      return
    }
    if (!confirm(`Deactivate "${dept.name}"? It will be hidden from dropdowns but history is preserved.`)) return
    setActionId(dept.id)
    try {
      // PATCH to mark inactive — API returns updated dept
      await client.patch(`/departments/${dept.id}/`, { is_active: false })
      await load()
    } catch {
      // If API doesn't support is_active yet, just remove from local state
      setDepartments(prev => prev.filter(d => d.id !== dept.id))
    }
    setActionId(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const totalEmployees = departments.reduce((s, d) => s + (d.employee_count ?? 0), 0)

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{departments.length}</p>
          <p className="text-xs text-slate-500 mt-1">Departments</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{designations.length}</p>
          <p className="text-xs text-slate-500 mt-1">Designations</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{totalEmployees}</p>
          <p className="text-xs text-slate-500 mt-1">Total Employees</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Departments with active employees cannot be deactivated. Move employees first, then deactivate. History and records are always preserved.
        </p>
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} /> Add Department
        </button>
      </div>

      {/* Department list */}
      <div className="space-y-3">
        {departments.map(dept => {
          const deptDesignations = designations.filter(d => d.department === dept.id)
          const isExpanded = expanded === dept.id
          const isEmpty = dept.employee_count === 0
          const isActioning = actionId === dept.id

          return (
            <div key={dept.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center">
                {/* Main clickable area */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : dept.id)}
                  className="flex-1 flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{dept.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">
                        {dept.employee_count ?? 0} employee{(dept.employee_count ?? 0) !== 1 ? 's' : ''}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-500">
                        {deptDesignations.length} designation{deptDesignations.length !== 1 ? 's' : ''}
                      </span>
                      {isEmpty && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-amber-600 font-medium">Empty</span>
                        </>
                      )}
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />
                    : <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />
                  }
                </button>

                {/* Deactivate button — always visible, greyed if has employees */}
                <div className="pr-4 flex-shrink-0">
                  {isEmpty ? (
                    <button
                      onClick={() => handleDeactivate(dept)}
                      disabled={isActioning}
                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 border border-red-200 hover:border-red-300 rounded-lg hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-50"
                      title="Deactivate this department"
                    >
                      <PowerOff size={13} />
                      <span className="hidden md:inline">
                        {isActioning ? 'Working...' : 'Deactivate'}
                      </span>
                    </button>
                  ) : (
                    <div
                      className="flex items-center gap-1.5 text-xs text-slate-300 font-medium px-3 py-1.5 border border-slate-100 rounded-lg cursor-not-allowed"
                      title={`Move ${dept.employee_count} employee${dept.employee_count > 1 ? 's' : ''} out first`}
                    >
                      <PowerOff size={13} />
                      <span className="hidden md:inline">Deactivate</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded designations */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Designations</p>
                  {deptDesignations.length === 0 ? (
                    <p className="text-xs text-slate-400">No designations yet</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {deptDesignations.map(desig => (
                        <div key={desig.id} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                          <Users size={13} className="text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-700">{desig.name}</span>
                          {desig.grade && (
                            <span className="text-xs text-slate-400 ml-auto">Grade {desig.grade}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Department modal */}
      {showAdd && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-2xl shadow-2xl p-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center mb-4 md:hidden">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">New Department</h3>
            <p className="text-slate-500 text-sm mb-4">Add a new department to your organisation structure.</p>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Department Name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddDept()}
              placeholder="e.g. Operations, Marketing, Legal"
              autoFocus
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowAdd(false); setNewName('') }}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDept}
                disabled={saving || !newName.trim()}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {saving ? 'Creating...' : 'Create Department'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
