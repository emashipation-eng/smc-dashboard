import Header from '../components/layout/Header'
import MetricCard from '../components/cards/MetricCard'
import { useFinancials } from '../hooks/useFinancials'
import { formatCompactINR, formatPct } from '../utils/formatters'

export default function FinancialDashboard() {
  const { metrics, isLoading, error } = useFinancials()

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
    </div>
  )
  if (error) return <div className="p-6 text-danger">Error loading data: {error.message}</div>
  if (!metrics) return null

  return (
    <div>
      <Header title="Financial Command Center" />
      <div className="p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard
            title="Revenue MTD"
            value={formatCompactINR(metrics.totalRevenueMTD)}
            color="default"
          />
          <MetricCard
            title="Revenue YTD"
            value={formatCompactINR(metrics.totalRevenueYTD)}
            color="default"
          />
          <MetricCard
            title="Collections"
            value={formatCompactINR(metrics.totalCollections)}
            color="success"
          />
          <MetricCard
            title="Outstanding"
            value={formatCompactINR(metrics.outstanding)}
            color={metrics.outstanding > 500000 ? 'danger' : 'warning'}
          />
          <MetricCard
            title="Net Profit"
            value={formatCompactINR(metrics.totalProfit)}
            sub={formatPct(metrics.profitPct) + ' margin'}
            color={metrics.profitPct >= 15 ? 'success' : 'warning'}
          />
          <MetricCard
            title="GST Liability"
            value={formatCompactINR(metrics.gst.netLiability)}
            sub={`Out: ${formatCompactINR(metrics.gst.outputGST)} / In: ${formatCompactINR(metrics.gst.inputGST)}`}
            color="default"
          />
        </div>
      </div>
    </div>
  )
}
