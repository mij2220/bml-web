import { useEffect, useState } from 'react'
import { getEmployees } from '../../api/employees'
import { getMyLeaves } from '../../api/leaves'
import { useAuth } from '../../hooks/useAuth'
import { getMyProfile } from '../../api/employees'
import { Users, Clock, CalendarDays, CheckCircle } from 'lucide-react'
import type { Employee } from '../../types'

const statusColor: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  on_leave: 'bg-amber-100 text-amber-700',
  resigned: 'bg-slate-100 text-slate-500',
  terminated: 'bg-red-100 text-red-700',
}

export default function TeamPage() {
  const { user } = useAuth()
  const [team, setTeam] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'My Team'
    const load = async () => {
      try {
        const { data } = await getEmployees()
        // Show all employees visible to manager (API already scopes to team)
        setTeam(data.data ?? [])
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const active = team.filter(e => e.status === 'active').length
  const onLeave = team.filter(e => e.status === 'on_leave').length

  return (
    <div className="max-w-4xl mx-auto space-y-4">
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

      {/* Team cards */}
      {team.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No team members yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {team.map(emp => (
            <div key={emp.id} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg flex-shrink-0">
                  {emp.full_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{emp.full_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{emp.designation_name}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${statusColor[emp.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {emp.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-slate-400 font-mono">{emp.employee_id}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-400">{emp.department_name}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">{emp.email}</p>
                </div>
              </div>

              {/* Status indicator */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                {emp.status === 'on_leave' ? (
                  <>
                    <CalendarDays size={13} className="text-amber-500" />
                    <span className="text-xs text-amber-600 font-medium">Currently on leave</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={13} className="text-emerald-500" />
                    <span className="text-xs text-emerald-600 font-medium">Available</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
