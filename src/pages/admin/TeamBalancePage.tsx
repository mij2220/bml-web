import { useEffect, useState } from "react"
import api from "../../api/client"
import { Download } from "lucide-react"
import { useSortableTable, downloadCSV, SortDir } from "../../utils/tableUtils"

interface LeaveTypeMeta { code: string; name: string }
interface BalanceEntry {
  code: string; name: string
  allocated: number; used: number; available: number
  splits_used: number; splits_allowed: number
}
interface EmployeeRow {
  id: string; employee_id: string; full_name: string
  department: string; designation: string
  experience_years: number; experience_tier: string
  balances: BalanceEntry[]
}
interface ApiData {
  year: number; is_hr_view: boolean
  leave_types: LeaveTypeMeta[]
  employees: EmployeeRow[]
}

type SortKey = 'full_name' | 'department' | 'experience_tier' | 'experience_years' | string

function SortTh({ label, col, sortKey, sortDir, onSort, className = '' }: {
  label: string; col: string; sortKey: string | null
  sortDir: SortDir; onSort: (k: string) => void; className?: string
}) {
  const icon = sortKey === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-3 py-3 font-semibold text-slate-600 whitespace-nowrap cursor-pointer select-none hover:bg-slate-100 transition-colors ${className}`}
    >
      {label}<span className="text-slate-300 text-xs ml-0.5">{icon}</span>
    </th>
  )
}

export default function TeamBalancePage() {
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => {
    document.getElementById("page-title")!.textContent = "Team Leave Balances"
    api.get("/team-balances/")
      .then(r => setData(r.data?.data ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!data) return <div className="text-slate-400 text-center py-16">Failed to load data.</div>

  const keyTypes = ['AL', 'CL', 'SL', 'ML', 'CD', 'BD']
  const shownTypes = data.leave_types.filter(lt => keyTypes.includes(lt.code))

  const filtered = data.employees.filter(e =>
    !search ||
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_id.toLowerCase().includes(search.toLowerCase())
  )

  const toggleSort = (col: string) => {
    if (sortKey === col) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortKey(null); setSortDir('asc') }
    } else {
      setSortKey(col); setSortDir('asc')
    }
  }

  const displayRows = [...filtered].sort((a, b) => {
    if (!sortKey || !sortDir) return 0
    let av: any, bv: any
    const balCode = sortKey.startsWith('bal_') ? sortKey.slice(4) : null
    if (balCode) {
      av = a.balances.find(x => x.code === balCode)?.available ?? -1
      bv = b.balances.find(x => x.code === balCode)?.available ?? -1
    } else {
      av = (a as any)[sortKey]; bv = (b as any)[sortKey]
    }
    if (av == null) return 1; if (bv == null) return -1
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true })
    return sortDir === 'asc' ? cmp : -cmp
  })

  const tierBadge = (tier: string) =>
    tier === 'senior'
      ? 'bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-0.5 rounded-full border border-emerald-200'
      : 'bg-blue-50 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-200'

  const cellColor = (avail: number, alloc: number) => {
    if (alloc === 0) return 'text-slate-300'
    const pct = avail / alloc
    if (pct <= 0.2) return 'text-red-600 font-semibold'
    if (pct <= 0.5) return 'text-amber-600 font-semibold'
    return 'text-emerald-700'
  }

  const handleDownload = () => {
    const headers = ['Employee', 'ID', 'Department', 'Tier', 'Experience (yrs)',
      ...shownTypes.map(lt => `${lt.code} Available`),
      ...shownTypes.map(lt => `${lt.code} Allocated`)]
    const rows = displayRows.map(e => [
      e.full_name, e.employee_id, e.department, e.experience_tier, e.experience_years,
      ...shownTypes.map(lt => e.balances.find(b => b.code === lt.code)?.available ?? ''),
      ...shownTypes.map(lt => e.balances.find(b => b.code === lt.code)?.allocated ?? ''),
    ])
    downloadCSV(`team-balances-${data.year}.csv`, headers, rows)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-500">
          {data.is_hr_view ? 'All employees' : 'Your direct reports'} · {data.year}
        </p>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, department, ID..."
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
          />
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium"
          >
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Employees',    value: data.employees.length,                                               color: 'text-slate-900' },
          { label: 'Senior tier',  value: data.employees.filter(e => e.experience_tier === 'senior').length,   color: 'text-emerald-700' },
          { label: 'Junior tier',  value: data.employees.filter(e => e.experience_tier === 'junior').length,   color: 'text-blue-700' },
          { label: 'Departments',  value: new Set(data.employees.map(e => e.department)).size,                 color: 'text-slate-900' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <SortTh label="Employee"   col="full_name"        sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-left" />
              <SortTh label="Dept"       col="department"       sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-left" />
              <SortTh label="Tier"       col="experience_tier"  sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-center" />
              <SortTh label="Exp"        col="experience_years" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-center" />
              {shownTypes.map(lt => (
                <SortTh key={lt.code} label={lt.code} col={`bal_${lt.code}`} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-center" />
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((emp, idx) => (
              <tr key={emp.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                      {emp.full_name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{emp.full_name}</p>
                      <p className="text-xs text-slate-400">{emp.employee_id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-slate-600 text-xs whitespace-nowrap">{emp.department || '—'}</td>
                <td className="px-3 py-3 text-center"><span className={tierBadge(emp.experience_tier)}>{emp.experience_tier}</span></td>
                <td className="px-3 py-3 text-center text-xs text-slate-500">{emp.experience_years}y</td>
                {shownTypes.map(lt => {
                  const b = emp.balances.find(x => x.code === lt.code)
                  if (!b) return <td key={lt.code} className="px-3 py-3 text-center text-slate-300">—</td>
                  return (
                    <td key={lt.code} className="px-3 py-3 text-center">
                      <span className={`text-sm ${cellColor(b.available, b.allocated)}`}>
                        {b.available}<span className="text-slate-300 text-xs">/{b.allocated}</span>
                      </span>
                      {b.splits_allowed > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5">{b.splits_used}/{b.splits_allowed} sp</p>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {displayRows.length === 0 && (
          <div className="text-center py-10 text-slate-400">No employees match your search.</div>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-400 px-1">
        <span>Numbers = available/allocated days · click column headers to sort</span>
        <span className="text-emerald-600">■ &gt;50%</span>
        <span className="text-amber-500">■ 20–50%</span>
        <span className="text-red-500">■ &lt;20%</span>
        <span>sp = splits</span>
      </div>
    </div>
  )
}
