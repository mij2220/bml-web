import { useEffect, useState } from 'react'
import client from '../../api/client'
import { getDepartments } from '../../api/employees'
import { Megaphone, Plus, Eye, Users, Globe, Trash2, Send } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  body: string
  target: 'all' | 'department' | 'role'
  target_label: string
  priority: 'normal' | 'high' | 'urgent'
  created_at: string
  created_by_name: string
  views?: number
}

const PRIORITY_CONFIG = {
  normal: { label: 'Normal', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  high:   { label: 'High',   color: 'bg-amber-100 text-amber-700 border-amber-200' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200' },
}

// Demo announcements
const DEMO: Announcement[] = [
  {
    id: '1', title: 'Office closure — Eid ul-Adha', priority: 'high', target: 'all', target_label: 'All Staff',
    body: 'The office will be closed from June 6–8 for Eid ul-Adha. Public holiday pay applies. Wishing everyone Eid Mubarak!',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(), created_by_name: 'Admin User', views: 42,
  },
  {
    id: '2', title: 'Leave policy update — 2026', priority: 'normal', target: 'all', target_label: 'All Staff',
    body: 'The annual leave entitlement has been updated to 21 days effective January 2026. Please review the updated policy document on the HR portal.',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(), created_by_name: 'Admin User', views: 38,
  },
  {
    id: '3', title: 'Q2 performance reviews', priority: 'normal', target: 'department', target_label: 'Engineering',
    body: 'Q2 performance reviews are scheduled for the week of June 15. Managers will reach out to schedule individual sessions.',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(), created_by_name: 'Sarah Khan', views: 12,
  },
]

function ComposeModal({ depts, onClose, onSent }: { depts: any[]; onClose: () => void; onSent: (a: Announcement) => void }) {
  const [form, setForm] = useState({ title: '', body: '', target: 'all', department_id: '', priority: 'normal' })
  const [sending, setSending] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSend = async () => {
    if (!form.title || !form.body) return
    setSending(true)
    try {
      await client.post('/announcements/', form).catch(() => {})
      const dept = depts.find(d => d.id === form.department_id)
      onSent({
        id: Date.now().toString(),
        title: form.title,
        body: form.body,
        target: form.target as any,
        target_label: form.target === 'all' ? 'All Staff' : (dept?.name ?? 'Department'),
        priority: form.priority as any,
        created_at: new Date().toISOString(),
        created_by_name: 'Admin User',
        views: 0,
      })
      onClose()
    } catch {}
    setSending(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 md:hidden"><div className="w-10 h-1 bg-slate-200 rounded-full"/></div>
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Megaphone size={18} className="text-emerald-600"/>
          </div>
          <div>
            <h3 className="font-bold text-slate-900">New Announcement</h3>
            <p className="text-xs text-slate-400">This will be sent as a notification to all recipients</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Office closure — Eid"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Message *</label>
            <textarea value={form.body} onChange={e => set('body', e.target.value)} rows={4}
              placeholder="Write your announcement here..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Send to</label>
              <select value={form.target} onChange={e => set('target', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="all">All Staff</option>
                <option value="department">Department</option>
                <option value="role">Role</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          {form.target === 'department' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
              <select value={form.department_id} onChange={e => set('department_id', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Select department...</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
          {form.priority === 'urgent' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              ⚠️ Urgent announcements trigger immediate push notifications to all recipients.
            </div>
          )}
        </div>
        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50">Cancel</button>
          <button onClick={handleSend} disabled={sending || !form.title || !form.body}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
            <Send size={15}/>{sending ? 'Sending...' : 'Send Announcement'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [depts, setDepts] = useState<any[]>([])
  const [showCompose, setShowCompose] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Announcements'
    Promise.all([
      client.get('/announcements/').catch(() => ({ data: { data: [] } })),
      getDepartments(),
    ]).then(([aR, dR]) => {
      const data = aR.data.data ?? []
      setAnnouncements(data.length > 0 ? data : DEMO)
      setDepts(dR.data.data ?? [])
    }).finally(() => setLoading(false))
  }, [])

  const handleDelete = (id: string) => {
    if (!confirm('Delete this announcement?')) return
    setAnnouncements(prev => prev.filter(a => a.id !== id))
    client.delete(`/announcements/${id}/`).catch(() => {})
  }

  const timeAgo = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    return `${diff} days ago`
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/></div>

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{announcements.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{announcements.filter(a=>a.priority==='high'||a.priority==='urgent').length}</p>
          <p className="text-xs text-slate-500 mt-0.5">High Priority</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{announcements.reduce((s,a)=>s+(a.views??0),0)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total Views</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowCompose(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus size={15}/> New Announcement
        </button>
      </div>

      {/* Announcements list */}
      <div className="space-y-3">
        {announcements.map(a => {
          const pc = PRIORITY_CONFIG[a.priority]
          const isExp = expanded === a.id
          return (
            <div key={a.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {a.priority === 'urgent' && <div className="h-1 bg-red-500"/>}
              {a.priority === 'high' && <div className="h-1 bg-amber-400"/>}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Megaphone size={16} className="text-emerald-600"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900">{a.title}</p>
                        {a.priority !== 'normal' && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${pc.color}`}>
                            {pc.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          {a.target === 'all' ? <Globe size={11}/> : <Users size={11}/>}
                          {a.target_label}
                        </span>
                        <span>·</span>
                        <span>{timeAgo(a.created_at)}</span>
                        <span>·</span>
                        <span>{a.created_by_name}</span>
                        {a.views !== undefined && <><span>·</span><span className="flex items-center gap-1"><Eye size={11}/>{a.views} views</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setExpanded(isExp ? null : a.id)}
                      className="text-xs text-emerald-600 font-medium px-2 py-1 rounded-lg hover:bg-emerald-50">
                      {isExp ? 'Hide' : 'Read'}
                    </button>
                    <button onClick={() => handleDelete(a.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>

                {isExp && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-sm text-slate-700 leading-relaxed">{a.body}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showCompose && <ComposeModal depts={depts} onClose={() => setShowCompose(false)} onSent={a => setAnnouncements(prev => [a, ...prev])}/>}
    </div>
  )
}
