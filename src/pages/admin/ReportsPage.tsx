import { useEffect, useState } from 'react'
import client from '../../api/client'
import { BarChart3, Download, Calendar, Users, TrendingUp, Clock, RefreshCw } from 'lucide-react'
import { downloadCSV } from '../../utils/tableUtils'

interface SummaryRow { employee_name: string; employee_id: string; department: string; leave_type: string; total_days: number; status: string }

function BarChart({ data, title }: { data: { label: string; value: number; color: string }[]; title: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <p className="text-sm font-semibold text-slate-700 mb-4">{title}</p>
      <div className="space-y-2.5">
        {data.length === 0
          ? <p className="text-slate-400 text-sm text-center py-4">No data for this period</p>
          : data.map(d => (
            <div key={d.label} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-28 flex-shrink-0 truncate">{d.label}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                <div className="h-full rounded-full flex items-center px-2 transition-all duration-500"
                  style={{ width: `${(d.value / max) * 100}%`, background: d.color, minWidth: d.value > 0 ? '28px' : '0' }}>
                  {d.value > 0 && <span className="text-xs font-bold text-white">{d.value}</span>}
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-700 w-10 text-right flex-shrink-0">{d.value}</span>
            </div>
          ))}
      </div>
    </div>
  )
}

function DonutChart({ data, title }: { data: { label: string; value: number; color: string }[]; title: string }) {
  const total = Math.round(data.reduce((s, d) => s + d.value, 0) * 10) / 10
  let cumPct = 0
  const r = 40, cx = 60, cy = 60, circum = 2 * Math.PI * r
  const segments = data.map(d => {
    const pct = total > 0 ? d.value / total : 0
    const seg = { ...d, pct, offset: cumPct * circum, dash: pct * circum, gap: (1 - pct) * circum }
    cumPct += pct
    return seg
  })
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <p className="text-sm font-semibold text-slate-700 mb-4">{title}</p>
      <div className="flex items-center gap-6">
        <div className="relative flex-shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="16"/>
            {segments.map((s, i) => (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth="16"
                strokeDasharray={`${s.dash} ${s.gap}`} strokeDashoffset={-s.offset}
                transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round"/>
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-lg font-bold text-slate-900 leading-none">{total}</p>
            <p className="text-xs text-slate-400 mt-0.5">total</p>
          </div>
        </div>
        <div className="space-y-2 flex-1 min-w-0">
          {data.length === 0
            ? <p className="text-slate-400 text-xs">No data</p>
            : data.map(d => (
              <div key={d.label} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }}/>
                  <span className="text-xs text-slate-600 truncate">{d.label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-semibold text-slate-900">{d.value}</span>
                  <span className="text-xs text-slate-400">{total > 0 ? Math.round(d.value/total*100) : 0}%</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// ── OVERTIME & TOIL TAB ────────────────────────────────────
const TOIL_DEMO = [
  { name: 'Ali Raza',      id: 'EMP-003', dept: 'Engineering', earned: 12.5, used: 4,   balance: 8.5 },
  { name: 'Sarah Khan',    id: 'EMP-002', dept: 'Engineering', earned: 8,    used: 8,   balance: 0   },
  { name: 'Fatima Malik',  id: 'EMP-004', dept: 'Engineering', earned: 6,    used: 2,   balance: 4   },
  { name: 'Usman Ahmed',   id: 'EMP-005', dept: 'Finance',     earned: 3.5,  used: 0,   balance: 3.5 },
  { name: 'Admin User',    id: 'EMP-001', dept: 'HR & Admin',  earned: 5,    used: 5,   balance: 0   },
]

function TOILTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total OT Earned', value: '35h', color: 'text-amber-600' },
          { label: 'TOIL Used',       value: '19h', color: 'text-blue-600'  },
          { label: 'TOIL Balance',    value: '16h', color: 'text-emerald-600' },
          { label: 'Employees w/ OT', value: '5',   color: 'text-slate-900' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <BarChart
        title="Overtime Hours by Employee"
        data={TOIL_DEMO.map((r, i) => ({ label: r.name.split(' ')[0], value: r.earned, color: ['#f59e0b','#3b82f6','#10b981','#8b5cf6','#ef4444'][i] }))}
      />
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 flex justify-end">
          <button onClick={handleToilDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 font-medium">
            <Download size={13} /> Download CSV
          </button>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {([['Employee','name'],['Department','dept'],['OT Earned','earned'],['TOIL Used','used'],['Balance','balance']] as [string,string][]).map(([h,col]) => (
                <th key={h} onClick={() => toggleToilSort(col)}
                  className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap">
                  {h}<span className="text-slate-300 ml-1 text-xs">{toilSortKey===col?(toilSortDir==='asc'?'↑':'↓'):'↕'}</span>
                </th>
              ))}
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedToil.map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><p className="text-sm font-semibold text-slate-900">{r.name}</p><p className="text-xs text-slate-400 font-mono">{r.id}</p></td>
                <td className="px-4 py-3 text-sm text-slate-600">{r.dept}</td>
                <td className="px-4 py-3 text-sm font-semibold text-amber-600">{r.earned}h</td>
                <td className="px-4 py-3 text-sm text-slate-600">{r.used}h</td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-bold ${r.balance > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{r.balance}h</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${r.balance > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {r.balance > 0 ? 'Has balance' : 'Cleared'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── REPLACEMENT TAB ────────────────────────────────────────
const REPL_DEMO = [
  { absent: 'Sara Malik',    replacement: 'Ahmed Khan',   period: 'May 20–22', projects: 'Q2 Report, Client Deck', logged: 12.5, expected: 24,  status: 'active'    },
  { absent: 'Kamran Hassan', replacement: 'Raza Hussain', period: 'May 12–16', projects: 'Dev Sprint, Bug Fixes', logged: 38,   expected: 40,  status: 'completed'  },
  { absent: 'Zara Ali',      replacement: 'Nadia Baig',   period: 'May 8–9',   projects: 'Social Campaign',      logged: 14,   expected: 16,  status: 'completed'  },
  { absent: 'Omar Sheikh',   replacement: 'Faisal Ahmed', period: 'Apr 28–30', projects: 'Client Meeting Prep',  logged: 22,   expected: 24,  status: 'completed'  },
]
const TOP_REPLACEMENTS = [
  { name: 'Ahmed Khan',  hours: 60.5, color: 'bg-emerald-500' },
  { name: 'Raza Hussain',hours: 38,   color: 'bg-blue-500' },
  { name: 'Nadia Baig',  hours: 14,   color: 'bg-amber-500' },
  { name: 'Faisal Ahmed',hours: 22,   color: 'bg-purple-500' },
]
const PROJECT_HRS = [
  { label: 'Q2 Report Review', value: 42 }, { label: 'Dev Sprint', value: 38 },
  { label: 'Client Deck Prep', value: 28 }, { label: 'Bug Fixes', value: 22 },
  { label: 'Social Campaign', value: 14 },  { label: 'Client Meeting', value: 22 },
]

function ReplacementTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Main content */}
      <div className="md:col-span-2 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Assignments', value: '8',   color: 'text-slate-900' },
            { label: 'Hrs Logged',  value: '186h', color: 'text-blue-600' },
            { label: 'Avg Coverage',value: '94%',  color: 'text-emerald-600' },
            { label: 'Pending Logs',value: '12h',  color: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Assignments table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">All Replacement Assignments</h3>
            <button className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
              <Download size={13}/> Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Absent Employee','Replacement','Period','Projects','Hrs Logged','Coverage','Status'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {REPL_DEMO.map((r, i) => {
                  const pct = Math.round((r.logged / r.expected) * 100)
                  const pctColor = pct >= 90 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{r.absent}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.replacement}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{r.period}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[140px] truncate">{r.projects}</td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-900">{r.logged}h / {r.expected}h</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pctColor }}/>
                          </div>
                          <span className="text-xs font-semibold" style={{ color: pctColor }}>{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${r.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hours by project bar chart */}
        <BarChart
          title="Hours by Project"
          data={PROJECT_HRS.map(p => ({ label: p.label, value: p.value, color: '#3b82f6' }))}
        />
      </div>

      {/* Right sidebar */}
      <div className="space-y-4">
        {/* Top replacements */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="font-semibold text-slate-900 mb-1">Top Replacement Employees</p>
          <p className="text-xs text-slate-400 mb-4">By hours covered this quarter</p>
          <div className="space-y-3">
            {TOP_REPLACEMENTS.map((r, i) => (
              <div key={r.name} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full ${r.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {i + 1}
                </div>
                <span className="text-sm text-slate-800 flex-1 font-medium">{r.name}</span>
                <span className="text-sm font-bold text-slate-900">{r.hours}h</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ─────────────────────────────────────────
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'leave'|'attendance'|'toil'|'replacement'>('leave')
  const [tableData, setTableData] = useState<SummaryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [toilSortKey, setToilSortKey] = useState<string | null>(null)
  const [toilSortDir, setToilSortDir] = useState<'asc'|'desc'|null>('asc')
  const toggleToilSort = (col: string) => {
    if (toilSortKey === col) { if (toilSortDir==='asc') setToilSortDir('desc'); else { setToilSortKey(null); setToilSortDir('asc') } }
    else { setToilSortKey(col); setToilSortDir('asc') }
  }
  const sortedToil = [...TOIL_DEMO].sort((a: any, b: any) => {
    if (!toilSortKey || !toilSortDir) return 0
    const av = a[toilSortKey], bv = b[toilSortKey]
    if (av == null) return 1; if (bv == null) return -1
    const cmp = typeof av==='number'&&typeof bv==='number' ? av-bv : String(av).localeCompare(String(bv),undefined,{numeric:true})
    return toilSortDir==='asc' ? cmp : -cmp
  })
  const handleToilDownload = () => {
    downloadCSV('toil-report.csv',
      ['Employee', 'ID', 'Department', 'OT Earned (h)', 'TOIL Used (h)', 'Balance (h)'],
      sortedToil.map((r: any) => [r.name, r.id, r.dept, r.earned, r.used, r.balance])
    )
  }

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Reports'
    loadReport()
  }, [])

  useEffect(() => {
    if (activeTab === 'leave' || activeTab === 'attendance') loadReport()
  }, [activeTab, dateFrom, dateTo])

  const loadReport = async () => {
    setLoading(true)
    try {
      const ep = activeTab === 'leave' ? '/reports/leave-summary/' : '/reports/attendance/'
      const { data } = await client.get(ep, { params: { date_from: dateFrom, date_to: dateTo } })
      setTableData((data.data ?? []).map((r: any) => ({
        ...r,
        total_days: r.total_days !== undefined
          ? Math.round(r.total_days * 100) / 100
          : r.worked_hours !== undefined
            ? Math.round((parseFloat(r.worked_hours) / 8) * 100) / 100
            : 0,
        leave_type: r.leave_type || r.status || 'Attendance',
        department: r.department || r.department_name || '—',
        employee_name: r.employee_name || '—',
        employee_id: r.employee_id || '—',
      })))
    } catch {
      setTableData([
        { employee_name:'Admin User',   employee_id:'EMP-001', department:'HR & Admin',  leave_type:'Annual Leave', total_days:2, status:'approved' },
        { employee_name:'Sarah Khan',   employee_id:'EMP-002', department:'Engineering', leave_type:'Sick Leave',   total_days:1, status:'approved' },
        { employee_name:'Ali Raza',     employee_id:'EMP-003', department:'Engineering', leave_type:'Annual Leave', total_days:3, status:'pending'  },
        { employee_name:'Fatima Malik', employee_id:'EMP-004', department:'Engineering', leave_type:'Casual Leave', total_days:1, status:'approved' },
        { employee_name:'Usman Ahmed',  employee_id:'EMP-005', department:'Finance',     leave_type:'Annual Leave', total_days:2, status:'approved' },
      ])
    }
    setLoading(false)
  }

  const deptData = (() => {
    const COLORS = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4']
    const map: Record<string, number> = {}
    tableData.forEach(r => { map[r.department] = (map[r.department] ?? 0) + (r.total_days || 0) })
    return Object.entries(map).map(([label, value], i) => ({ label, value: Math.round(value*10)/10, color: COLORS[i%COLORS.length] }))
  })()

  const typeData = (() => {
    const COLORS: Record<string,string> = {'Annual Leave':'#10b981','Sick Leave':'#3b82f6','Casual Leave':'#f59e0b','Maternity Leave':'#ec4899','Unpaid Leave':'#94a3b8','Attendance':'#6366f1'}
    const map: Record<string, number> = {}
    tableData.forEach(r => { if (r.leave_type && r.leave_type !== 'undefined') map[r.leave_type] = (map[r.leave_type] ?? 0) + (r.total_days || 0) })
    return Object.entries(map).map(([label, value]) => ({ label, value: Math.round(value*10)/10, color: COLORS[label] ?? '#94a3b8' }))
  })()

  const totalDays = Math.round(tableData.reduce((s,r) => s + r.total_days, 0) * 10) / 10
  const unique = new Set(tableData.map(r => r.employee_id)).size

  const TABS = [
    { key: 'leave',        label: 'Leave Summary',   Icon: Calendar   },
    { key: 'attendance',   label: 'Attendance',      Icon: Users      },
    { key: 'toil',         label: 'Overtime & TOIL', Icon: Clock      },
    { key: 'replacement',  label: 'Replacement',     Icon: RefreshCw  },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* 4 Tabs */}
      <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl flex-wrap">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab===key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon size={14}/>{label}
          </button>
        ))}
      </div>

      {/* TOIL tab */}
      {activeTab === 'toil' && <TOILTab dateFrom={dateFrom} dateTo={dateTo}/>}

      {/* Replacement tab */}
      {activeTab === 'replacement' && <ReplacementTab/>}

      {/* Leave + Attendance tabs */}
      {(activeTab === 'leave' || activeTab === 'attendance') && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
            </div>
            <div className="flex-1"/>
            <button className="flex items-center gap-2 border border-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-50">
              <Download size={15}/> Export Excel
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><BarChart3 size={18} className="text-blue-500"/></div>
              <div><p className="text-xl font-bold text-slate-900">{tableData.length}</p><p className="text-xs text-slate-500">Records</p></div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center"><TrendingUp size={18} className="text-emerald-500"/></div>
              <div><p className="text-xl font-bold text-slate-900">{totalDays}</p><p className="text-xs text-slate-500">Total Days</p></div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center"><Users size={18} className="text-purple-500"/></div>
              <div><p className="text-xl font-bold text-slate-900">{unique}</p><p className="text-xs text-slate-500">Employees</p></div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BarChart data={deptData} title={activeTab === 'leave' ? 'Days by Department' : 'Hours by Department'}/>
            <DonutChart data={typeData} title={activeTab === 'leave' ? 'Leave Type Breakdown' : 'Status Breakdown'}/>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Employee','Department','Leave Type','Days','Status'].map(h=>(
                        <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((row,i)=>(
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3"><p className="text-sm font-semibold text-slate-900">{row.employee_name}</p><p className="text-xs text-slate-400 font-mono">{row.employee_id}</p></td>
                        <td className="px-4 py-3 text-sm text-slate-600">{row.department}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{row.leave_type}</td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-900">{row.total_days}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${row.status==='approved'?'bg-emerald-100 text-emerald-700':row.status==='pending'?'bg-amber-100 text-amber-700':row.status==='present'?'bg-blue-100 text-blue-700':'bg-slate-100 text-slate-500'}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
