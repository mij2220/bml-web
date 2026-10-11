import { useEffect, useState } from 'react'
import { shiftsAdmin, errMsg } from '../../api/shifts'
import { getLeaveTypes } from '../../api/leaves'
import { Card, Btn, Spinner, Note, setTitle, Toast } from '../../components/shifts/ui'

const RULES: { k: string; label: string; unit: string }[] = [
  { k: 'hourly_divisor', label: 'Hourly rate = monthly gross divided by', unit: '' },
  { k: 'crew_week_hours', label: 'Crew week complete at', unit: 'hours' },
  { k: 'normal_day_first_hours_single', label: 'Normal working day: first hours at single rate', unit: 'hours' },
  { k: 'second_off_single_hours', label: 'Second day off: first hours at single rate', unit: 'hours' },
  { k: 'callout_short_max_hours', label: 'Short call-out: up to', unit: 'hours' },
  { k: 'callout_short_paid_hours', label: 'Short call-out counts as', unit: 'hours single' },
  { k: 'callout_gh_short_below_hours', label: 'Call-out on GH: short when under', unit: 'hours' },
  { k: 'callout_gh_short_paid_hours', label: 'Short call-out on GH counts as', unit: 'hours single' },
  { k: 'evening_premium_percent', label: 'Evening shift premium', unit: '% of hourly rate' },
  { k: 'night_premium_percent', label: 'Night shift premium', unit: '% of hourly rate' },
]
const LEAVE_CODES = ['V', 'C', 'S', 'CD', 'BD', 'L']

export default function ModuleSettingsPage() {
  const [s, setS] = useState<any>(null)
  const [rules, setRules] = useState<Record<string, any>>({})
  const [map, setMap] = useState<Record<string, string>>({})
  const [types, setTypes] = useState<any[]>([])
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    setTitle('Overtime and attendance settings')
    shiftsAdmin.settings().then(x => { setS(x); setRules(x.rules); setMap(x.leave_code_map ?? {}) }).catch(e => setToast(errMsg(e)))
    getLeaveTypes().then((r: any) => setTypes(r.data.data ?? [])).catch(() => {})
  }, [])
  const save = async () => {
    try { const x = await shiftsAdmin.saveSettings({ ot_rules: rules, leave_code_map: map }); setS(x); setRules(x.rules); setToast('Saved') } catch (e) { setToast(errMsg(e)) }
  }
  if (!s) return <Spinner />
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Note kind="warn">These follow the overtime SOP with the assumptions in the design note (A-11 to A-20), until Engro confirms them. A change applies to every statement worked out afterwards, including months already locked but not closed.</Note>
      <Card className="p-4 space-y-3">
        <h3 className="font-bold">Overtime rules</h3>
        {RULES.map(r => (
          <label key={r.k} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="flex-1 min-w-[240px]">{r.label}</span>
            <input type="number" step={0.5} min={0} className="border border-slate-300 rounded-lg px-2 min-h-[36px] w-24 text-right" value={rules[r.k] ?? ''} onChange={e => setRules({ ...rules, [r.k]: e.target.value })} />
            <span className="w-32 text-slate-500">{r.unit}</span>
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm min-h-[40px]"><input type="checkbox" className="w-5 h-5" checked={!!rules.premium_on_overtime} onChange={e => setRules({ ...rules, premium_on_overtime: e.target.checked })} /> Shift premium also on overtime hours worked in evening and night shifts</label>
        <p className="text-xs text-slate-500">Fixed by the SOP: first day off all double; gazetted holiday all triple; crew week complete all double. Annual leave, CD and GH count toward the crew week.</p>
      </Card>
      <Card className="p-4 space-y-3">
        <h3 className="font-bold">Leave types on the daily sheet</h3>
        <p className="text-sm text-slate-600">Approved leave fills the sheet with this code.</p>
        {types.length === 0 && <p className="text-sm text-slate-500">Leave types could not be loaded.</p>}
        {types.map(t => {
          const def = ({ AL: 'V', CL: 'C', SL: 'S', CD: 'CD', BD: 'BD', UL: 'L' } as Record<string, string>)[t.code] ?? 'V'
          return (
            <label key={t.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1">{t.name} <span className="text-slate-500">({t.code})</span></span>
              <select className="border border-slate-300 rounded-lg px-2 min-h-[36px]" value={map[t.code] ?? def} onChange={e => setMap({ ...map, [t.code]: e.target.value })}>
                {LEAVE_CODES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          )
        })}
      </Card>
      <Btn kind="primary" onClick={save}>Save settings</Btn>
      <Toast msg={toast} onDone={() => setToast(null)} />
    </div>
  )
}
