import { useEffect, useState } from 'react'
import client from '../../api/client'
import { Clock, MapPin, CheckCircle } from 'lucide-react'

export default function ClockPage() {
  const [record, setRecord] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Attendance'
    client.get('/attendance/today/').then(r => {
      setRecord(r.data.data)
      setLoading(false)
    }).catch(() => setLoading(false))
    const iv = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  const clockIn = async () => {
    setActing(true)
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation?.getCurrentPosition(res, rej, { timeout: 5000 })
      ).catch(() => null)
      const { data } = await client.post('/attendance/clock-in/', {
        latitude: pos?.coords.latitude,
        longitude: pos?.coords.longitude,
      })
      setRecord(data.data)
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Clock-in failed.')
    }
    setActing(false)
  }

  const clockOut = async () => {
    setActing(true)
    try {
      const { data } = await client.post('/attendance/clock-out/')
      setRecord(data.data)
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Clock-out failed.')
    }
    setActing(false)
  }

  const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const clocked_in = record?.clock_in
  const clocked_out = record?.clock_out

  return (
    <div className="max-w-lg space-y-4">
      {/* Clock */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl p-8 text-center text-white">
        <p className="text-slate-400 text-sm mb-2">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <p className="text-5xl font-bold font-mono tracking-tight">{fmt(now)}</p>
        <p className="text-slate-400 text-sm mt-2">Asia/Karachi (PKT)</p>
      </div>

      {/* Status card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Today's Attendance</h3>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Clock In</p>
                <p className={`text-xl font-bold ${clocked_in ? 'text-emerald-600' : 'text-slate-300'}`}>
                  {clocked_in ? fmtTime(clocked_in) : '—'}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Clock Out</p>
                <p className={`text-xl font-bold ${clocked_out ? 'text-slate-700' : 'text-slate-300'}`}>
                  {clocked_out ? clocked_out ? fmtTime(clocked_out) : "—" : '—'}
                </p>
              </div>
            </div>

            {clocked_in && clocked_out ? (
              <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-4">
                <CheckCircle size={24} className="text-emerald-500" />
                <div>
                  <p className="font-semibold text-emerald-800">Day complete</p>
                  <p className="text-sm text-emerald-600">{record?.worked_hours ?? '0'} hours worked today</p>
                </div>
              </div>
            ) : clocked_in ? (
              <button
                onClick={clockOut}
                disabled={acting}
                className="w-full py-3.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-bold text-lg rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Clock size={20} />
                {acting ? 'Clocking out...' : 'Clock Out'}
              </button>
            ) : (
              <button
                onClick={clockIn}
                disabled={acting}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-bold text-lg rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Clock size={20} />
                {acting ? 'Clocking in...' : 'Clock In'}
              </button>
            )}

            <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
              <MapPin size={12} /> Location will be captured on clock-in
            </p>
          </>
        )}
      </div>
    </div>
  )
}
