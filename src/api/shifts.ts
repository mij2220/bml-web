import client from './client'

/* Attendance + Overtime modules (ShiftLedger). Server: apps/shifts. */

export type ShiftCode = 'M' | 'E' | 'N' | 'G' | 'O'

export interface CodeInfo { code: string; label: string; kind: 'present' | 'off' | 'leave' | 'holiday' | 'absent'; counts_48: boolean }

export interface ShiftsMeta {
  codes: CodeInfo[]
  roster_codes: { code: ShiftCode; label: string }[]
  extra_kinds: { code: string; label: string }[]
  extra_reasons: string[]
  attendance: Record<string, 'all' | string[]>
  overtime: Record<string, 'all' | string[]>
  is_admin: boolean
  is_shared_account: boolean
  my_section: { id: string; name: string; group: string } | null
  today: string
}

export interface ShiftType { id: string; section: string; code: string; sheet_code: string; name: string; start_time: string; end_time: string; hours: string; premium: string; order: number; min_staff?: number }
export interface ShiftGroup { id: string; section: string; name: string; offset: number; order: number; member_count: number }
export interface Post { id: string; section: string; code: string; name: string; order: number }
export interface Section {
  id: string; department: string; department_name: string; name: string; code: string
  pattern: string; pattern_anchor: string; print_title: string; is_active: boolean
  shift_types: ShiftType[]; groups: ShiftGroup[]; posts: Post[]
}

export interface Entry {
  id: string; employee_id: string; name: string; p_number: string; group: string; group_id: string | null
  post: string; is_trainee: boolean; shift_code: ShiftCode; code: string; code_label: string; hours: string
  note: string; source: string; no_leave_application: boolean; leave_reference: string | null
}
export interface Extra {
  id: string; employee_id: string; name: string; p_number: string; shift_code: string; hours: string
  kind: string; reason: string; covering_id: string | null; covering_name: string | null; remarks: string
}
export interface Correction {
  id: string; sheet_id: string; date: string; section: string; section_id: string; employee_id: string; name: string; p_number: string
  kind: string; kind_label: string; requested: Record<string, any>; previous: Record<string, any>
  reason: string; status: 'pending' | 'approved' | 'rejected'; requested_by: string | null; requested_at: string
  decided_by: string | null; decided_at: string | null; decision_note: string
}
export interface SheetShift {
  code: string; name: string; sheet_code: string; start: string; end: string; hours: string; groups: string[]
  counts: { rostered: number; present: number; leave: number; absent: number; holiday: number; attendance_hours: string; extra_hours: string; covering?: number; min_staff?: number; short?: number }
  submission: { status: 'draft' | 'submitted' | 'sent_back'; by: string | null; at: string | null; remarks: string }
}
export interface Sheet {
  id: string; section_id: string; section: string; print_title: string; date: string; is_gh: boolean
  status: 'open' | 'reviewed' | 'locked'
  reviewed_by: string | null; reviewed_at: string | null; locked_by: string | null; locked_at: string | null
  shifts: SheetShift[]; off_groups: string[]; entries: Entry[]; extras: Extra[]; corrections: Correction[]
  permissions: { mark: boolean; review: boolean; lock: boolean; reopen: boolean; request_correction: boolean; decide: boolean; print: boolean; month_closed: boolean }
}

export interface StatementRow {
  employee_id: string; name: string; p_number: string; group: string; post: string; trainee: boolean
  days_worked: number; attendance_hours: string; leave_days: number; leave_by_code: Record<string, number>
  absent_days: number; gh_days: number; ot_normal: string; ot_training: string; ot_callout: string; ot_total: string
  cover_shifts: number; single: string; double: string; triple: string; equivalent_single: string
  evening_hours: string; night_hours: string; provisional: boolean; alerts?: string[]
  days: { date: string; day_type: string; code: string; shift: string; hours: string; extra: string; single: string; double: string; triple: string }[]
}
export interface StatementSummary {
  section_id: string; section: string; year: number; month: number; days_in_month: number
  locked_days: number; days_due: number; closed: boolean; closed_by: string | null; closed_at: string | null
  rules?: Record<string, number | boolean>
}

