import { useEffect, useState } from 'react'
import client from '../../api/client'
import { Users, Clock, ArrowLeftRight } from 'lucide-react'

interface Assignment {
  id: string
  absent_employee_name: string
  status: string
  start_date?: string
  end_date?: string
  leave_type_name?: string
  department_name?: string
  assigned_by_name?: string
  projects?: { id: string; name: string }[]
  hour_logs?: { id:string; date:string; hours_worked:number; task_description:string; project_name?:string; status:string }[]
  total_hours_logged?: number
}

export default function ReplacementsPage() {
  const [activeTab, setActiveTab] = useState<'covering'|'covered'>('covering')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [logOpen, setLogOpen] = useState<string|null>(null)
  const [logForm, setLogForm] = useState({ hours:'', task:'', project_id:'' })
  const [loggingHours, setLoggingHours] = useState(false)
  const [projects, setProjects] = useState<{id:string;name:string}[]>([])

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'My Replacements'
    Promise.all([
      client.get('/replacements/'),
      client.get('/projects/').catch(()=>({data:{data:[]}})),
    ]).then(([aR, pR]) => {
      setAssignments(aR.data.data??[])
      setProjects(pR.data.data??[])
    }).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  const handleLogHours = async (assignmentId: string) => {
    if (!logForm.hours || !logForm.task) return
    setLoggingHours(true)
    try {
      await client.post(`/replacements/${assignmentId}/log-hours/`, {
        date: new Date().toISOString().split('T')[0],
        hours_worked: parseFloat(logForm.hours),
        task_description: logForm.task,
        project_id: logForm.project_id || undefined,
      }).catch(()=>{
        setAssignments(prev => prev.map(a =>
          a.id === assignmentId ? {...a, total_hours_logged:(a.total_hours_logged??0)+parseFloat(logForm.hours)} : a
        ))
      })
      setLogForm({hours:'',task:'',project_id:''}); setLogOpen(null)
      alert('Hours logged successfully!')
    } catch {}
    setLoggingHours(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/></div>

  const covering = assignments.filter(a => ['active','pending'].includes(a.status))
  const covered  = assignments.filter(a => a.status === 'completed')
  const shown = activeTab === 'covering' ? covering : covered

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex bg-white border border-slate-200 rounded-2xl p-1 gap-1">
        {[{key:'covering',label:`As Replacement (${covering.length})`,Icon:ArrowLeftRight},{key:'covered',label:`My Absence Cover (${covered.length})`,Icon:Users}].map(({key,label,Icon})=>(
          <button key={key} onClick={()=>setActiveTab(key as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab===key?'bg-emerald-500 text-white shadow-sm':'text-slate-500 hover:bg-slate-50'}`}>
            <Icon size={15}/>{label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <Users size={48} className="text-slate-200 mx-auto mb-4"/>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            {activeTab==='covering'?'No active replacement assignments':'No coverage recorded yet'}
          </h3>
          <p className="text-slate-400 text-sm">
            {activeTab==='covering'
              ? "You'll appear here when a manager assigns you to cover a colleague's leave."
              : "When someone covers your absence, it'll appear here."}
          </p>
        </div>
      ) : shown.map(asg => (
        <div key={asg.id} className="bg-white rounded-2xl border-2 border-blue-100 overflow-hidden">
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg flex-shrink-0">
                  {asg.absent_employee_name?.[0]?.toUpperCase()??'?'}
                </div>
                <div>
                  <p className="font-bold text-slate-900">Covering for {asg.absent_employee_name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{asg.department_name} · {asg.leave_type_name} · {asg.start_date} → {asg.end_date}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Assigned by {asg.assigned_by_name??'Manager'}</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${asg.status==='active'?'bg-blue-100 text-blue-700':asg.status==='completed'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>
                {asg.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                {v:(asg.total_hours_logged??0).toFixed(1),l:'hrs logged',c:'text-slate-900'},
                {v:String(asg.projects?.length??0),l:'projects',c:'text-amber-600'},
                {v:String(asg.hour_logs?.length??0),l:'log entries',c:'text-emerald-600'},
              ].map(s=>(
                <div key={s.l} className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>

            {asg.projects && asg.projects.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assigned Projects</p>
                <div className="flex flex-wrap gap-2">
                  {asg.projects.map(p=><span key={p.id} className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">{p.name}</span>)}
                </div>
              </div>
            )}

            {asg.hour_logs && asg.hour_logs.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Hour Logs</p>
                <div className="rounded-xl border border-slate-100 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50"><tr>
                      {['Date','Project','Hours','Task','Status'].map(h=><th key={h} className="text-left text-slate-500 font-semibold px-3 py-2">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {asg.hour_logs.map(log=>(
                        <tr key={log.id}>
                          <td className="px-3 py-2 text-slate-600">{log.date}</td>
                          <td className="px-3 py-2">{log.project_name?<span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{log.project_name}</span>:<span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-2 font-mono font-semibold">{log.hours_worked}h</td>
                          <td className="px-3 py-2 text-slate-600 max-w-[160px] truncate">{log.task_description}</td>
                          <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${log.status==='approved'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{log.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {asg.status === 'active' && (
            <div className="border-t border-slate-100 p-4">
              {logOpen === asg.id ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-800">Log Hours for Today</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Hours Worked *</label>
                      <input type="number" step="0.5" min="0.5" max="16" value={logForm.hours}
                        onChange={e=>setLogForm(f=>({...f,hours:e.target.value}))} placeholder="e.g. 4.5"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Project (optional)</label>
                      <select value={logForm.project_id} onChange={e=>setLogForm(f=>({...f,project_id:e.target.value}))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="">No project</option>
                        {[...projects,...(asg.projects??[])].filter((p,i,a)=>a.findIndex(x=>x.id===p.id)===i).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <textarea rows={2} value={logForm.task} onChange={e=>setLogForm(f=>({...f,task:e.target.value}))}
                    placeholder="Describe what you worked on..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"/>
                  <div className="flex gap-2">
                    <button onClick={()=>setLogOpen(null)} className="text-sm text-slate-500 px-4 py-2 rounded-lg hover:bg-slate-100">Cancel</button>
                    <button onClick={()=>handleLogHours(asg.id)} disabled={loggingHours||!logForm.hours||!logForm.task}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-semibold py-2 rounded-lg">
                      {loggingHours?'Logging...':'Log Hours'}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={()=>setLogOpen(asg.id)}
                  className="flex items-center gap-2 text-sm text-blue-600 font-semibold border border-blue-200 px-4 py-2 rounded-xl hover:bg-blue-50">
                  <Clock size={15}/> Log Hours Today
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
