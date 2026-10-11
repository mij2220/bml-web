import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { shiftsApi, errMsg, monthNow, todayIso, num, type Section } from '../../api/shifts'
import { Card, Chip, Spinner, Empty, Note, MonthPicker, SectionPicker, useSection, setTitle } from '../../components/shifts/ui'

/** Every day of a month and how far it has got: the review queue. */
export default function SheetsPage() {
  const nav = useNavigate()
  const [sections, setSections] = useState<Section[] | null>(null)
  const [sectionId, setSectionId] = useSection(sections)
  const [month, setMonth] = useState(monthNow())
  const [data, setData] = useState<{ days: any[]; month_closed: boolean } | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => { setTitle('Days') ; shiftsApi.sections('attendance', 'view').then(setSections).catch(e => setErr(errMsg(e))) }, [])
  useEffect(() => {
    if (!sectionId) return
    let live = true
    setData(null)
    shiftsApi.sheets(sectionId, month).then(d => live && setData(d)).catch(e => live && setErr(errMsg(e)))
    return () => { live = false }
  }, [sectionId, month])

  if (err) return <Note kind="error">{err}</Note>
  if (sections && !sections.length) return <Empty>You have not been given a section.</Empty>
  const today = todayIso()
  const days = (data?.days ?? []).filter(d => d.date <= today || d.status !== 'not_started')
  const counts = (data?.days ?? []).reduce((a: Record<string, number>, d: any) => { a[d.status] = (a[d.status] ?? 0) + 1; return a }, {})

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionPicker sections={sections ?? []} value={sectionId} onChange={setSectionId} />
        <MonthPicker value={month} onChange={setMonth} />
      </div>
      {data?.month_closed && <Note kind="lock">Accounts has closed this month.</Note>}
      {data && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Chip tone="green">{counts.locked ?? 0} locked</Chip>
          <Chip tone="blue">{counts.reviewed ?? 0} reviewed, waiting for lock</Chip>
          <Chip tone="amber">{counts.open ?? 0} being marked</Chip>
        </div>
      )}
      {!data ? <Spinner /> : days.length === 0 ? <Empty>No days yet in this month.</Empty> : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {days.map(d => (
            <button key={d.date} onClick={() => nav(`/attendance/sheet?date=${d.date}&section=${sectionId}`)}
              className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
              <div className="w-40 font-semibold text-slate-900">{new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
              <div className="flex-1 flex flex-wrap gap-2 items-center text-sm">
                {d.status === 'locked' && <Chip tone="green">Locked</Chip>}
                {d.status === 'reviewed' && <Chip tone="blue">Reviewed</Chip>}
                {d.status === 'open' && <Chip tone="amber">{d.submitted} of {d.shifts} shifts submitted</Chip>}
                {d.status === 'not_started' && <Chip>Not started</Chip>}
                {d.sent_back > 0 && <Chip tone="red">{d.sent_back} sent back</Chip>}
                {d.pending_corrections > 0 && <Chip tone="orange">{d.pending_corrections} correction(s)</Chip>}
              </div>
              <div className="text-sm text-slate-500 tabular-nums">{num(d.extra_hours)} extra hours</div>
            </button>
          ))}
        </Card>
      )}
    </div>
  )
}
