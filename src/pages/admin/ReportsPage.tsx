import { useEffect, useState } from 'react'
import client from '../../api/client'
import { BarChart3, Download, Calendar, Users, TrendingUp } from 'lucide-react'

interface LeaveSummaryItem {
  employee_name: string
  employee_id: string
  department: string
  leave_type: string
  total_days: number
  status: string
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'leave' | 'attendance'>('leave')
  const [data, setData] = useState<LeaveSummaryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Reports'
  }, [])

  const loadReport = async () => {
    setLoading(true)
    try {
      const { data: res } = await client.get(
        activeTab === 'leave' ? '/reports/leave-summary/' : '/reports/attendance/',
        { params: { date_from: dateFrom, date_to: dateTo } }
      )
      setData(res.data ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadReport() }, [activeTab, dateFrom, dateTo])

  const totalDays = data.reduce((s, r) => s + (r.total_days || 0), 0)
  const uniqueEmployees = new Set(data.map(r => r.employee_id)).size

  return (
    <div className="max-w-5xl space-y-4">
      {/* Tab bar */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'leave', label: 'Leave Summary', icon: Calendar },
          { key: 'attendance', label: 'Attendance', icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="flex-1" />
        <button
          onClick={() => client.post('/reports/export/', { report_type: activeTab === 'leave' ? 'leave_summary' : 'attendance', format: 'xlsx', filters: { date_from: dateFrom, date_to: dateTo } }).then(() => alert('Export queued! Download will be available shortly.'))}
          className="flex items-center gap-2 border border-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Download size={15} /> Export Excel
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><BarChart3 size={18} className="text-blue-500" /></div>
          <div><p className="text-xl font-bold text-slate-900">{data.length}</p><p className="text-xs text-slate-500">Total Records</p></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center"><TrendingUp size={18} className="text-emerald-500" /></div>
          <div><p className="text-xl font-bold text-slate-900">{totalDays.toFixed(1)}</p><p className="text-xs text-slate-500">Total Days</p></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center"><Users size={18} className="text-purple-500" /></div>
          <div><p className="text-xl font-bold text-slate-900">{uniqueEmployees}</p><p className="text-xs text-slate-500">Employees</p></div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <BarChart3 size={40} className="mb-3 text-slate-200" />
            <p className="font-medium">No data for this period</p>
            <p className="text-sm mt-1">Try adjusting the date range</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Employee', 'Department', 'Leave Type', 'Days', 'Status'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{row.employee_name}</p>
                      <p className="text-xs text-slate-500 font-mono">{row.employee_id}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.department}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.leave_type}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900">{row.total_days}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${
                      row.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      row.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
