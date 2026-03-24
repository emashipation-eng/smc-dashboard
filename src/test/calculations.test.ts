import { describe, it, expect } from 'vitest'
import {
  calculateOrderProfit,
  calculateGSTLiability,
  calculateAvailableStock,
  calculatePaymentAging,
  calculateWeight,
  groupByMonth,
} from '../utils/calculations'
import type { Enquiry, Purchase, Expense, Payment, InventoryItem, ProductionJob } from '../types'

const mockEnquiry: Enquiry = {
  enquiryId: 'ENQ-202601-0001', timestamp: '2026-01-15',
  clientName: 'Acme', itemDesc: 'Gate', quantity: 1, unitCost: 60000,
  marginPct: 15, totalQuote: 69000, status: 'PO Received',
}

const mockPurchase: Purchase = {
  purchaseId: 'PUR-202601-0001', date: '2026-01-16', supplier: 'Steel Hub',
  itemId: 'SMC-0001', itemDesc: 'MS Sheet', quantity: 5, rate: 5000,
  amount: 25000, gstPct: 18, gstAmount: 4500, total: 29500,
  invoiceNo: 'INV001', invoiceDate: '2026-01-16', paymentStatus: 'Paid',
  paidAmount: 29500, jobRef: 'ENQ-202601-0001',
}

const mockExpense: Expense = {
  expenseId: 'EXP-202601-0001', date: '2026-01-17', category: 'Labor',
  description: 'Welding labor', amount: 8000, gstApplicable: false,
  gstAmount: 0, paidTo: 'Ramesh', jobRef: 'ENQ-202601-0001',
  paymentMode: 'Cash', approvedBy: 'Umang',
}

describe('calculateOrderProfit', () => {
  it('returns revenue minus purchase and expense costs', () => {
    const profit = calculateOrderProfit(mockEnquiry, [mockPurchase], [mockExpense])
    // 69000 - 29500 - 8000 = 31500
    expect(profit).toBe(31500)
  })

  it('returns full quote when no costs linked', () => {
    const profit = calculateOrderProfit(mockEnquiry, [], [])
    expect(profit).toBe(69000)
  })

  it('ignores purchases for other jobs', () => {
    const otherPurchase = { ...mockPurchase, jobRef: 'ENQ-202601-9999' }
    const profit = calculateOrderProfit(mockEnquiry, [otherPurchase], [])
    expect(profit).toBe(69000)
  })
})

describe('calculateGSTLiability', () => {
  it('returns output GST, input GST and net liability', () => {
    const purchase = { ...mockPurchase, gstAmount: 9000 }
    const result = calculateGSTLiability([mockEnquiry], [purchase])
    // Output GST from 69000 at 18% embedded: 69000 * 18 / 118 ≈ 10525.42
    expect(result.outputGST).toBeCloseTo(10525.42, 1)
    expect(result.inputGST).toBe(9000)
    expect(result.netLiability).toBeCloseTo(1525.42, 1)
  })
})

describe('calculateAvailableStock', () => {
  it('subtracts committed qty from current stock', () => {
    const item: InventoryItem = {
      itemId: 'SMC-0001', itemName: 'MS Sheet', category: 'Raw Material',
      dimensions: '', currentStock: 100, uom: 'Kg',
      minAlertLevel: 10, locationBin: 'Rack A1',
    }
    const jobs: Array<ProductionJob & { materialId?: string; qtyNeeded?: number }> = [
      { jobId: 'J1', clientName: 'A', stage: 'Cutting', assignedTo: 'a@b.com',
        status: 'In-Progress', materialId: 'SMC-0001', qtyNeeded: 30 },
    ]
    expect(calculateAvailableStock(item, jobs as any)).toBe(70)
  })
})

describe('calculatePaymentAging', () => {
  it('classifies overdue balance into aging bucket', () => {
    const payments: Payment[] = [{
      paymentId: 'PAY-001', date: '2026-01-20', type: 'Advance',
      enquiryRef: 'ENQ-202601-0001', clientName: 'Acme', amount: 20000,
      mode: 'NEFT', reference: '', receiptNo: '', notes: '',
    }]
    const result = calculatePaymentAging(payments, mockEnquiry, '2026-03-10')
    expect(result.totalPaid).toBe(20000)
    expect(result.balance).toBe(49000)
    // 54 days after invoice date (2026-01-15) → '31-60 Days'
    expect(result.agingBucket).toBe('31-60 Days')
  })
})

describe('calculateWeight', () => {
  it('calculates weight for flat sheet (LxWxT)', () => {
    // 2400 x 1200 x 2mm MS sheet = 240 x 120 x 0.2 cm = 5760 cm³ × 7.85 / 1000 = 45.216 kg × 1 pc
    const w = calculateWeight('MS', '2400x1200x2', 1)
    expect(w).toBeCloseTo(45.22, 1)
  })

  it('multiplies by quantity', () => {
    const w1 = calculateWeight('MS', '2400x1200x2', 1)
    const w5 = calculateWeight('MS', '2400x1200x2', 5)
    expect(w5).toBeCloseTo(w1 * 5, 2)
  })

  it('returns 0 for unparseable dimensions', () => {
    expect(calculateWeight('MS', 'invalid', 1)).toBe(0)
  })
})

describe('groupByMonth', () => {
  it('groups enquiries by month and sums totalQuote', () => {
    const enquiries: Enquiry[] = [
      { ...mockEnquiry, timestamp: '2026-01-15', totalQuote: 50000, status: 'PO Received' },
      { ...mockEnquiry, enquiryId: 'E2', timestamp: '2026-01-20', totalQuote: 30000, status: 'PO Received' },
      { ...mockEnquiry, enquiryId: 'E3', timestamp: '2026-02-10', totalQuote: 70000, status: 'PO Received' },
    ]
    const result = groupByMonth(enquiries, 2026)
    expect(result['Jan']).toBe(80000)
    expect(result['Feb']).toBe(70000)
  })
})
