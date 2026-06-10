import { useEffect, useState } from 'react'
import { getEmployees } from '../../api/employees'
import { Users, ChevronUp, ChevronDown, Search } from 'lucide-react'
import type { Employee } from '../../types'

const statusColor: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  on_leave: 'bg-amber-100 text-amber-700',
  resigned: 'bg-slate-100 text-slate-500',
  terminated: 'bg-red-100 text-red-700',
}

type SortKey = 'full_name' | 'employee_id' | 'designation_name' | 'department_name' | 'status'

export default function TeamPage() {
  const [team, setTeam] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('full_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'My Team'
    getEmployees().then(({ data }) => setTeam(data.data ?? [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = team
    .filter(e => {
      const q = search.toLowerCase()
      return !q || e.full_name?.toLowerCase().includes(q) || e.employee_id?.toLowerCase().includes(q) || e.designation_name?.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const av = (a[sortKey] ?? '') as string
      const bv = (b[sortKey] ?? '') as string
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  const active = team.filter(e => e.status === 'active').length
  const onLeave = team.filter(e => e.status === 'on_leave').length

  const SortIcon = ({ k }: { k: SortKey }) => sortKey === k
    ? (sortDir === 'asc' ? <ChevronUp size={13} className="inline ml-0.5" /> : <ChevronDown size={13} className="inline ml-0.5" />)
    : <ChevronUp size={13} className="inline ml-0.5 opacity-20" />

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{team.length}</p>
          <p className="text-xs text-slate-500 mt-1">Team Members</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{active}</p>
          <p className="text-xs text-slate-500 mt-1">Active Today</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{onLeave}</p>
          <p className="text-xs text-slate-500 mt-1">On Leave</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID, designation..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <span className="text-xs text-slate-400">{filtered.length} of {team.length}</span>
        </div>

        {team.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No team members yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                  {([['full_name','Name'],['employee_id','EMP ID'],['designation_name','Designation'],['department_name','Unit'],['status','Status']] as [SortKey,string][]).map(([k,label]) => (
                    <th key={k} className="px-4 py-3 text-left font-medium cursor-pointer select-none hover:text-slate-700" onClick={() => toggleSort(k)}>
                      {label}<SortIcon k={k} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs flex-shrink-0">
                          {emp.full_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{emp.full_name}</p>
                          <p className="text-xs text-slate-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{emp.employee_id}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.designation_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.department_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor[emp.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {emp.status?.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
