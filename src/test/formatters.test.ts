import { describe, it, expect } from 'vitest'
import { formatINR, formatDate, formatPct, formatCompactINR } from '../utils/formatters'

describe('formatINR', () => {
  it('formats with Indian number system', () => {
    expect(formatINR(1234567)).toBe('₹12,34,567.00')
  })
  it('handles zero', () => {
    expect(formatINR(0)).toBe('₹0.00')
  })
})

describe('formatPct', () => {
  it('returns 2 decimal places with % sign', () => {
    expect(formatPct(15.567)).toBe('15.57%')
  })
})

describe('formatCompactINR', () => {
  it('abbreviates lakhs', () => {
    expect(formatCompactINR(500000)).toBe('₹5.00L')
  })
  it('abbreviates crores', () => {
    expect(formatCompactINR(25000000)).toBe('₹2.50Cr')
  })
})
