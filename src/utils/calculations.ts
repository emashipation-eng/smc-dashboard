import type { Enquiry, Purchase, Expense, Payment, InventoryItem, ProductionJob } from '../types'
import { differenceInDays, parseISO } from 'date-fns'

// ─── Financial ────────────────────────────────────────────────────────────────

export function calculateOrderProfit(
  enquiry: Enquiry,
  purchases: Purchase[],
  expenses: Expense[]
): number {
  const purchaseCost = purchases
    .filter(p => p.jobRef === enquiry.enquiryId)
    .reduce((s, p) => s + p.total, 0)
  const expenseCost = expenses
    .filter(e => e.jobRef === enquiry.enquiryId)
    .reduce((s, e) => s + e.amount, 0)
  return enquiry.totalQuote - purchaseCost - expenseCost
}

export function calculateProfitPct(
  enquiry: Enquiry,
  purchases: Purchase[],
  expenses: Expense[]
): number {
  if (enquiry.totalQuote === 0) return 0
  const profit = calculateOrderProfit(enquiry, purchases, expenses)
  return (profit / enquiry.totalQuote) * 100
}

export function calculateGSTLiability(
  enquiries: Enquiry[],
  purchases: Purchase[],
  gstPct = 18
): { outputGST: number; inputGST: number; netLiability: number } {
  const outputGST = enquiries
    .filter(e => e.status === 'PO Received')
    .reduce((s, e) => s + (e.totalQuote * gstPct) / (100 + gstPct), 0)
  const inputGST = purchases.reduce((s, p) => s + p.gstAmount, 0)
  return { outputGST, inputGST, netLiability: outputGST - inputGST }
}

// ─── Payments & Aging ─────────────────────────────────────────────────────────

export function calculatePaymentAging(
  payments: Payment[],
  enquiry: Enquiry,
  todayStr?: string
): { totalPaid: number; balance: number; agingBucket: string } {
  const totalPaid = payments
    .filter(p => p.enquiryRef === enquiry.enquiryId)
    .reduce((s, p) => s + p.amount, 0)
  const balance = enquiry.totalQuote - totalPaid
  const today = todayStr ? parseISO(todayStr) : new Date()
  const invoiceDate = parseISO(enquiry.timestamp)
  const days = differenceInDays(today, invoiceDate)
  const agingBucket =
    days <= 0  ? 'Current' :
    days <= 30 ? '1-30 Days' :
    days <= 60 ? '31-60 Days' : '60+ Days'
  return { totalPaid, balance, agingBucket }
}

// ─── Inventory ────────────────────────────────────────────────────────────────

interface JobWithMaterial extends ProductionJob {
  materialId?: string
  qtyNeeded?: number
}

export function calculateAvailableStock(
  item: InventoryItem,
  jobs: JobWithMaterial[]
): number {
  const committed = jobs
    .filter(j => j.status !== 'Complete' && j.materialId === item.itemId)
    .reduce((s, j) => s + (j.qtyNeeded ?? 0), 0)
  return item.currentStock - committed
}

// ─── Weight ───────────────────────────────────────────────────────────────────

const MATERIAL_DENSITY: Record<string, number> = {
  MS: 7.85, SS: 8.0, AL: 2.7, CU: 8.96,
}

export function calculateWeight(
  materialType: string,
  dimensions: string,
  quantity: number
): number {
  const match = dimensions.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/)
  if (!match) return 0
  const [, l, w, t] = match.map(Number)
  const volumeCm3 = (l / 10) * (w / 10) * (t / 10)
  const density = MATERIAL_DENSITY[materialType.toUpperCase()] ?? 7.85
  return (volumeCm3 * density / 1000) * quantity
}

// ─── Reporting ────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function groupByMonth(
  enquiries: Enquiry[],
  year: number
): Record<string, number> {
  const result: Record<string, number> = {}
  MONTHS.forEach(m => { result[m] = 0 })
  enquiries
    .filter(e => {
      const d = new Date(e.timestamp)
      return d.getFullYear() === year && e.status === 'PO Received'
    })
    .forEach(e => {
      const month = MONTHS[new Date(e.timestamp).getMonth()]
      result[month] = (result[month] ?? 0) + e.totalQuote
    })
  return result
}

export function calculateConversionRate(enquiries: Enquiry[]): number {
  const total = enquiries.filter(e => e.status !== 'Expired').length
  const converted = enquiries.filter(e => e.status === 'PO Received').length
  if (total === 0) return 0
  return (converted / total) * 100
}
