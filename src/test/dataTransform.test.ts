import { describe, it, expect } from 'vitest'
import { rowToInventory, rowToEnquiry, rowToProduction, rowsToPurchases } from '../services/dataTransform'

describe('rowToInventory', () => {
  it('maps raw row to InventoryItem', () => {
    const row = ['SMC-0001','MS Sheet 2mm','Raw Material','2400x1200x2mm','50','Kg','10','Rack A1']
    const item = rowToInventory(row)
    expect(item.itemId).toBe('SMC-0001')
    expect(item.currentStock).toBe(50)
    expect(item.minAlertLevel).toBe(10)
    expect(item.category).toBe('Raw Material')
  })

  it('handles missing optional fields gracefully', () => {
    const row = ['SMC-0002','Bolt M10','Hardware','','100','Pcs','20','']
    const item = rowToInventory(row)
    expect(item.locationBin).toBe('')
    expect(item.dimensions).toBe('')
  })
})

describe('rowToEnquiry', () => {
  it('maps raw row to Enquiry with numeric coercion', () => {
    const row = ['ENQ-202601-0001','2026-01-15','Acme Ltd','MS Gate','5','12000','15','69000','Quoted']
    const enq = rowToEnquiry(row)
    expect(enq.enquiryId).toBe('ENQ-202601-0001')
    expect(enq.quantity).toBe(5)
    expect(enq.totalQuote).toBe(69000)
    expect(enq.status).toBe('Quoted')
  })
})

describe('rowsToPurchases', () => {
  it('skips header row and maps remaining', () => {
    const rows = [
      ['PURCHASE_ID','DATE','SUPPLIER'],   // header
      ['PUR-202601-0001','2026-01-10','Steel Hub','SMC-0001','','10','5000','50000','18','9000','59000','INV001','2026-01-09','Paid','59000','ENQ-202601-0001'],
    ]
    const purchases = rowsToPurchases(rows)
    expect(purchases).toHaveLength(1)
    expect(purchases[0].purchaseId).toBe('PUR-202601-0001')
    expect(purchases[0].total).toBe(59000)
  })
})