const d = <T,>(p: Promise<any>) => p.then(r => r.data.data as T)

export const shiftsApi = {
  meta: () => d<ShiftsMeta>(client.get('/shifts/meta/')),
  sections: (module = 'attendance', action = 'view') => d<Section[]>(client.get('/shifts/sections/', { params: { module, action } })),
  roster: (section: string, month: string) => d<any>(client.get('/shifts/roster/', { params: { section, month } })),
  sheet: (section: string, date: string) => d<Sheet | null>(client.get('/shifts/sheet/', { params: { section, date } })),
  sheets: (section: string, month: string) => d<{ days: any[]; month_closed: boolean }>(client.get('/shifts/sheets/', { params: { section, month } })),
  setEntry: (id: string, body: { code?: string; note?: string }) => d<Sheet>(client.patch(`/shifts/entries/${id}/`, body)),
  addExtra: (sheet: string, body: any) => d<Sheet>(client.post(`/shifts/sheets/${sheet}/extras/`, body)),
  changeExtra: (id: string, body: any) => d<Sheet>(client.patch(`/shifts/extras/${id}/`, body)),
  removeExtra: (id: string) => d<Sheet>(client.delete(`/shifts/extras/${id}/`)),
  action: (sheet: string, action: string, body: any = {}) => d<Sheet>(client.post(`/shifts/sheets/${sheet}/${action}/`, body)),
  requestCorrection: (sheet: string, body: any) => d<Correction>(client.post(`/shifts/sheets/${sheet}/corrections/`, body)),
  corrections: (params: Record<string, string>) => d<Correction[]>(client.get('/shifts/corrections/', { params })),
  decide: (id: string, approve: boolean, note = '') => d<Correction>(client.post(`/shifts/corrections/${id}/decide/`, { approve, note })),
  my: (month: string) => d<any>(client.get('/shifts/my/', { params: { month } })),
  monthly: (section: string, month: string) => d<{ summary: StatementSummary; rows: StatementRow[] }>(client.get('/shifts/monthly/', { params: { section, month } })),
  statement: (section: string, month: string, detail = false) =>
    d<{ summary: StatementSummary; rows: StatementRow[] }>(client.get('/overtime/statement/', { params: { section, month, ...(detail ? { detail: '1' } : {}) } })),
  myOvertime: (month: string) => d<{ summary: StatementSummary | null; row: StatementRow | null }>(client.get('/overtime/my/', { params: { month } })),
  closeMonth: (section: string, month: string, reopen = false) => d<any>(client.post('/overtime/close-month/', { section, month, reopen })),
  scheduleSections: () => d<{ id: string; name: string; pattern: string[] }[]>(client.get('/shifts/schedule/sections/')),
  schedule: (section: string, year: number) => d<{ year: number; start: string; days: number; section: string; gh: string[]; rows: { group_id: string; group: string; shifts: string }[] }>(client.get('/shifts/schedule/', { params: { section, year } })),
  onDuty: (section: string, date: string) => d<{ section: string; date: string; is_gh: boolean; shifts: { code: string; name: string; start: string; end: string; groups: { group: string; people: { employee_id: string; name: string; p_number: string; post: string; trainee: boolean }[] }[] }[] }>(client.get('/shifts/on-duty/', { params: { section, date } })),
  cdDue: (section: string, month: string) => d<any[]>(client.get('/shifts/cd-due/', { params: { section, month } })),
  giveCd: (body: { section: string; employee_id: string; holiday_id: string; note?: string }) => client.post('/shifts/cd-due/', body).then(r => r.data),
  unplanned: (section: string, month: string) => d<any[]>(client.get('/shifts/unplanned-leave/', { params: { section, month } })),
  raiseLeave: (body: { section: string; employee_id: string; code: string; start: string; end: string; reason?: string }) => client.post('/shifts/unplanned-leave/', body).then(r => r.data),
  todo: () => d<{ sent_back: number; to_review: number; to_lock: number; corrections: number; cd_due: number; unplanned_leave: number; total: number }>(client.get('/shifts/todo/')),
  calculator: () => d<{ rules: Record<string, any>; examples: any[] }>(client.get('/overtime/calculator/')),
  calculate: (body: any) => d<any>(client.post('/overtime/calculator/', body)),
  downloadFile: async (path: string, params: Record<string, any>, filename: string) => {
    const r = await client.get(path, { params, responseType: 'blob' })
    const url = URL.createObjectURL(r.data)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
  download: async (path: string, params: Record<string, string>, filename: string) => {
    const r = await client.get(path, { params: { ...params, export: 'csv' }, responseType: 'blob' })
    const url = URL.createObjectURL(r.data)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
}

/* ---- Admin ---- */
const crud = (base: string) => ({
  list: (params?: Record<string, string>) => d<any[]>(client.get(`/shifts/admin/${base}/`, { params })),
  create: (body: any) => d<any>(client.post(`/shifts/admin/${base}/`, body)),
  update: (id: string, body: any) => d<any>(client.patch(`/shifts/admin/${base}/${id}/`, body)),
  remove: (id: string) => d<any>(client.delete(`/shifts/admin/${base}/${id}/`)),
})

export const shiftsAdmin = {
  sections: crud('sections'),
  shiftTypes: crud('shift-types'),
  groups: crud('groups'),
  posts: crud('posts'),
  members: crud('members'),
  moveMember: (id: string, body: any) => d<any>(client.post(`/shifts/admin/members/${id}/move/`, body)),
  overrides: crud('roster-overrides'),
  roles: crud('module-roles'),
  settings: () => d<any>(client.get('/shifts/admin/settings/')),
  spreadGroups: (section: string, preset?: string) => client.post(`/shifts/admin/sections/${section}/spread-groups/`, preset ? { preset } : {}).then(r => r.data),
  saveSettings: (body: any) => d<any>(client.put('/shifts/admin/settings/', body)),
  holidays: (year: number) => d<any[]>(client.get('/shifts/admin/holidays/', { params: { year } })),
  addHoliday: (body: any) => d<any>(client.post('/shifts/admin/holidays/', body)),
  removeHoliday: (id: string) => d<any>(client.delete('/shifts/admin/holidays/', { params: { id } })),
  importMembers: (section: string, file: File, dryRun: boolean) => {
    const f = new FormData()
    f.append('section', section); f.append('file', file); f.append('dry_run', dryRun ? '1' : '0')
    return d<any>(client.post('/shifts/admin/members-import/', f, { headers: { 'Content-Type': 'multipart/form-data' } }))
  },
}

/** Server error message, for showing to the person. */
export const errMsg = (e: any, fallback = 'Something went wrong. Please try again.') => {
  const data = e?.response?.data
  if (!data) return fallback
  if (data.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat()[0]
    if (typeof first === 'string' && data.message?.startsWith('Please check')) return first
  }
  return data.message || fallback
}

const pad = (n: number) => String(n).padStart(2, '0')
/** Local dates (the plant's clock), never UTC. */
export const todayIso = () => { const t = new Date(); return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}` }
export const monthNow = () => todayIso().slice(0, 7)
export const addDays = (iso: string, n: number) => {
  const t = new Date(iso + 'T00:00:00'); t.setDate(t.getDate() + n)
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`
}
export const addMonths = (m: string, n: number) => {
  const [y, mo] = m.split('-').map(Number); const t = new Date(y, mo - 1 + n, 1)
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}`
}
export const fmtMonth = (m: string) => {
  const [y, mo] = m.split('-').map(Number)
  return new Date(y, mo - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}
export const fmtDay = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
export const shiftName = (c: string) => ({ M: 'Morning', E: 'Evening', N: 'Night', G: 'General', O: 'Off' } as Record<string, string>)[c] ?? c
export const num = (s: string | number | null | undefined) => {
  const n = typeof s === 'number' ? s : parseFloat(String(s ?? '0'))
  return Number.isFinite(n) ? (Number.isInteger(n) ? String(n) : n.toFixed(1)) : '0'
}
