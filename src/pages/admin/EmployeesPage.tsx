import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getEmployees } from '../../api/employees'
import AddEmployeeModal from './AddEmployeeModal'
import { Search, Users, UserCheck, UserX, Plus, Download } from 'lucide-react'
import { downloadCSV } from '../../utils/tableUtils'
import type { Employee } from '../../types'

const roleColor: Record<string, string> = {
  employee: 'bg-blue-50 text-blue-700',
  manager: 'bg-purple-50 text-purple-700',
  hr_admin: 'bg-emerald-50 text-emerald-700',
  super_admin: 'bg-red-50 text-red-700',
}

const statusColor: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  on_leave: 'bg-amber-100 text-amber-700',
  resigned: 'bg-slate-100 text-slate-500',
  terminated: 'bg-red-100 text-red-700',
}

export default function EmployeesPage() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>('asc')

  const toggleSort = (col: string) => {
    if (sortKey === col) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortKey(null); setSortDir('asc') }
    } else { setSortKey(col); setSortDir('asc') }
  }

  const sortedEmployees = [...employees].sort((a: any, b: any) => {
    if (!sortKey || !sortDir) return 0
    const av = a[sortKey], bv = b[sortKey]
    if (av == null) return 1; if (bv == null) return -1
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
    return sortDir === 'asc' ? cmp : -cmp
  })

  const handleDownload = () => {
    downloadCSV('employees.csv',
      ['Name', 'Email', 'Employee ID', 'Department', 'Designation', 'Role', 'Status'],
      sortedEmployees.map((e: any) => [e.full_name, e.email, e.employee_id, e.department_name, e.designation_name, e.role, e.status])
    )
  }

  const load = async (q?: string) => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (q) params.search = q
      const { data } = await getEmployees(params)
      setEmployees(data.data ?? [])
      setTotal(data.pagination?.count ?? (data.data ?? []).length)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Employees'
    load()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => load(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const active = employees.filter(e => e.status === 'active').length
  const onLeave = employees.filter(e => e.status === 'on_leave').length

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 md:p-4 flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Users size={16} className="text-blue-500" />
          </div>
          <div>
            <p className="text-xl md:text-2xl font-bold text-slate-900">{total}</p>
            <p className="text-xs text-slate-500">Total</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 md:p-4 flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <UserCheck size={16} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-xl md:text-2xl font-bold text-slate-900">{active}</p>
            <p className="text-xs text-slate-500">Active</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 md:p-4 flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <UserX size={16} className="text-amber-500" />
          </div>
          <div>
            <p className="text-xl md:text-2xl font-bold text-slate-900">{onLeave}</p>
            <p className="text-xs text-slate-500">On Leave</p>
          </div>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 font-medium flex-shrink-0"
        >
          <Download size={14} /> <span className="hidden md:inline">CSV</span>
        </button>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-3 md:px-4 py-2 rounded-lg transition-colors flex-shrink-0"
        >
          <Plus size={15} /> <span className="hidden md:inline">Add Employee</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No employees found</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {employees.map(emp => (
              <div
                key={emp.id}
                onClick={() => navigate(`/employees/${emp.id}`)}
                className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 p-3 cursor-pointer active:bg-slate-50"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold flex-shrink-0">
                  {emp.full_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{emp.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{emp.department_name} · {emp.employee_id}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${roleColor[emp.role] ?? 'bg-slate-100 text-slate-600'}`}>
                    {emp.role?.replace('_', ' ')}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor[emp.status] ?? 'bg-slate-100'}`}>
                    {emp.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {([['Employee','full_name'],['ID','employee_id'],['Department','department_name'],['Designation','designation_name'],['Role','role'],['Status','status']] as [string,string][]).map(([h,col]) => (
                    <th key={h} onClick={() => toggleSort(col)}
                      className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap">
                      {h}
                      <span className="text-slate-300 ml-1 text-xs">
                        {sortKey===col ? (sortDir==='asc'?'↑':'↓') : '↕'}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedEmployees.map((emp: any) => (
                  <tr
                    key={emp.id}
                    onClick={() => navigate(`/employees/${emp.id}`)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
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
          </div>
        </>
      )}

      {showAdd && (
        <AddEmployeeModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); load() }}
        />
      )}
    </div>
  )
}
