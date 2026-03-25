import { describe, it, expect } from 'vitest'
import { matchColumns, MatchResult } from './columnMatcher'

describe('matchColumns', () => {
  it('exact match (case-insensitive)', () => {
    const result = matchColumns(['item id', 'item name', 'CATEGORY'], 'INVENTORY')
    expect(result.matched['Item ID']).toBe(0)
    expect(result.matched['Item Name']).toBe(1)
    expect(result.matched['Category']).toBe(2)
    expect(result.unmatched).toHaveLength(0)
  })

  it('alias match: "Client" → "Client Name"', () => {
    const result = matchColumns(
      ['Enquiry ID', 'Timestamp', 'Client', 'Item Description', 'Quantity', 'Unit Cost', 'Margin %', 'Total Quote', 'Status'],
      'ENQUIRY'
    )
    expect(result.matched['Client Name']).toBe(2)
  })

  it('alias match: "Qty" → "Quantity"', () => {
    const result = matchColumns(
      ['Enquiry ID', 'Timestamp', 'Client Name', 'Item Description', 'Qty', 'Unit Cost', 'Margin %', 'Total Quote', 'Status'],
      'ENQUIRY'
    )
    expect(result.matched['Quantity']).toBe(4)
  })

  it('alias match: "Bill No" → "Invoice No"', () => {
    const result = matchColumns(
      ['Purchase ID', 'Date', 'Supplier', 'Item ID', 'Item Description',
       'Quantity', 'Rate', 'Amount', 'GST %', 'GST Amount',
       'Total', 'Bill No', 'Invoice Date', 'Payment Status', 'Paid Amount', 'Job Ref'],
      'PURCHASE'
    )
    expect(result.matched['Invoice No']).toBe(11)
  })

  it('marks unrecognised columns as unmatched', () => {
    const result = matchColumns(['Item ID', 'Maal ka Naam'], 'INVENTORY')
    expect(result.unmatched).toContainEqual(
      expect.objectContaining({ uploadedHeader: 'Maal ka Naam' })
    )
  })

  it('returns full schema fields list for mapping UI', () => {
    const result = matchColumns([], 'INVENTORY')
    expect(result.schemaFields).toEqual([
      'Item ID', 'Item Name', 'Category', 'Dimensions',
      'Current Stock', 'UOM', 'Min Alert Level', 'Location Bin',
    ])
  })

  it('preserves column index of uploaded file (not schema index)', () => {
    // uploaded file has extra column at start
    const result = matchColumns(['Extra', 'Item ID', 'Item Name'], 'INVENTORY')
    expect(result.matched['Item ID']).toBe(1)   // col 1 in upload
    expect(result.matched['Item Name']).toBe(2) // col 2 in upload
  })
})
