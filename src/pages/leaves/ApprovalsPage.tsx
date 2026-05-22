import { useEffect, useState } from 'react'
import { downloadCSV } from '../../utils/tableUtils'
import { getPendingApprovals, approveLeave, rejectLeave, getMyLeaves } from '../../api/leaves'
import { getEmployees } from '../../api/employees'
import client from '../../api/client'
import { CheckCircle, XCircle, Users, ChevronDown, ChevronUp, History, Clock , Download } from 'lucide-react'
import type { LeaveApplication, Employee } from '../../types'

function AssignReplacementModal({
  leave, onClose, onDone,
}: {
  leave: LeaveApplication
  onClose: () => void
  onDone: (updatedLeave: LeaveApplication) => void
}) {
  const existing = (leave as any).replacement_employee as { id: string; full_name: string; employee_id: string } | null | undefined
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selected, setSelected] = useState(existing?.id ?? '')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingEmps, setLoadingEmps] = useState(true)

  useEffect(() => {
    getEmployees()
      .then(r => {
        const all: Employee[] = r.data.data ?? []
        setEmployees(all.filter(e => e.full_name !== leave.employee_name))
      })
      .catch(() => {})
      .finally(() => setLoadingEmps(false))
  }, [leave.employee_name])

  const sel = employees.find(e => e.id === selected)

  const handleAssign = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await client.post('/replacements/', {
        leave_application_id: leave.id,
        replacement_employee_id: selected,
        notes: note,
      })
      const assignment = res.data?.data ?? res.data
      onDone({ ...(leave as any), replacement_employee: assignment.replacement_employee })
      onClose()
    } catch (e: any) {
      alert(e.response?.data?.message ?? e.response?.data?.error ?? 'Failed to assign replacement.')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 md:hidden"><div className="w-10 h-1 bg-slate-200 rounded-full" /></div>
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">{existing ? 'Change Replacement' : 'Assign Replacement'}</h3>
          <p className="text-sm text-slate-500 mt-1">
            Cover for <span className="font-semibold text-slate-700">{leave.employee_name}</span> · {leave.leave_type_name} · {leave.start_date} → {leave.end_date}
          </p>
          {existing && (
            <p className="text-xs text-emerald-600 mt-1.5 bg-emerald-50 px-2 py-1 rounded-lg inline-block">
              Currently assigned: <span className="font-semibold">{existing.full_name}</span>
            </p>
          )}
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Replacement Employee</label>
            {loadingEmps ? (
              <div className="h-10 flex items-center text-sm text-slate-400">Loading employees...</div>
            ) : (
              <select value={selected} onChange={e => setSelected(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Choose employee...</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.full_name} — {(e as any).designation_name || (e as any).role || ''}</option>
                ))}
              </select>
            )}
          </div>
          {sel && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {sel.full_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{sel.full_name}</p>
                <p className="text-xs text-slate-500">{(sel as any).department_name} · {(sel as any).designation_name}</p>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder="Responsibilities, tasks, handover notes..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
        </div>
        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50">Cancel</button>
          <button onClick={handleAssign} disabled={saving || !selected}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving ? 'Saving...' : existing ? 'Update Replacement' : 'Assign Replacement'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ApprovalsPage() {
  const [apps, setApps] = useState<LeaveApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [comment, setComment] = useState('')
  const [processing, setProcessing] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replacementFor, setReplacementFor] = useState<LeaveApplication | null>(null)
  const [deptFilter, setDeptFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const [history, setHistory] = useState<LeaveApplication[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [histSortKey, setHistSortKey] = useState<string | null>(null)
  const [histSortDir, setHistSortDir] = useState<'asc'|'desc'|null>('asc')

  const toggleHistSort = (col: string) => {
    if (histSortKey === col) {
      if (histSortDir === 'asc') setHistSortDir('desc')
      else { setHistSortKey(null); setHistSortDir('asc') }
    } else { setHistSortKey(col); setHistSortDir('asc') }
  }

  const handleHistDownload = () => {
    downloadCSV('team-leave-history.csv',
      ['Employee', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Applied'],
      history.map((l: any) => [l.employee_name, l.leave_type_name, l.start_date, l.end_date, l.total_days, l.status, l.applied_at?.slice(0,10)])
    )
  }
  const [historyStatus, setHistoryStatus] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [selectedHistory, setSelectedHistory] = useState<LeaveApplication | null>(null)
  const [recalling, setRecalling] = useState(false)
  const [recallReason, setRecallReason] = useState('')
  const [showRecallConfirm, setShowRecallConfirm] = useState(false)
  const [showInlineAssign, setShowInlineAssign] = useState(false)
  const [assignEmployees, setAssignEmployees] = useState<Employee[]>([])
  const [assignSelected, setAssignSelected] = useState('')
  const [assignNote, setAssignNote] = useState('')
  const [assignSaving, setAssignSaving] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try { const { data } = await getPendingApprovals(); setApps(data.data ?? []) } catch {}
    setLoading(false)
  }

  const loadHistory = async (status = '') => {
    setHistoryLoading(true)
    try {
      const params: Record<string, string> = {}
      if (status) params.status = status
      const res = await getMyLeaves(params)
      const all: LeaveApplication[] = res.data.data?.results ?? res.data.data ?? []
      setHistory(all.filter(l => l.status !== 'pending'))
    } catch {}
    setHistoryLoading(false)
  }

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Pending Approvals'
    load()
  }, [])

  useEffect(() => {
    if (activeTab === 'history') loadHistory(historyStatus)
  }, [activeTab, historyStatus])

  const handleRecall = async () => {
    if (!selectedHistory || !recallReason.trim()) return
    setRecalling(true)
    try {
      await client.post(`/leaves/${selectedHistory.id}/cancel/`, { reason: recallReason })
      setSelectedHistory(null)
      setShowRecallConfirm(false)
      setRecallReason('')
      await loadHistory(historyStatus)
    } catch (e: any) {
      alert(e.response?.data?.message ?? e.response?.data?.error ?? 'Recall failed.')
    }
    setRecalling(false)
  }

  const openInlineAssign = async (leave: LeaveApplication) => {
    setShowInlineAssign(true)
    setAssignLoading(true)
    const existing = (leave as any).replacement_employee
    setAssignSelected(existing?.id ?? '')
    setAssignNote('')
    try {
      const r = await getEmployees()
      const all: Employee[] = r.data.data ?? []
      setAssignEmployees(all.filter(e => e.full_name !== leave.employee_name))
    } catch {}
    setAssignLoading(false)
  }

  const handleInlineAssign = async () => {
    if (!selectedHistory || !assignSelected) return
    setAssignSaving(true)
    try {
      const res = await client.post('/replacements/', {
        leave_application_id: selectedHistory.id,
        replacement_employee_id: assignSelected,
        notes: assignNote,
      })
      const assignment = res.data?.data ?? res.data
      // Update selectedHistory in place
      const updated = { ...(selectedHistory as any), replacement_employee: assignment.replacement_employee }
      setSelectedHistory(updated as LeaveApplication)
      // Also update history list
      setHistory(prev => prev.map(l => l.id === selectedHistory.id ? updated as LeaveApplication : l))
      setShowInlineAssign(false)
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Failed to assign replacement.')
    }
    setAssignSaving(false)
  }

  const handleAction = async () => {
    if (!actionId || !actionType) return
    setProcessing(true)
    try {
      if (actionType === 'approve') await approveLeave(actionId, comment)
      else await rejectLeave(actionId, comment)
      setActionId(null); setActionType(null); setComment('')
      await load()
    } catch (e: any) { alert(e.response?.data?.message ?? 'Action failed.') }
    setProcessing(false)
  }

  const handleReplacementDone = (updatedLeave: LeaveApplication) => {
    setApps(prev => prev.map(a => a.id === updatedLeave.id ? { ...a, ...(updatedLeave as any) } : a))
  }

  const filteredApps = apps.filter(a =>
    (!deptFilter || (a as any).department_name === deptFilter) &&
    (!typeFilter || a.leave_type_name === typeFilter)
  )

  const SC: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-100 text-slate-500',
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-4">

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <Clock size={14} /> Pending
          {apps.length > 0 && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{apps.length}</span>}
        </button>
        <button onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <History size={14} /> All Requests
        </button>
      </div>

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 flex-wrap">
            <select value={historyStatus} onChange={e => setHistoryStatus(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-600">
              <option value="">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input value={historySearch} onChange={e => setHistorySearch(e.target.value)}
              placeholder="Search by name or leave type..."
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-600 w-64" />
            <button onClick={handleHistDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 font-medium ml-auto">
              <Download size={13} /> CSV
            </button>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-7 h-7 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {([['Employee','employee_name'],['Leave Type','leave_type_name'],['Period','start_date'],['Days','total_days'],['Status','status'],['Applied','applied_at']] as [string,string][]).map(([h,col])=>(
                      <th key={h} onClick={()=>toggleHistSort(col)}
                        className="px-4 py-3 font-semibold text-slate-600 cursor-pointer hover:bg-slate-50 select-none whitespace-nowrap text-left">
                        {h}<span className="text-slate-300 ml-1 text-xs">{histSortKey===col?(histSortDir==='asc'?'↑':'↓'):'↕'}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...history]
                    .filter((l: any) => !historySearch ||
                      l.employee_name?.toLowerCase().includes(historySearch.toLowerCase()) ||
                      l.leave_type_name?.toLowerCase().includes(historySearch.toLowerCase()))
                    .sort((a: any, b: any) => {
                      if (!histSortKey || !histSortDir) return 0
                      const av = a[histSortKey], bv = b[histSortKey]
                      if (av == null) return 1; if (bv == null) return -1
                      const cmp = typeof av==='number'&&typeof bv==='number' ? av-bv : String(av).localeCompare(String(bv),undefined,{numeric:true})
                      return histSortDir==='asc' ? cmp : -cmp
                    })
                    .map((l: any, idx: number) => (
                      <tr key={l.id} onClick={() => setSelectedHistory(l)} className={`border-b border-slate-50 hover:bg-slate-50 cursor-pointer ${idx % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs flex-shrink-0">
                              {l.employee_name?.[0] ?? '?'}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{l.employee_name}</p>
                              <p className="text-xs text-slate-400">{(l as any).department_name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.leave_type_color }} />
                            {l.leave_type_name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{l.start_date} → {l.end_date}</td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-900">{l.total_days}d</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${SC[l.status] ?? ''}`}>{l.status}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{new Date(l.applied_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {history.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <History size={32} className="mx-auto mb-3 opacity-30" />
                  <p>No leave history found</p>
                </div>
              )}
            </div>
          )}

          {/* Leave Detail Modal */}
          {selectedHistory && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedHistory(null)}>
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-slate-900 px-5 py-4 flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-mono">{selectedHistory.reference_number}</p>
                    <p className="text-white font-bold text-lg mt-0.5">{selectedHistory.leave_type_name}</p>
                    <p className="text-slate-300 text-sm mt-0.5">
                      {selectedHistory.start_date} → {selectedHistory.end_date} · {selectedHistory.total_days} days
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize mt-1 ${SC[selectedHistory.status] ?? ''}`}>
                    {selectedHistory.status}
                  </span>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                  {/* Employee */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold flex-shrink-0">
                      {selectedHistory.employee_name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{selectedHistory.employee_name}</p>
                      <p className="text-xs text-slate-400">{(selectedHistory as any).department_name}</p>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3">
                    {[
                      ['Applied On', new Date(selectedHistory.applied_at).toLocaleDateString()],
                      ['Duration', `${selectedHistory.total_days} working days`],
                      ['Leave Type', selectedHistory.leave_type_name],
                      ['Reference', selectedHistory.reference_number],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-xs text-slate-400">{label}</p>
                        <p className="text-sm font-medium text-slate-900 mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Replacement */}
                  {/* Replacement section */}
                  {!showInlineAssign ? (
                    (selectedHistory as any).replacement_employee ? (
                      <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Alternative Resource Assigned</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                              {(selectedHistory as any).replacement_employee.full_name?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{(selectedHistory as any).replacement_employee.full_name}</p>
                              <p className="text-xs text-slate-500">{(selectedHistory as any).replacement_employee.employee_id}</p>
                            </div>
                          </div>
                          {selectedHistory.status === 'approved' && (
                            <button onClick={() => openInlineAssign(selectedHistory)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded-lg hover:bg-blue-50">
                              ✎ Change
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="border border-slate-200 bg-slate-50 rounded-xl p-3 flex items-center justify-between">
                        <p className="text-xs text-slate-400">No alternative resource assigned.</p>
                        {selectedHistory.status === 'approved' && (
                          <button onClick={() => openInlineAssign(selectedHistory)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold rounded-lg border border-blue-200 transition-colors">
                            <Users size={12} /> Assign
                          </button>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="border border-blue-200 bg-blue-50 rounded-xl p-3 space-y-3">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                        {(selectedHistory as any).replacement_employee ? 'Change Alternative Resource' : 'Assign Alternative Resource'}
                      </p>
                      {assignLoading ? (
                        <p className="text-xs text-slate-400">Loading employees...</p>
                      ) : (
                        <select value={assignSelected} onChange={e => setAssignSelected(e.target.value)}
                          className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                          <option value="">Choose employee...</option>
                          {assignEmployees.map(e => (
                            <option key={e.id} value={e.id}>{e.full_name} — {(e as any).designation_name || (e as any).role || ''}</option>
                          ))}
                        </select>
                      )}
                      <textarea value={assignNote} onChange={e => setAssignNote(e.target.value)} rows={2}
                        placeholder="Handover notes (optional)..."
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white" />
                      <div className="flex gap-2">
                        <button onClick={() => { setShowInlineAssign(false); setAssignSelected(''); setAssignNote('') }}
                          className="flex-1 py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-white">
                          Cancel
                        </button>
                        <button onClick={handleInlineAssign} disabled={assignSaving || !assignSelected}
                          className="flex-1 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs font-semibold rounded-lg transition-colors">
                          {assignSaving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Attachment */}
                  {(selectedHistory as any).attachment_url && (
                    <a href={(selectedHistory as any).attachment_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors">
                      📎 View Medical Certificate
                    </a>
                  )}
                </div>

                {/* Recall confirm panel */}
                {showRecallConfirm && (
                  <div className="px-5 pb-3 pt-0 border-t border-red-100 bg-red-50">
                    <p className="text-sm font-semibold text-red-700 mt-3 mb-2">Recall Leave — Mandatory Reason</p>
                    <textarea
                      value={recallReason}
                      onChange={e => setRecallReason(e.target.value)}
                      rows={2}
                      placeholder="State the reason for recalling this approved leave (e.g. emergency, operational requirement)..."
                      className="w-full px-3 py-2 border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-2"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => { setShowRecallConfirm(false); setRecallReason('') }}
                        className="flex-1 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-white">
                        Cancel
                      </button>
                      <button onClick={handleRecall} disabled={recalling || !recallReason.trim()}
                        className="flex-1 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-sm font-semibold rounded-xl transition-colors">
                        {recalling ? 'Recalling...' : 'Confirm Recall'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer actions */}
                <div className="px-5 pb-5 pt-4 flex gap-2 flex-wrap">
                  {/* Recall Leave */}
                  {selectedHistory.status === 'approved' && !showRecallConfirm && (
                    <button
                      onClick={() => setShowRecallConfirm(true)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl border border-red-200 transition-colors"
                    >
                      <XCircle size={14} /> Recall Leave
                    </button>
                  )}

                  {/* Close */}
                  {!showRecallConfirm && (
                    <button onClick={() => setSelectedHistory(null)}
                      className="ml-auto px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50">
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PENDING TAB ── */}
      {activeTab === 'pending' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { l: 'Pending', v: apps.length, c: 'text-amber-600' },
              { l: 'Departments', v: new Set(apps.map(a => (a as any).department_name)).size, c: 'text-slate-900' },
              { l: 'Total Days', v: apps.reduce((s, a) => s + parseFloat(String(a.total_days)), 0).toFixed(0), c: 'text-slate-900' },
            ].map(s => (
              <div key={s.l} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 flex-wrap">
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-600">
              <option value="">All Departments</option>
              {[...new Set(apps.map(a => (a as any).department_name).filter(Boolean))].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-600">
              <option value="">All Leave Types</option>
              {[...new Set(apps.map(a => a.leave_type_name).filter(Boolean))].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {(deptFilter || typeFilter) && (
              <button onClick={() => { setDeptFilter(''); setTypeFilter('') }} className="text-xs text-slate-400 hover:text-slate-600 font-medium">Clear filters</button>
            )}
            <span className="text-xs text-slate-400 ml-auto">{filteredApps.length} of {apps.length} shown</span>
          </div>

          {filteredApps.length === 0 && apps.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <p className="text-slate-400">No approvals match the selected filters.</p>
            </div>
          ) : apps.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
              <CheckCircle size={48} className="text-emerald-300 mx-auto mb-4" />
              <h3 className="font-bold text-slate-700 text-lg">All caught up!</h3>
              <p className="text-slate-400 text-sm mt-1">No pending approvals right now.</p>
            </div>
          ) : filteredApps.map(app => {
            const isExpanded = expandedId === app.id
            const isActioning = actionId === app.id
            const replacementEmp = (app as any).replacement_employee as { id: string; full_name: string } | null | undefined
            const todayStr = new Date().toISOString().slice(0, 10)
            const isPast = app.end_date <= todayStr

            return (
              <div key={app.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold flex-shrink-0">
                    {app.employee_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold text-slate-900">{app.employee_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{(app as any).department_name} · Applied {new Date(app.applied_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${SC[app.status] ?? ''}`}>{app.status}</span>
                        {isPast && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">⚠ Overdue</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap text-sm">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: app.leave_type_color }} />
                        {app.leave_type_name}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">{app.start_date} → {app.end_date}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-semibold text-slate-900">{app.total_days}d</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {isPast ? (
                        <span title="Leave dates have passed — ask employee to cancel or reject this"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-300 text-xs font-semibold rounded-lg border border-slate-200 cursor-not-allowed select-none">
                          <CheckCircle size={13} /> Approve
                        </span>
                      ) : (
                        <button onClick={() => { setActionId(app.id); setActionType('approve'); setComment('') }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200">
                          <CheckCircle size={13} /> Approve
                        </button>
                      )}
                      <button onClick={() => { setActionId(app.id); setActionType('reject'); setComment('') }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg border border-red-200">
                        <XCircle size={13} /> Reject
                      </button>
                      {replacementEmp ? (
                        <button onClick={() => setReplacementFor(app)}
                          className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg font-medium hover:bg-emerald-100 transition-colors">
                          <Users size={13} /> {replacementEmp.full_name} <span className="text-emerald-400 ml-0.5">✎</span>
                        </button>
                      ) : (
                        <button onClick={() => setReplacementFor(app)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold rounded-lg border border-blue-200">
                          <Users size={13} /> Assign Replacement
                        </button>
                      )}
                      <button onClick={() => setExpandedId(isExpanded ? null : app.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg border border-slate-200">
                        View Details
                      </button>
                      <button onClick={() => setExpandedId(isExpanded ? null : app.id)}
                        className="flex items-center gap-1 px-2 py-1.5 text-slate-400 hover:text-slate-600 text-xs rounded-lg ml-auto">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Details
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[['Reference', app.reference_number], ['Leave Type', app.leave_type_name], ['Duration', `${app.total_days} days`], ['Approval Level', `Level ${app.current_approval_level}`]].map(([l, v]) => (
                        <div key={l}><p className="text-xs text-slate-400">{l}</p><p className="text-sm font-medium text-slate-900 mt-0.5">{v}</p></div>
                      ))}
                    </div>
                    {(app as any).attachment_url && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Medical Certificate</p>
                        <a href={(app as any).attachment_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors">
                          View Medical Certificate
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {isActioning && (
                  <div className={`border-t px-4 py-4 ${actionType === 'approve' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <p className="text-sm font-semibold mb-2 text-slate-700 capitalize">{actionType} — {app.employee_name}'s {app.leave_type_name}</p>
                    <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
                      placeholder="Add a comment (optional)..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none mb-3" />
                    <div className="flex gap-2">
                      <button onClick={() => setActionId(null)} className="text-sm text-slate-500 px-4 py-2 rounded-lg hover:bg-white">Cancel</button>
                      <button onClick={handleAction} disabled={processing}
                        className={`flex-1 text-white text-sm font-semibold py-2 rounded-xl transition-colors ${actionType === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300' : 'bg-red-500 hover:bg-red-600 disabled:bg-red-300'}`}>
                        {processing ? 'Processing...' : `Confirm ${actionType}`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {replacementFor && (
            <AssignReplacementModal
              leave={replacementFor}
              onClose={() => setReplacementFor(null)}
              onDone={updatedLeave => { handleReplacementDone(updatedLeave); setReplacementFor(null) }}
            />
          )}
        </>
      )}
    </div>
  )
}
