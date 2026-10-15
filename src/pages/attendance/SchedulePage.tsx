import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { shiftsApi, errMsg, todayIso, addDays, shiftName } from '../../api/shifts'
import { Card, Spinner, Empty, Note, Btn, Chip, SHIFT_TONE, setTitle, inputCls } from '../../components/shifts/ui'

const CELL: Record<string, string> = {
  M: 'bg-amber-100 text-amber-900', E: 'bg-blue-100 text-blue-900', N: 'bg-violet-200 text-violet-900',
  G: 'bg-emerald-100 text-emerald-900', O: 'bg-slate-100 text-slate-400',
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** The shift rota (Engro's "Production Department Shift Schedule"): which group is on
 *  which shift on every day of the year, and who is on shift on a chosen day. */
export default function SchedulePage() {
  const [sections, setSections] = useState<{ id: string; name: string }[] | null>(null)
  const [sectionId, setSectionId] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<any>(null)
  const [day, setDay] = useState(todayIso())
  const [duty, setDuty] = useState<any>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setTitle('Shift schedule')
    shiftsApi.scheduleSections().then(s => { setSections(s); setSectionId(s[0]?.id ?? '') }).catch(e => setErr(errMsg(e)))
  }, [])
  const req = useRef(0)
  useEffect(() => {
    if (!sectionId) return
    const n = ++req.current
    setData(null)
    shiftsApi.schedule(sectionId, year).then(d => n === req.current && setData(d)).catch(e => setErr(errMsg(e)))
  }, [sectionId, year])
  const req2 = useRef(0)
  useEffect(() => {
    if (!sectionId || !day) return
    const n = ++req2.current
    setDuty(null)
    shiftsApi.onDuty(sectionId, day).then(d => n === req2.current && setDuty(d)).catch(() => {})
  }, [sectionId, day])

  const gh = useMemo(() => new Set<string>(data?.gh ?? []), [data])
  const today = todayIso()

  const exportXlsx = async () => {
    setBusy(true)
    try { await shiftsApi.downloadFile('/shifts/schedule/', { section: sectionId, year, export: 'xlsx' }, `shift-schedule-${year}.xlsx`) }
    catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  if (err) return <Note kind="error">{err}</Note>
  if (sections && !sections.length) return <Empty>No shift sections are set up yet.</Empty>
  if (!sections) return <Spinner />

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {sections.length > 1
          ? <select value={sectionId} onChange={e => setSectionId(e.target.value)} aria-label="Section" className="text-sm border border-slate-300 rounded-lg px-3 min-h-[40px] bg-white">
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          : <span className="text-sm font-semibold text-slate-700">{sections[0]?.name}</span>}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded-lg">
            <button className="p-2 hover:bg-slate-50 rounded-l-lg" onClick={() => setYear(year - 1)} aria-label="Previous year"><ChevronLeft size={16} /></button>
            <span className="text-sm font-semibold px-2">{year}</span>
            <button className="p-2 hover:bg-slate-50 rounded-r-lg" onClick={() => setYear(year + 1)} aria-label="Next year"><ChevronRight size={16} /></button>
          </div>
          <Btn onClick={exportXlsx} disabled={busy || !data}><Download size={15} className="inline mr-1" />Excel</Btn>
        </div>
      </div>

      {/* Who is on shift on a day */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-slate-800 mr-2">On shift</h3>
          <button className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setDay(addDays(day, -1))} aria-label="Previous day"><ChevronLeft size={16} /></button>
          <input type="date" className={inputCls + ' max-w-[170px]'} value={day} onChange={e => e.target.value && setDay(e.target.value)} />
          <button className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setDay(addDays(day, 1))} aria-label="Next day"><ChevronRight size={16} /></button>
          {day !== today && <Btn onClick={() => setDay(today)}>Today</Btn>}
          {duty?.is_gh && <Chip tone="red">Gazetted holiday</Chip>}
        </div>
        {!duty ? <Spinner /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {duty.shifts.map((s: any) => (
              <div key={s.code} className="border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <Chip tone={SHIFT_TONE[s.code] ?? 'slate'}>{s.name}</Chip>
                  <span className="text-xs text-slate-500">{s.start && `${s.start}–${s.end}`}</span>
                </div>
                {s.groups.length === 0 ? <p className="text-xs text-slate-400">Nobody rostered</p> : s.groups.map((g: any) => (
                  <div key={g.group} className="mt-2">
                    <div className="text-xs font-semibold text-slate-600">Group {g.group} · {g.people.length}</div>
                    {s.code !== 'O' && (
                      <ul className="text-xs text-slate-700 mt-1 space-y-0.5">
                        {g.people.map((p: any) => <li key={p.employee_id}>{p.name}{p.trainee ? ' (trainee)' : ''}{p.post ? <span className="text-slate-400"> · {p.post}</span> : null}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* The year */}
      {!data ? <Spinner /> : data.rows.length === 0 ? <Empty>This section has no groups yet.</Empty> : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            {Object.entries({ M: 'Morning', E: 'Evening', N: 'Night', G: 'General', O: 'Off' }).map(([c, n]) => (
              <span key={c} className={`inline-block rounded px-1.5 py-0.5 mr-1 font-bold ${CELL[c]}`}>{c} {n}</span>
            ))}
            <span className="ml-2 text-red-600 font-semibold">Red date</span> = gazetted holiday
          </p>
          {MONTHS.map((mName, m) => {
            const first = new Date(year, m, 1)
            const days = new Date(year, m + 1, 0).getDate()
            const offset = Math.round((first.getTime() - new Date(year, 0, 1).getTime()) / 86400000)
            return (
              <Card key={m} className="p-3 overflow-x-auto">
                <div className="text-sm font-semibold text-slate-700 mb-1">{mName} {year}</div>
                <table className="border-separate border-spacing-0.5 text-[11px]">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-white pr-2 text-left text-slate-500">Group</th>
                      {Array.from({ length: days }, (_, i) => {
                        const iso = `${year}-${String(m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
                        return <th key={i} className={`w-6 text-center font-semibold ${gh.has(iso) ? 'text-red-600' : 'text-slate-500'} ${iso === today ? 'underline' : ''}`}>{i + 1}</th>
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r: any) => (
                      <tr key={r.group_id}>
                        <td className="sticky left-0 bg-white pr-2 font-semibold text-slate-700">{r.group}</td>
                        {Array.from({ length: days }, (_, i) => {
                          const c = r.shifts[offset + i]
                          return <td key={i} title={shiftName(c)} className={`w-6 h-6 text-center rounded font-bold ${CELL[c] ?? ''}`}>{c}</td>
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
