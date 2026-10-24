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

  it('ticking 交稿 only fills in what is still missing before it', () => {
    expect(stepPatch({ ...none, contract_signed: true }, 'delivered', TODAY)).toEqual({
      labor_signed: true,
      delivered: true,
    })
  })

  it('unticking 交稿 unticks 上線 and 入帳 too, but not the paperwork', () => {
    expect(stepPatch(all, 'delivered', TODAY)).toEqual({
      delivered: false,
      is_live: false,
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
