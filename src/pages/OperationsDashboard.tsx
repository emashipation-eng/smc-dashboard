import Header from '../components/layout/Header'
import MetricCard from '../components/cards/MetricCard'
import ProductionFunnel from '../components/charts/ProductionFunnel'
import JobsTable from '../components/tables/JobsTable'
import DispatchTable from '../components/tables/DispatchTable'
import { useProduction } from '../hooks/useProduction'

export default function OperationsDashboard() {
  const { metrics, isLoading, error } = useProduction()

  if (isLoading) {
    return (
      <div>
        <Header title="Operations Control Tower" />
        <div className="p-6 text-gray-500 text-sm">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="Operations Control Tower" />
        <div className="p-6 text-red-500 text-sm">Error loading data: {error}</div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div>
        <Header title="Operations Control Tower" />
        <div className="p-6 text-gray-400 text-sm">No data available.</div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Operations Control Tower" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Active Jobs" value={String(metrics.activeJobs.length)} color="default" />
          <MetricCard title="Delayed" value={String(metrics.delayed.length)} color={metrics.delayed.length > 0 ? 'danger' : 'success'} />
          <MetricCard title="In Transit" value={String(metrics.pendingDeliveries.length)} color="warning" />
          <MetricCard title="Dispatched Today" value={String(metrics.todayDispatches.length)} color="success" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ProductionFunnel data={metrics.byStage} />
          <DispatchTable dispatches={metrics.pendingDeliveries} />
        </div>
        <JobsTable jobs={metrics.activeJobs} highlightDelayed />
      </div>
    </div>
  )
}
