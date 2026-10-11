import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { shiftsAdmin, errMsg } from '../../api/shifts'
import { Card, Btn, Chip, Spinner, Note, Field, inputCls, setTitle, Toast } from '../../components/shifts/ui'

/** Gazetted holidays (A-16). Worked hours on these days are paid at triple rate. */
export default function GazettedHolidaysPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [rows, setRows] = useState<any[] | null>(null)
  const [f, setF] = useState({ date: '', name: '' })
  const [toast, setToast] = useState<string | null>(null)
  const load = () => shiftsAdmin.holidays(year).then(setRows).catch(e => setToast(errMsg(e)))
  useEffect(() => { setTitle('Gazetted holidays') }, [])
  useEffect(() => { setRows(null); load() }, [year])
  const add = async () => { try { await shiftsAdmin.addHoliday(f); setF({ date: '', name: '' }); setToast('Holiday added'); load() } catch (e) { setToast(errMsg(e)) } }
  const remove = async (id: string) => { try { await shiftsAdmin.removeHoliday(id); setToast('Removed'); load() } catch (e) { setToast(errMsg(e)) } }
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Note>Gazetted holidays drive the overtime rules: hours worked on these days count at triple rate, and a call-out under 4 hours counts as 12 hours. Changes apply to days not yet locked and to every statement worked out afterwards.</Note>
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setYear(year - 1)} aria-label="Previous year"><ChevronLeft size={18} /></button>
        <h2 className="text-lg font-bold">{year}</h2>
        <button className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setYear(year + 1)} aria-label="Next year"><ChevronRight size={18} /></button>
      </div>
      <Card className="p-4 grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-3 items-end">
        <Field label="Date"><input type="date" className={inputCls} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Holiday"><input className={inputCls} value={f.name} placeholder="e.g. Pakistan Day" onChange={e => setF({ ...f, name: e.target.value })} /></Field>
        <Btn kind="primary" disabled={!f.date || !f.name} onClick={add}>Add</Btn>
      </Card>
      {!rows ? <Spinner /> : rows.length === 0 ? <Card className="p-6 text-sm text-slate-500">No holidays for {year} yet.</Card> : (
        <Card className="divide-y divide-slate-100">
          {rows.map(h => (
            <div key={h.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-40 font-semibold">{new Date(h.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              <span className="flex-1">{h.name}</span>
              {h.counts_as_gh ? <Chip tone="orange">GH</Chip> : <Chip>{h.is_optional ? 'Optional' : 'Other calendar'}</Chip>}
              <button aria-label={`Remove ${h.name}`} className="p-2 rounded-lg hover:bg-red-50 text-red-600" onClick={() => remove(h.id)}><Trash2 size={15} /></button>
            </div>
          ))}
        </Card>
      )}
      <Toast msg={toast} onDone={() => setToast(null)} />
    </div>
  )
}
