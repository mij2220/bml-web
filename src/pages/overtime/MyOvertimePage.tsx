import { useEffect, useState } from 'react'
import { shiftsApi, errMsg, monthNow, num, fmtMonth, type StatementRow, type StatementSummary } from '../../api/shifts'
import { Card, Spinner, Empty, Note, MonthPicker, Tile, setTitle } from '../../components/shifts/ui'
import { DayBreakdown } from './StatementPage'

export default function MyOvertimePage() {
  const [month, setMonth] = useState(monthNow())
  const [data, setData] = useState<{ summary: StatementSummary | null; row: StatementRow | null } | null>(null)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState(false)
  useEffect(() => { setTitle('My overtime') }, [])
  useEffect(() => {
    let live = true
    setData(null); shiftsApi.myOvertime(month).then(d => live && setData(d)).catch(e => live && setErr(errMsg(e)))
    return () => { live = false }
  }, [month])
  if (err) return <Note kind="error">{err}</Note>
  const r = data?.row
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">My overtime</h2>
        <MonthPicker value={month} onChange={setMonth} />
      </div>
      {!data ? <Spinner /> : !r ? <Empty>No locked overtime in {fmtMonth(month)}.</Empty> : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Tile label="Extra hours worked" value={num(r.ot_total)} tone="orange" />
            <Tile label="Single-rate hours" value={num(r.single)} />
            <Tile label="Double-rate hours" value={num(r.double)} />
            <Tile label="Triple-rate hours" value={num(r.triple)} />
            <Tile label="Equivalent single hours" value={num(r.equivalent_single)} tone="green" />
            <Tile label="Evening premium hours" value={num(r.evening_hours)} />
            <Tile label="Night premium hours" value={num(r.night_hours)} />
            <Tile label="Days counted" value={data.summary?.locked_days ?? 0} />
          </div>
          <Card className="p-4 text-sm text-slate-600 space-y-2">
            <p>Counted from days the Unit Manager has locked. The amount is worked out by payroll from these hours.{r.provisional ? ' Part of a crew week is not locked yet, so the split may still change.' : ''}</p>
            <button className="text-emerald-700 font-semibold hover:underline" onClick={async () => {
              const full = await shiftsApi.myOvertime(month); if (full.row) { setData(full); setOpen(true) }
            }}>See day by day</button>
          </Card>
        </>
      )}
      {open && r && <DayBreakdown row={r} onClose={() => setOpen(false)} />}
    </div>
  )
}
