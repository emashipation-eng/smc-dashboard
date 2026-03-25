import { describe, it, expect } from 'vitest'
import { assembleRows } from './rowAssembler'
import type { MatchResult } from './columnMatcher'

describe('assembleRows', () => {
  it('reorders columns to match schema order', () => {
    // Schema: Item ID(0), Item Name(1), Category(2), ...8 cols
    // Upload has columns in different order
    const matchResult: MatchResult = {
      matched: { 'Item Name': 0, 'Item ID': 1, 'Category': 2 },
      unmatched: [],
      schemaFields: ['Item ID', 'Item Name', 'Category', 'Dimensions', 'Current Stock', 'UOM', 'Min Alert Level', 'Location Bin'],
    }
    const uploadedRows = [['MS Rod', 'INV001', 'Raw Material']]
    const result = assembleRows(uploadedRows, matchResult)
    // result[0][0] = Item ID = 'INV001'
    // result[0][1] = Item Name = 'MS Rod'
    // result[0][2] = Category = 'Raw Material'
    expect(result[0][0]).toBe('INV001')
    expect(result[0][1]).toBe('MS Rod')
    expect(result[0][2]).toBe('Raw Material')
  })

  it('fills unmatched schema columns with empty string', () => {
    const matchResult: MatchResult = {
      matched: { 'Item ID': 0 },
      unmatched: [],
      schemaFields: ['Item ID', 'Item Name', 'Category'],
    }
    const result = assembleRows([['INV001']], matchResult)
    expect(result[0]).toEqual(['INV001', '', ''])
  })

  it('skips header row if uploaded rows include headers', () => {
    // assembleRows only processes data rows — caller strips headers
    const matchResult: MatchResult = {
      matched: { 'Item ID': 0, 'Item Name': 1 },
      unmatched: [],
      schemaFields: ['Item ID', 'Item Name'],
    }
    const result = assembleRows([['INV001', 'MS Rod'], ['INV002', 'SS Rod']], matchResult)
    expect(result).toHaveLength(2)
  })

  it('uses manually mapped columns from overrides', () => {
    // User maps 'Maal ka Naam' (upload col 1) → 'Item Name' (schema field)
    const matchResult: MatchResult = {
      matched: { 'Item ID': 0 },
      unmatched: [{ uploadedHeader: 'Maal ka Naam', uploadedIndex: 1 }],
      schemaFields: ['Item ID', 'Item Name', 'Category'],
    }
    const overrides: Record<string, number> = { 'Item Name': 1 }
    const result = assembleRows([['INV001', 'MS Rod']], matchResult, overrides)
    expect(result[0][1]).toBe('MS Rod')
  })
})
