import { describe, it, expect } from 'vitest'
import { SCHEMA_HEADERS, getExpectedHeaders } from './schemaHeaders'

describe('schemaHeaders', () => {
  it('exports headers for all 8 importable sheets', () => {
    const keys = Object.keys(SCHEMA_HEADERS)
    expect(keys).toContain('INVENTORY')
    expect(keys).toContain('ENQUIRY')
    expect(keys).toContain('PRODUCTION')
    expect(keys).toContain('PURCHASE')
    expect(keys).toContain('PAYMENT')
    expect(keys).toContain('EXPENSE')
    expect(keys).toContain('DISPATCH')
    expect(keys).toContain('FOLLOWUP')
    expect(keys).not.toContain('PRICING') // read-only, no import
  })

  it('getExpectedHeaders returns array matching COL index order', () => {
    const headers = getExpectedHeaders('INVENTORY')
    expect(headers[0]).toBe('Item ID')
    expect(headers[4]).toBe('Current Stock')
    expect(headers).toHaveLength(8)
  })

  it('getExpectedHeaders returns correct DISPATCH headers', () => {
    const headers = getExpectedHeaders('DISPATCH')
    expect(headers[4]).toBe('Delivery Mode') // col index 4 = DELIVERY_MODE
  })
})
