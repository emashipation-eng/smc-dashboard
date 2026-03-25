import Header from '../components/layout/Header'
import MetricCard from '../components/cards/MetricCard'
import QuotePipeline from '../components/tables/QuotePipeline'
import FollowupTable from '../components/tables/FollowupTable'
import { useSheetData } from '../hooks/useSheetData'
import { useFinancials } from '../hooks/useFinancials'
import { formatCompactINR, formatPct } from '../utils/formatters'

export default function SalesDashboard() {
  const { data, isLoading, error } = useSheetData()
  const { metrics } = useFinancials()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-danger font-medium">Error loading data: {error.message}</p>
      </div>
    )
  }

  if (!data || !metrics) return null

  const enquiries = data.enquiries
  const followups = data.followups
  const quoted = enquiries.filter(e => e.status === 'Quoted')
  const total = enquiries.filter(e => e.status !== 'Expired').length
  const won = enquiries.filter(e => e.status === 'PO Received').length
  const pipelineValue = quoted.reduce((s, e) => s + e.totalQuote, 0)

  void total

  return (
    <div>
      <Header />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Pipeline (Quoted)" value={String(quoted.length)} color="default" />
          <MetricCard title="Pipeline Value" value={formatCompactINR(pipelineValue)} color="default" />
          <MetricCard title="Won (PO Received)" value={String(won)} color="success" />
          <MetricCard
            title="Conversion Rate"
            value={formatPct(metrics.conversionRate)}
            color={metrics.conversionRate >= 50 ? 'success' : 'warning'}
          />
        </div>
        <QuotePipeline enquiries={enquiries} />
        <FollowupTable followups={followups} />
      </div>
    </div>
  )
}
