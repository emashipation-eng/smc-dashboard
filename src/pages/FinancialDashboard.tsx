import Header from '../components/layout/Header'
import MetricCard from '../components/cards/MetricCard'
import RevenueChart from '../components/charts/RevenueChart'
import ProfitTrend from '../components/charts/ProfitTrend'
import PaymentAging from '../components/charts/PaymentAging'
import GSTSummary from '../components/cards/GSTSummary'
import OrdersTable from '../components/tables/OrdersTable'
import { useFinancials } from '../hooks/useFinancials'
import { formatCompactINR, formatPct } from '../utils/formatters'

export default function FinancialDashboard() {
  const { metrics, isLoading, error } = useFinancials()

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
    </div>
  )
  if (error) return <div className="p-3 sm:p-6 text-danger">Error loading data: {error.message}</div>
  if (!metrics) return null

  return (
    <div>
      <Header />
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
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

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <RevenueChart data={metrics.monthlyRevenue} />
          <ProfitTrend data={metrics.orderProfits} />
        </div>

        {/* Aging & GST Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <PaymentAging data={metrics.agingBuckets} />
          <GSTSummary gst={metrics.gst} />
        </div>

        {/* Orders Table */}
        <OrdersTable orders={metrics.orderProfits} />
      </div>
    </div>
  )
}
