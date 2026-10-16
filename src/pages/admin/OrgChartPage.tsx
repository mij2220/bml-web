import { useEffect, useState } from 'react'
import api from '../../api/client'

interface Person { id: string; name: string; p_number: string; designation: string; unit_role: string; has_login: boolean; shared: boolean; covers_from?: string }
interface Unit { id: string; name: string; managers: Person[]; sics: Person[]; supervisors: Person[]; staff: Person[]; total: number }

const TIER = [
  ['managers', 'Unit Manager', 'bg-purple-50 border-purple-300 text-purple-800'],
  ['sics', 'Shift In-Charge (SIC)', 'bg-sky-50 border-sky-300 text-sky-800'],
  ['supervisors', 'Shift Supervisors / Engineers', 'bg-amber-50 border-amber-300 text-amber-800'],
] as const

function Card({ p, tone }: { p: Person; tone: string }) {
  const initials = p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className={`rounded-xl border-2 ${tone} p-2.5 w-40 text-center`}>
      <div className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center font-bold text-sm mx-auto mb-1">{initials}</div>
      <p className="text-xs font-semibold text-slate-800 leading-tight">{p.name}</p>
      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{p.designation}</p>
      <p className="text-[10px] text-slate-400">{p.p_number}{p.covers_from ? ` · from ${p.covers_from}` : ''}</p>
    </div>
  )
}

/** Org chart by unit (Engro, 15-16 Oct 2026): Unit Manager > SICs > Shift
 *  Supervisors / Engineers > staff. Places come from each employee record or
 *  from loading the organogram (Employees > Load organogram). */
export default function OrgChartPage() {
  const [units, setUnits] = useState<Unit[] | null>(null)
  const [unitApproval, setUnitApproval] = useState(false)
  const [sel, setSel] = useState('')
  const [showStaff, setShowStaff] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    const el = document.getElementById('page-title'); if (el) el.textContent = 'Org Chart'
    api.get('/org-chart/').then(r => {
      const u: Unit[] = r.data.data.units
      setUnits(u); setUnitApproval(!!r.data.data.unit_approval); setSel(u[0]?.id ?? '')
    }).catch(e => setErr(e.response?.data?.message ?? 'Could not load the org chart.'))
  }, [])

  if (err) return <p className="text-sm text-red-600 p-4">{err}</p>
  if (!units) return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!units.length) return <p className="text-sm text-slate-500 p-4">No units with staff yet.</p>
  const u = units.find(x => x.id === sel) ?? units[0]
  const noPlaces = !u.managers.length && !u.sics.length && !u.supervisors.length

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap gap-2">
        {units.map(x => (
          <button key={x.id} onClick={() => setSel(x.id)}
            className={`px-3 py-1.5 rounded-full text-sm border ${x.id === u.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-300 text-slate-700'}`}>
            {x.name} <span className="opacity-70">({x.total})</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        {unitApproval
          ? 'Unit-based approval is on: a request goes to any Shift Supervisor of the unit, then any SIC; Unpaid Leave then to the Unit Manager.'
          : 'Unit-based approval is off: each person\'s own Supervisor and SIC approve (switch on Admin > Leave Types).'}
      </p>
      {noPlaces && <div className="text-sm bg-amber-50 text-amber-800 rounded-xl p-3">Nobody in {u.name} is marked as Unit Manager, SIC or Supervisor yet. Set it in each employee record, or load the organogram from Employees.</div>}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-5">
        {TIER.map(([key, label, tone]) => {
          const people = u[key] as Person[]
          if (!people.length) return null
          return (
            <div key={key}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{label} · {people.length}</p>
              <div className="flex flex-wrap gap-2">{people.map(p => <Card key={p.id} p={p} tone={tone} />)}</div>
            </div>
          )
        })}
        <div>
          <button onClick={() => setShowStaff(!showStaff)} className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Staff / operators · {u.staff.length} {showStaff ? '▾' : '▸'}
          </button>
          {showStaff && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
              {u.staff.map(p => (
                <div key={p.id} className="border border-slate-200 rounded-lg px-2 py-1.5">
                  <p className="text-xs font-medium text-slate-800 truncate">{p.name}</p>
                  <p className="text-[10px] text-slate-400">{p.p_number}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
