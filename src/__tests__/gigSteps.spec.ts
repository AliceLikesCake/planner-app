import { describe, it, expect } from 'vitest'
import { stepPatch } from '../services/gigSteps'

const none = {
  contract_signed: false,
  labor_signed: false,
  delivered: false,
  is_live: false,
  paid_at: null,
}
const all = {
  contract_signed: true,
  labor_signed: true,
  delivered: true,
  is_live: true,
  paid_at: '2026-10-18',
}
const TODAY = '2026-10-24'

describe('gig step circles', () => {
  it('ticking 入帳 ticks every earlier step and records today', () => {
    expect(stepPatch(none, 'paid', TODAY)).toEqual({
      contract_signed: true,
      labor_signed: true,
      delivered: true,
      is_live: true,
      paid_at: TODAY,
    })
  })

  it('ticking 勞報單 fills in what is still missing before it', () => {
    expect(stepPatch({ ...none, contract_signed: true }, 'labor', TODAY)).toEqual({
      delivered: true,
      is_live: true,
      labor_signed: true,
    })
  })

  it('unticking 交稿 unticks 上線, 勞報單 and 入帳 too, but not the contract', () => {
    expect(stepPatch(all, 'delivered', TODAY)).toEqual({
      delivered: false,
      is_live: false,
      labor_signed: false,
      paid_at: null,
    })
  })

  it('unticking 入帳 only clears the paid date', () => {
    expect(stepPatch(all, 'paid', TODAY)).toEqual({ paid_at: null })
  })

  it('unticking a step leaves later unticked steps alone', () => {
    expect(
      stepPatch({ ...none, contract_signed: true, labor_signed: true }, 'contract', TODAY),
    ).toEqual({
      contract_signed: false,
      labor_signed: false,
    })
  })
})
