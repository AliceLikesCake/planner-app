import { describe, it, expect } from 'vitest'
import { parseQuickAdd } from '../services/quickAdd'

describe('parseQuickAdd', () => {
  it('reads amount, note, type and category', () => {
    expect(
      parseQuickAdd({ amount: '150', note: '7-11', type: 'expense', category: 'food' }),
    ).toEqual({
      amount: 150,
      note: '7-11',
      type: 'expense',
      category: 'food',
    })
  })

  it('accepts amounts the way Apple Pay passes them', () => {
    expect(parseQuickAdd({ amount: 'NT$1,280.00' }).amount).toBe(1280)
    expect(parseQuickAdd({ amount: '150.5' }).amount).toBe(151)
  })

  it('ignores what it cannot use', () => {
    expect(parseQuickAdd({ amount: 'abc', type: 'gift', note: '  ' })).toEqual({})
    expect(parseQuickAdd({})).toEqual({})
  })
})
