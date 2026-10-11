import { useEffect, useState } from 'react'
import { shiftsApi, errMsg, monthNow, todayIso, num, shiftName } from '../../api/shifts'
import { Card, Chip, Spinner, Note, MonthPicker, Tile, setTitle, SHIFT_TONE } from '../../components/shifts/ui'

/** Every employee in a shift group: own roster, attendance and extra hours. */
export default function MyAttendancePage() {
  const [month, setMonth] = useState(monthNow())
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState('')
  useEffect(() => { setTitle('My attendance') }, [])
  useEffect(() => {
    let live = true
    setData(null); shiftsApi.my(month).then(d => live && setData(d)).catch(e => live && setErr(errMsg(e)))
    return () => { live = false }
  }, [month])
  if (err) return <Note kind="error">{err}</Note>
  const today = todayIso()
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-bold text-slate-900">My attendance</h2>
          <p className="text-sm text-slate-500">{data?.section ?? ''}{data?.p_number ? ` · P.No. ${data.p_number}` : ''}</p></div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>
      {!data ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Tile label="Days worked" value={data.totals.days_worked} tone="green" />
            <Tile label="Attendance hours" value={num(data.totals.attendance_hours)} />
            <Tile label="Leave days" value={data.totals.leave_days} tone="blue" />
            <Tile label="Absent" value={data.totals.absent_days} tone="red" />
            <Tile label="Extra hours" value={num(data.totals.extra_hours)} tone="orange" />
          </div>
          <p className="text-xs text-slate-500">Totals count only days the Unit Manager has locked ({data.totals.locked_days} so far). Days still being marked are shown without a tick.</p>
          <Card className="divide-y divide-slate-100 overflow-hidden">
            {data.days.filter((d: any) => d.rostered || d.code || d.extras.length).map((d: any) => (
              <div key={d.date} className={`flex flex-wrap items-center gap-3 px-4 py-2.5 ${d.date === today ? 'bg-emerald-50' : ''}`}>
                <div className="w-28 text-sm font-semibold">{new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                <div className="w-24">{d.rostered && <Chip tone={SHIFT_TONE[d.rostered]}>{shiftName(d.rostered)}</Chip>}</div>
                <div className="flex-1 text-sm flex flex-wrap gap-2 items-center">
                  {d.is_gh && <Chip tone="orange">GH</Chip>}
                  {d.code && d.code !== 'O' && <span><b>{d.code}</b>{d.hours && Number(d.hours) > 0 ? ` ${num(d.hours)}h` : ''}</span>}
                  {d.extras.map((x: any, i: number) => <Chip key={i} tone="orange">+{num(x.hours)}h {x.kind}</Chip>)}
                  {!d.code && d.date > today && <span className="text-slate-400">Coming up</span>}
                </div>
                <div className="text-xs text-slate-500">{d.status === 'locked' ? 'Locked ✓' : d.status ? 'Being marked' : ''}</div>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  )
}
