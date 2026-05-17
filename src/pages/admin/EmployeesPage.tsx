import { useEffect, useState } from 'react'
import { getEmployees } from '../../api/employees'
import { Search, Users, UserCheck, UserX, Plus } from 'lucide-react'
import type { Employee } from '../../types'

const statusColor: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  on_leave: 'bg-amber-100 text-amber-700',
  resigned: 'bg-slate-100 text-slate-500',
  terminated: 'bg-red-100 text-red-700',
}

const roleColor: Record<string, string> = {
  employee: 'bg-blue-50 text-blue-700',
  manager: 'bg-purple-50 text-purple-700',
  hr_admin: 'bg-emerald-50 text-emerald-700',
  super_admin: 'bg-red-50 text-red-700',
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [total, setTotal] = useState(0)

  const load = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (deptFilter) params.department = deptFilter
      const { data } = await getEmployees(params)
      setEmployees(data.data ?? [])
      setTotal(data.pagination?.count ?? (data.data ?? []).length)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Employees'
    load()
  }, [deptFilter])

  useEffect(() => {
    const t = setTimeout(() => load(), 400)
    return () => clearTimeout(t)
  }, [search])

  const active = employees.filter(e => e.status === 'active').length

  return (
    <div className="max-w-6xl space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><Users size={20} className="text-blue-500" /></div>
          <div><p className="text-2xl font-bold text-slate-900">{total}</p><p className="text-xs text-slate-500">Total Employees</p></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center"><UserCheck size={20} className="text-emerald-500" /></div>
          <div><p className="text-2xl font-bold text-slate-900">{active}</p><p className="text-xs text-slate-500">Active</p></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center"><UserX size={20} className="text-amber-500" /></div>
          <div><p className="text-2xl font-bold text-slate-900">{employees.filter(e => e.status === 'on_leave').length}</p><p className="text-xs text-slate-500">On Leave</p></div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex-1" />
        <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Add Employee
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <Users size={40} className="mb-3 text-slate-200" />
            <p className="font-medium">No employees found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Employee', 'ID', 'Department', 'Designation', 'Role', 'Status'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                        {emp.full_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{emp.full_name}</p>
                        <p className="text-xs text-slate-500">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-600">{emp.employee_id}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{emp.department_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{emp.designation_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${roleColor[emp.role] ?? 'bg-slate-100 text-slate-600'}`}>
                      {emp.role?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${statusColor[emp.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {emp.status?.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
