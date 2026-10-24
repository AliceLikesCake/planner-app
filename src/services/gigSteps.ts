// The five step circles on a gig card run in order: 合約 → 勞報單 → 交稿 → 上線 → 入帳.
// Ticking a step ticks every step before it; unticking one unticks every step after it
// (DECISIONS 46).
import type { DateKey } from './dates'
import type { GigRow } from '@/types/db'

export const GIG_STEPS = ['contract', 'labor', 'delivered', 'live', 'paid'] as const
export type GigStep = (typeof GIG_STEPS)[number]

type StepFields = Pick<
  GigRow,
  'contract_signed' | 'labor_signed' | 'delivered' | 'is_live' | 'paid_at'
>

export function isStepDone(gig: StepFields, step: GigStep): boolean {
  switch (step) {
    case 'contract':
      return gig.contract_signed
    case 'labor':
      return gig.labor_signed
    case 'delivered':
      return gig.delivered
    case 'live':
      return gig.is_live
    case 'paid':
      return !!gig.paid_at
  }
}

/** The fields to save when `step` is tapped; ticking 入帳 records today as the paid date. */
export function stepPatch(gig: StepFields, step: GigStep, today: DateKey): Partial<StepFields> {
  const index = GIG_STEPS.indexOf(step)
  const ticking = !isStepDone(gig, step)
  const affected = ticking ? GIG_STEPS.slice(0, index + 1) : GIG_STEPS.slice(index)
  const patch: Partial<StepFields> = {}
  for (const s of affected) {
    if (isStepDone(gig, s) === ticking) continue
    if (s === 'contract') patch.contract_signed = ticking
    else if (s === 'labor') patch.labor_signed = ticking
    else if (s === 'delivered') patch.delivered = ticking
    else if (s === 'live') patch.is_live = ticking
    else patch.paid_at = ticking ? today : null
  }
  return patch
}
