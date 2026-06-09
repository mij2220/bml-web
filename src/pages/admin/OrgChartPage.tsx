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
    const mgrId = (e as any).reporting_manager_id
    const mgrName = (e as any).manager_name
    const resolvedId = mgrId || (mgrName ? employees.find(x => x.full_name === mgrName)?.id : null)
    const sicId = (e as any).shift_incharge_id || (e as any).shift_incharge?.id

    let placed = false
    if (resolvedId && map[resolvedId] && resolvedId !== e.id) {
      map[resolvedId].children.push(map[e.id])
      placed = true
    }
    if (sicId && map[sicId] && sicId !== e.id && sicId !== resolvedId) {
      map[sicId].children.push({ emp: e, children: [] })
      placed = true
    }
    if (!placed) roots.push(map[e.id])
  })
  return roots
}

const ROLE_CFG: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  hr_admin: { bg: 'bg-emerald-50', border: 'border-emerald-300', badge: 'bg-emerald-500', text: 'text-emerald-700' },
  manager:  { bg: 'bg-purple-50',  border: 'border-purple-300',  badge: 'bg-purple-500',  text: 'text-purple-700' },
  employee: { bg: 'bg-white',      border: 'border-slate-200',   badge: 'bg-blue-400',    text: 'text-blue-700' },
}

function OrgCard({ node, depth = 0, defaultExpanded = false }: { node: OrgNode; depth?: number; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const e = node.emp
  const cfg = ROLE_CFG[e.role] ?? ROLE_CFG.employee
  const hasChildren = node.children.length > 0
  const isManager = e.role === 'manager' || e.role === 'hr_admin'

  return (
    <div className="flex flex-col items-center select-none">
      {/* Card */}
      <div
        onClick={() => hasChildren && setExpanded(v => !v)}
        className={`relative border-2 rounded-2xl p-4 text-center transition-all shadow-sm
          ${cfg.bg} ${cfg.border}
          ${hasChildren ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5' : ''}
          ${isManager ? 'w-44' : 'w-36'}`}
      >
        <div className={`w-11 h-11 rounded-full ${cfg.badge} flex items-center justify-center text-white font-bold text-lg mx-auto mb-2 shadow-sm`}>
          {e.full_name?.[0]?.toUpperCase()}
        </div>
        <p className="text-xs font-bold text-slate-900 leading-tight truncate px-1">{e.full_name}</p>
        <p className={`text-xs truncate mt-0.5 font-medium ${cfg.text}`} title={e.designation_name || ''}>
          {(e.designation_name || e.role?.replace('_', ' ') || '').replace(' (Manager)', '')}
        </p>
        <p className="text-xs text-slate-400 font-mono mt-0.5">{e.employee_id}</p>

        {/* Child count badge */}
        {hasChildren && (
          <div className={`absolute -bottom-3.5 left-1/2 -translate-x-1/2 min-w-[26px] h-6 px-1.5 rounded-full border-2 bg-white flex items-center justify-center text-xs font-bold ${cfg.border} ${cfg.text} shadow-sm`}>
            {expanded ? '−' : node.children.length}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="mt-6 relative">
          {/* Vertical stem */}
          <div className="absolute top-0 left-1/2 -translate-x-px w-px h-4 bg-slate-300 -mt-2" />

          <div className="flex gap-3 relative pt-4">
            {/* Horizontal bar spanning children */}
            {node.children.length > 1 && (
              <div className="absolute top-0 left-[18px] right-[18px] h-px bg-slate-300" />
            )}
            {node.children.map(child => (
              <div key={child.emp.id} className="flex flex-col items-center relative">
                {/* Drop line */}
                <div className="w-px h-4 bg-slate-300 -mt-0" />
                <OrgCard node={child} depth={depth + 1} defaultExpanded={false} />
              </div>
            ))}
          </div>
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
    getEmployees({ page_size: '200' }).then(r => {
      const employees: Employee[] = r.data.data ?? []
      setEmpCount(employees.length)
      setTree(buildTree(employees))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-3 flex items-center gap-6 flex-wrap">
        <span className="text-sm font-semibold text-slate-700">{empCount} Employees</span>
        {[
          { label: 'HR Admin',          color: 'bg-emerald-500' },
          { label: 'Manager',           color: 'bg-purple-500'  },
          { label: 'Operator',          color: 'bg-blue-400'    },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${color}`} />
            <span className="text-xs text-slate-600">{label}</span>
          </div>
        ))}
        <span className="text-xs text-slate-400 ml-auto">Click a card to expand / collapse</span>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 overflow-auto min-h-[400px]">
        <div className="flex gap-12 justify-center min-w-max">
          {tree.map(root => (
            <OrgCard key={root.emp.id} node={root} depth={0} defaultExpanded={true} />
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
