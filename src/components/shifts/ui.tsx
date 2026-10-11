import { useEffect, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { addMonths, fmtMonth, type Section } from '../../api/shifts'

export function setTitle(t: string) {
  const el = document.getElementById('page-title')
  if (el) el.textContent = t
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`bg-white rounded-2xl border border-slate-200 ${className}`}>{children}</section>
}

type BtnKind = 'primary' | 'plain' | 'danger' | 'link'
export function Btn({ kind = 'plain', className = '', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: BtnKind }) {
  const k = {
    primary: 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500',
    plain: 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300',
    danger: 'bg-white hover:bg-red-50 text-red-600 border-red-200',
    link: 'bg-transparent border-transparent text-emerald-700 hover:underline px-1',
  }[kind]
  return <button {...p} className={`inline-flex items-center justify-center gap-1.5 text-sm font-semibold px-3.5 min-h-[40px] rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${k} ${className}`} />
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center h-40" role="status" aria-label="Loading">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <Card className="p-8 text-center text-slate-500 text-sm">{children}</Card>
}

export function Note({ kind = 'info', children }: { kind?: 'info' | 'warn' | 'error' | 'lock'; children: ReactNode }) {
  const c = {
    info: 'bg-emerald-50 border-emerald-500 text-slate-800',
    warn: 'bg-amber-50 border-amber-500 text-slate-800',
    error: 'bg-red-50 border-red-500 text-red-800',
    lock: 'bg-slate-800 border-slate-800 text-white',
  }[kind]
  return <div className={`border-l-4 rounded-lg px-4 py-3 text-sm ${c}`} role={kind === 'error' ? 'alert' : undefined}>{children}</div>
}

export function Chip({ tone = 'slate', children }: { tone?: string; children: ReactNode }) {
  const c: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700', green: 'bg-emerald-100 text-emerald-800', blue: 'bg-blue-100 text-blue-800',
    amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-700', purple: 'bg-violet-100 text-violet-800',
    orange: 'bg-orange-100 text-orange-800',
  }
  return <span className={`inline-flex items-center text-xs font-semibold rounded-full px-2 py-0.5 whitespace-nowrap ${c[tone] ?? c.slate}`}>{children}</span>
}

export const SHIFT_TONE: Record<string, string> = { M: 'amber', E: 'blue', N: 'purple', G: 'green', O: 'slate' }

export function Tile({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  const t: Record<string, string> = { green: 'text-emerald-700', blue: 'text-blue-700', red: 'text-red-600', orange: 'text-orange-600' }
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 min-w-0">
      <div className="text-xs text-slate-500 truncate">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${tone ? t[tone] ?? '' : 'text-slate-900'}`}>{value}</div>
    </div>
  )
}

export function MonthPicker({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  return (
    <div className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded-lg">
      <button className="p-2 hover:bg-slate-50 rounded-l-lg" onClick={() => onChange(addMonths(value, -1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
      <span className="text-sm font-semibold px-1 min-w-[120px] text-center">{fmtMonth(value)}</span>
      <button className="p-2 hover:bg-slate-50 rounded-r-lg" onClick={() => onChange(addMonths(value, 1))} aria-label="Next month"><ChevronRight size={16} /></button>
    </div>
  )
}

export function SectionPicker({ sections, value, onChange }: { sections: Section[]; value: string; onChange: (id: string) => void }) {
  if (sections.length <= 1) {
    return sections[0] ? <span className="text-sm font-semibold text-slate-700">{sections[0].department_name}, {sections[0].name}</span> : null
  }
  return (
    <select value={value} onChange={e => onChange(e.target.value)} aria-label="Section"
      className="text-sm border border-slate-300 rounded-lg px-3 min-h-[40px] bg-white">
      {sections.map(s => <option key={s.id} value={s.id}>{s.department_name}, {s.name}</option>)}
    </select>
  )
}

/** Remembers the chosen section between screens (per browser). */
export function useSection(sections: Section[] | null) {
  const KEY = 'sl_section'
  const [id, setId] = useState<string>(() => { try { return localStorage.getItem(KEY) ?? '' } catch { return '' } })
  useEffect(() => {
    if (sections && sections.length && !sections.some(s => s.id === id)) setId(sections[0].id)
  }, [sections])
  const set = (v: string) => { setId(v); try { localStorage.setItem(KEY, v) } catch {} }
  return [sections?.find(s => s.id === id) ? id : (sections?.[0]?.id ?? ''), set] as const
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-end sm:items-center justify-center sm:p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`bg-white w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col`}>
        <header className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
        </header>
        <div className="px-5 py-4 overflow-y-auto space-y-3">{children}</div>
        {footer && <footer className="px-5 py-3 border-t border-slate-100 flex flex-wrap justify-end gap-2">{footer}</footer>}
      </div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500 mt-1">{hint}</span>}
    </label>
  )
}

export const inputCls = 'w-full border border-slate-300 rounded-lg px-3 min-h-[40px] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500'

/** Shared control-room login: the acting person signs with name and P.No. */
export function SignatureFields({ value, onChange }: { value: { signer_name: string; signer_p_number: string }; onChange: (v: { signer_name: string; signer_p_number: string }) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
      <p className="sm:col-span-2 text-sm text-amber-900">This login is shared. Enter your own name and P.No.</p>
      <Field label="Your name"><input className={inputCls} value={value.signer_name} onChange={e => onChange({ ...value, signer_name: e.target.value })} /></Field>
      <Field label="Your P.No."><input className={inputCls} inputMode="numeric" value={value.signer_p_number} onChange={e => onChange({ ...value, signer_p_number: e.target.value })} /></Field>
    </div>
  )
}

export function Toast({ msg, onDone }: { msg: string | null; onDone: () => void }) {
  useEffect(() => { if (msg) { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) } }, [msg])
  if (!msg) return null
  return <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50" role="status">{msg}</div>
}
