import { useEffect, useState } from 'react'
import { getEmployees } from '../../api/employees'

interface Employee {
  id: string
  full_name: string
  employee_id: string
  p_number?: string
  role: string
  department_name?: string
  designation_name?: string
  reporting_manager_id?: string
  shift_incharge_id?: string
  status: string
}

const ROLE_STYLE: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  hr_admin:  { bg: 'bg-emerald-50', border: 'border-emerald-300', badge: 'bg-emerald-500', text: 'text-emerald-700' },
  manager:   { bg: 'bg-purple-50',  border: 'border-purple-300',  badge: 'bg-purple-500',  text: 'text-purple-700' },
  employee:  { bg: 'bg-blue-50',    border: 'border-blue-300',    badge: 'bg-blue-400',    text: 'text-blue-700' },
}

interface DeptGroup {
  name: string
  incharge?: Employee   // L2
  supervisor?: Employee // L1
  operators: Employee[]
}

function EmpCard({ emp, collapsed, onToggle, childCount }: {
  emp: Employee
  collapsed?: boolean
  onToggle?: () => void
  childCount?: number
}) {
  const style = ROLE_STYLE[emp.role] || ROLE_STYLE.employee
  const initials = emp.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const isManager = emp.role === 'manager' || emp.role === 'hr_admin'

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative rounded-2xl border-2 ${style.border} ${style.bg} p-3 w-36 text-center shadow-sm
          ${onToggle ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
        onClick={onToggle}
      >
        <div className={`w-10 h-10 ${style.badge} rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto mb-1`}>
          {initials}
        </div>
        <p className="font-semibold text-slate-800 text-xs leading-tight truncate">{emp.full_name}</p>
        <p className={`text-xs mt-0.5 ${style.text} leading-tight`} style={{fontSize:'10px'}}>
          {emp.designation_name || emp.role}
        </p>
        <p className="text-slate-400 mt-0.5" style={{fontSize:'10px'}}>{emp.p_number || emp.employee_id}</p>
        {onToggle && childCount !== undefined && childCount > 0 && (
          <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2
            ${style.border} ${style.bg} flex items-center justify-center text-xs font-bold ${style.text}`}>
            {collapsed ? childCount : '−'}
          </div>
        )}
      </div>
    </div>
  )
}

function ConnectorLine() {
  return <div className="w-px h-6 bg-slate-300 mx-auto mt-3" />
}

function HorizontalGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-4 items-start justify-center flex-wrap">
      {children}
    </div>
  )
}

export default function OrgChartPage() {
  const [deptGroups, setDeptGroups] = useState<DeptGroup[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Org Chart'
    getEmployees({ page_size: '200' }).then(r => {
      const emps: Employee[] = (r.data as any)?.data ?? []
      setTotal(emps.length)

      // Skip admin (hr_admin role) — they don't belong to a department
      const nonAdmin = emps.filter(e => e.role !== 'hr_admin')

      // Group by department
      const deptMap: Record<string, DeptGroup> = {}
      nonAdmin.forEach(e => {
        const dept = e.department_name || 'Unknown'
        if (!deptMap[dept]) deptMap[dept] = { name: dept, operators: [] }

        const desig = e.designation_name || ''
        if (desig.toLowerCase().includes('incharge')) {
          deptMap[dept].incharge = e
        } else if (desig.toLowerCase().includes('supervisor') || desig.toLowerCase().includes('engineer')) {
          deptMap[dept].supervisor = e
        } else {
          deptMap[dept].operators.push(e)
        }
      })

      // Only show depts with at least one employee
      const groups = Object.values(deptMap)
        .filter(g => g.incharge || g.supervisor || g.operators.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name))

      setDeptGroups(groups)

      // Default: collapse operators
      const initCollapsed: Record<string, boolean> = {}
      groups.forEach(g => {
        if (g.incharge)   initCollapsed[`${g.name}-incharge`]   = true
        if (g.supervisor) initCollapsed[`${g.name}-supervisor`]  = true
      })
      setCollapsed(initCollapsed)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const toggle = (key: string) =>
    setCollapsed(c => ({ ...c, [key]: !c[key] }))

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">Loading org chart…</div>
  )

  return (
    <div className="max-w-full mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-6">
        <span className="text-sm font-medium text-slate-700">{total} Employees</span>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"/>Manager</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"/>Operator</span>
        </div>
        <span className="text-xs text-slate-400 ml-auto">Click a manager card to expand / collapse operators</span>
      </div>

      {/* Department columns */}
      <div className="flex gap-8 items-start justify-center flex-wrap">
        {deptGroups.map(group => (
          <div key={group.name} className="flex flex-col items-center min-w-[160px]">
            {/* Department label */}
            <div className="bg-slate-800 text-white text-xs font-bold px-4 py-1.5 rounded-full mb-4 tracking-wide">
              {group.name}
            </div>

            {/* L2 Incharge */}
            {group.incharge && (
              <>
                <EmpCard
                  emp={group.incharge}
                  collapsed={collapsed[`${group.name}-incharge`]}
                  onToggle={() => toggle(`${group.name}-incharge`)}
                  childCount={group.operators.length}
                />
                {!collapsed[`${group.name}-incharge`] && group.operators.length > 0 && (
                  <>
                    <ConnectorLine />
                    <HorizontalGroup>
                      {group.operators.map(op => (
                        <EmpCard key={op.id + '-ic'} emp={op} />
                      ))}
                    </HorizontalGroup>
                  </>
                )}
              </>
            )}

            {/* Spacer between L2 and L1 if both exist */}
            {group.incharge && group.supervisor && <div className="h-4" />}

            {/* L1 Supervisor */}
            {group.supervisor && (
              <>
                <EmpCard
                  emp={group.supervisor}
                  collapsed={collapsed[`${group.name}-supervisor`]}
                  onToggle={() => toggle(`${group.name}-supervisor`)}
                  childCount={group.operators.length}
                />
                {!collapsed[`${group.name}-supervisor`] && group.operators.length > 0 && (
                  <>
                    <ConnectorLine />
                    <HorizontalGroup>
                      {group.operators.map(op => (
                        <EmpCard key={op.id + '-sv'} emp={op} />
                      ))}
                    </HorizontalGroup>
                  </>
                )}
              </>
            )}

            {/* Operators only (no manager in dept) */}
            {!group.incharge && !group.supervisor && group.operators.length > 0 && (
              <HorizontalGroup>
                {group.operators.map(op => <EmpCard key={op.id} emp={op} />)}
              </HorizontalGroup>
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-slate-400 pt-2">
        Organisation hierarchy based on designation assignments. Edit in Employees → Employee Profile.
      </p>
    </div>
  )
}
