import { useEffect, useRef, useState } from 'react'
import { shiftsApi, shiftsAdmin, errMsg, monthNow, todayIso, shiftName, type Section } from '../../api/shifts'
import { Card, Spinner, Empty, Note, MonthPicker, SectionPicker, useSection, setTitle, Modal, Btn, Toast } from '../../components/shifts/ui'
import { useModules } from '../../hooks/useModules'

const CELL: Record<string, string> = {
  M: 'bg-amber-100 text-amber-900', E: 'bg-blue-100 text-blue-900', N: 'bg-violet-200 text-violet-900',
  G: 'bg-emerald-100 text-emerald-900', O: 'bg-slate-100 text-slate-400',
}

export default function RosterPage() {
  const { isAdmin } = useModules()
  const [sections, setSections] = useState<Section[] | null>(null)
  const [sectionId, setSectionId] = useSection(sections)
  const [month, setMonth] = useState(monthNow())
  const [grid, setGrid] = useState<any>(null)
  const [err, setErr] = useState('')
  const [edit, setEdit] = useState<{ group_id: string; group: string; date: string; shift: string; override: boolean } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { setTitle('Roster'); shiftsApi.sections('attendance', 'view').then(setSections).catch(e => setErr(errMsg(e))) }, [])
  const req = useRef(0)
  const load = () => {
    if (!sectionId) return
    const n = ++req.current
    shiftsApi.roster(sectionId, month).then(g => n === req.current && setGrid(g)).catch(e => setErr(errMsg(e)))
  }
  useEffect(() => { setGrid(null); load() }, [sectionId, month])

  const save = async (shift: string | null) => {
    if (!edit) return
    try {
      await shiftsAdmin.overrides.create(shift ? { group: edit.group_id, date: edit.date, shift_code: shift } : { group: edit.group_id, date: edit.date, clear: true })
      setToast(shift ? 'Roster changed for that day' : 'Back to the rotation'); setEdit(null); load()
    } catch (e) { setToast(errMsg(e)) }
  }

  if (err) return <Note kind="error">{err}</Note>
  if (sections && !sections.length) return <Empty>You have not been given a section.</Empty>
  const today = todayIso()
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionPicker sections={sections ?? []} value={sectionId} onChange={setSectionId} />
        <MonthPicker value={month} onChange={setMonth} />
      </div>
      {!grid ? <Spinner /> : (
        <>
          <Card className="p-4">
            <div className="text-sm text-slate-600 mb-2">Rotation (repeats): {grid.pattern.map((c: string, i: number) => <span key={i} className={`inline-block text-xs font-bold rounded px-1.5 py-0.5 mr-1 ${CELL[c]}`}>{c === 'O' ? 'Off' : c}</span>)}</div>
            {grid.problem_days.length > 0
              ? <Note kind="warn"><b>{grid.problem_days.length} day(s) need attention:</b> each day should have one group on Morning, Evening and Night.</Note>
              : <Note>Roster is complete: every day has one group on each shift.</Note>}
          </Card>
          <Card className="p-3 overflow-x-auto">
            <table className="border-separate border-spacing-0.5 text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white text-left pr-2 font-semibold text-slate-500">Group</th>
                  {grid.rows[0]?.cells.map((c: any) => {
                    const d = new Date(c.date + 'T00:00:00')
                    const gh = grid.gh.includes(c.date)
                    return <th key={c.date} className={`w-8 font-normal ${c.date === today ? 'text-emerald-700 font-bold' : 'text-slate-500'} ${gh ? 'text-orange-600' : ''}`}>
                      {d.toLocaleDateString('en-GB', { weekday: 'narrow' })}<br /><b>{d.getDate()}</b>{gh && <><br />GH</>}</th>
                  })}
                </tr>
              </thead>
              <tbody>
                {grid.rows.map((r: any) => (
                  <tr key={r.group_id}>
                    <th className="sticky left-0 bg-white text-left pr-2 font-semibold whitespace-nowrap">Group {r.group}</th>
                    {r.cells.map((c: any) => (
                      <td key={c.date}>
                        <button disabled={!isAdmin} onClick={() => setEdit({ group_id: r.group_id, group: r.group, date: c.date, shift: c.shift, override: c.override })}
                          title={`Group ${r.group}, ${c.date}: ${shiftName(c.shift)}${c.off_kind ? ` (${c.off_kind === 'FO' ? 'first' : 'second'} day off)` : ''}${c.override ? ', changed by hand' : ''}`}
                          className={`w-8 h-8 rounded font-bold ${CELL[c.shift] ?? ''} ${c.override ? 'ring-2 ring-orange-500' : ''} ${grid.problem_days.includes(c.date) ? 'outline outline-2 outline-red-500' : ''} disabled:cursor-default`}>
                          {c.shift === 'O' ? (c.off_kind === 'FO' ? 'FO' : c.off_kind === 'SO' ? 'SO' : '·') : c.shift}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-500 mt-2">M Morning, E Evening, N Night, FO first day off, SO second day off. An orange ring means the day was changed by hand.{isAdmin ? ' Select a cell to change it.' : ''}</p>
          </Card>
        </>
      )}
      {edit && (
        <Modal title={`Group ${edit.group}, ${new Date(edit.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`} onClose={() => setEdit(null)}
          footer={<>{edit.override && <Btn onClick={() => save(null)}>Back to the rotation</Btn>}<Btn onClick={() => setEdit(null)}>Cancel</Btn></>}>
          <p className="text-sm text-slate-600">Choose the shift this group works on this day. Sheets already started for the day are updated for people not changed by hand.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['M', 'E', 'N', 'O'].map(s => <Btn key={s} kind={s === edit.shift ? 'primary' : 'plain'} onClick={() => save(s)}>{shiftName(s)}</Btn>)}
          </div>
        </Modal>
      )}
      <Toast msg={toast} onDone={() => setToast(null)} />
    </div>
  )
}
