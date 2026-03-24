import { useMemo } from 'react'
import { useSheetData } from './useSheetData'
import {
  calculateOrderProfit, calculateGSTLiability,
  calculatePaymentAging, groupByMonth, calculateConversionRate,
} from '../utils/calculations'

export function useFinancials(year = new Date().getFullYear()) {
  const { data, isLoading, error } = useSheetData()

  const metrics = useMemo(() => {
    if (!data) return null
    const { enquiries, purchases, expenses, payments } = data

    const poEnquiries = enquiries.filter(e => e.status === 'PO Received')

    const totalRevenueMTD = poEnquiries
      .filter(e => {
        const d = new Date(e.timestamp)
        const now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((s, e) => s + e.totalQuote, 0)

    const totalRevenueYTD = poEnquiries
      .filter(e => new Date(e.timestamp).getFullYear() === year)
      .reduce((s, e) => s + e.totalQuote, 0)

    const totalCollections = payments.reduce((s, p) => s + p.amount, 0)
    const outstanding = totalRevenueYTD - totalCollections

    const orderProfits = poEnquiries.map(e => ({
      enquiryId: e.enquiryId,
      clientName: e.clientName,
      itemDesc: e.itemDesc,
      totalQuote: e.totalQuote,
      profit: calculateOrderProfit(e, purchases, expenses),
    }))

    const totalProfit = orderProfits.reduce((s, o) => s + o.profit, 0)
    const profitPct = totalRevenueYTD > 0 ? (totalProfit / totalRevenueYTD) * 100 : 0

    const gst = calculateGSTLiability(poEnquiries, purchases)

    const monthlyRevenue = groupByMonth(enquiries, year)

    const agingBuckets: Record<string, number> = { 'Current': 0, '1-30 Days': 0, '31-60 Days': 0, '60+ Days': 0 }
    poEnquiries.forEach(e => {
      const { agingBucket } = calculatePaymentAging(payments, e)
      agingBuckets[agingBucket] = (agingBuckets[agingBucket] ?? 0) + 1
    })

    const conversionRate = calculateConversionRate(enquiries)

    return {
      totalRevenueMTD, totalRevenueYTD, totalCollections,
      outstanding, orderProfits, totalProfit, profitPct,
      gst, monthlyRevenue, agingBuckets, conversionRate,
    }
  }, [data, year])

  return { metrics, isLoading, error }
}
