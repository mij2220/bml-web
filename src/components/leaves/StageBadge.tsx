import type { LeaveApplication } from '../../types'

/** Colours for the stage-wise status shown everywhere a leave application is listed. */
export const stageStyle: Record<string, string> = {
  pending_supervisor: 'bg-amber-100 text-amber-800 border border-amber-200',
  pending_sic:        'bg-sky-100 text-sky-800 border border-sky-200',
  pending_admin:      'bg-amber-100 text-amber-800 border border-amber-200',
  pending:            'bg-amber-100 text-amber-800 border border-amber-200',
  approved:           'bg-emerald-100 text-emerald-700 border border-emerald-200',
  rejected:           'bg-red-100 text-red-700 border border-red-200',
  returned:           'bg-violet-100 text-violet-800 border border-violet-200',
  cancelled:          'bg-slate-100 text-slate-500 border border-slate-200',
  expired:            'bg-orange-100 text-orange-700 border border-orange-200',
}

const fallbackLabel: Record<string, string> = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
  cancelled: 'Cancelled', expired: 'Expired', returned: 'Returned',
}

type StageSource = Pick<LeaveApplication, 'status'> & { stage?: string; stage_label?: string }

export function stageOf(l: StageSource): string {
  return l.stage || l.status
}

export function stageLabelOf(l: StageSource): string {
  return l.stage_label || fallbackLabel[l.status] || l.status
}

export default function StageBadge({ leave, className = '' }: { leave: StageSource; className?: string }) {
  const stage = stageOf(leave)
  const style = stageStyle[stage] ?? (stage.startsWith('pending') ? stageStyle.pending : 'bg-slate-100 text-slate-600 border border-slate-200')
  return (
    <span className={`inline-block whitespace-nowrap text-xs font-semibold px-2.5 py-1 rounded-full ${style} ${className}`}>
      {stageLabelOf(leave)}
    </span>
  )
}
