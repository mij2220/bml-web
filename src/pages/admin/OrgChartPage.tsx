import { useEffect, useState } from 'react'
import { getEmployees } from '../../api/employees'
import type { Employee } from '../../types'

interface OrgNode {
  emp: Employee
  children: OrgNode[]
}

function buildTree(employees: Employee[]): OrgNode[] {
  const map: Record<string, OrgNode> = {}
  employees.forEach(e => { map[e.id] = { emp: e, children: [] } })

  const roots: OrgNode[] = []
  employees.forEach(e => {
    const mgr = (e as any).reporting_manager_id || (e as any).reporting_manager?.id
    if (mgr && map[mgr]) {
      map[mgr].children.push(map[e.id])
    } else {
      roots.push(map[e.id])
    }
  })
  return roots
}

const ROLE_COLORS: Record<string, { bg: string; border: string; badge: string }> = {
  hr_admin:    { bg: 'bg-emerald-50', border: 'border-emerald-300', badge: 'bg-emerald-500' },
  manager:     { bg: 'bg-purple-50',  border: 'border-purple-300',  badge: 'bg-purple-500' },
  employee:    { bg: 'bg-white',      border: 'border-slate-200',   badge: 'bg-blue-400' },
  super_admin: { bg: 'bg-red-50',     border: 'border-red-300',     badge: 'bg-red-500' },
}

function OrgCard({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const e = node.emp
  const cfg = ROLE_COLORS[e.role] ?? ROLE_COLORS.employee
  const hasChildren = node.children.length > 0

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div
        onClick={() => hasChildren && setExpanded(!expanded)}
        className={`relative border-2 rounded-2xl p-3 text-center w-36 transition-all ${cfg.bg} ${cfg.border} ${hasChildren ? 'cursor-pointer hover:shadow-md' : ''} shadow-sm`}
      >
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full ${cfg.badge} flex items-center justify-center text-white font-bold text-base mx-auto mb-2`}>
          {e.full_name?.[0]?.toUpperCase()}
        </div>
        <p className="text-xs font-bold text-slate-900 leading-tight truncate">{e.full_name}</p>
        <p className="text-xs text-slate-500 truncate mt-0.5">{e.designation_name || e.role?.replace('_',' ')}</p>
        <p className="text-xs text-slate-400 font-mono mt-0.5">{e.employee_id}</p>

        {/* Expand indicator */}
        {hasChildren && (
          <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center text-xs font-bold transition-transform ${cfg.border} ${expanded ? 'rotate-180' : ''}`}
            style={{ color: 'inherit' }}>
            {expanded ? '−' : node.children.length}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="mt-5 flex gap-4 relative">
          {/* Horizontal line */}
          {node.children.length > 1 && (
            <div className="absolute top-0 left-8 right-8 h-px bg-slate-300"/>
          )}
          {node.children.map(child => (
            <div key={child.emp.id} className="flex flex-col items-center relative">
              {/* Vertical connector */}
              <div className="w-px h-5 bg-slate-300 mb-0 -mt-5"/>
              <OrgCard node={child} depth={depth + 1}/>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function OrgChartPage() {
  const [tree, setTree] = useState<OrgNode[]>([])
  const [loading, setLoading] = useState(true)
  const [empCount, setEmpCount] = useState(0)

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Org Chart'
    getEmployees().then(r => {
      const employees: Employee[] = r.data.data ?? []
      setEmpCount(employees.length)
      setTree(buildTree(employees))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/></div>

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-3 flex items-center gap-6 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{empCount} employees</span>
        {[
          { role: 'HR Admin',    color: 'bg-emerald-500' },
          { role: 'Manager',     color: 'bg-purple-500' },
          { role: 'Employee',    color: 'bg-blue-400' },
        ].map(({ role, color }) => (
          <div key={role} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${color}`}/>
            <span className="text-xs text-slate-600">{role}</span>
          </div>
        ))}
        <span className="text-xs text-slate-400 ml-auto">Click a node to expand/collapse</span>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 overflow-auto">
        <div className="flex gap-8 justify-center min-w-max">
          {tree.map(root => (
            <OrgCard key={root.emp.id} node={root} depth={0}/>
          ))}
        </div>
        {tree.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">🌳</p>
            <p className="font-medium">No employees found</p>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 text-center">
        Organisation hierarchy based on reporting manager assignments. Edit in Employees → Employee Profile.
      </p>
    </div>
  )
}
