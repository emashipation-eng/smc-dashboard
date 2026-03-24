import Header from '../components/layout/Header'
import MetricCard from '../components/cards/MetricCard'
import AlertCard from '../components/cards/AlertCard'
import InventoryTable from '../components/tables/InventoryTable'
import { useInventory } from '../hooks/useInventory'

export default function InventoryDashboard() {
  const { metrics, isLoading, error } = useInventory()

  if (isLoading) {
    return (
      <div>
        <Header title="Inventory Intelligence" />
        <div className="p-6 text-gray-500">Loading inventory data…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="Inventory Intelligence" />
        <div className="p-6 text-danger">Error loading data: {error.message}</div>
      </div>
    )
  }

  if (!metrics) return null

  return (
    <div>
      <Header title="Inventory Intelligence" />
      <div className="p-6 space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Items" value={String(metrics.totalItems)} color="default" />
          <MetricCard title="Low Stock" value={String(metrics.lowStock.length)} color={metrics.lowStock.length > 0 ? 'warning' : 'success'} />
          <MetricCard title="Out of Stock" value={String(metrics.critical.length)} color={metrics.critical.length > 0 ? 'danger' : 'success'} />
          <MetricCard title="Healthy Stock" value={String(metrics.totalItems - metrics.lowStock.length)} color="success" />
        </div>
        {/* Alerts */}
        <AlertCard type="critical" items={metrics.critical} />
        <AlertCard type="low" items={metrics.lowStock.filter(i => i.stockStatus === 'low')} />
        {/* Table */}
        <InventoryTable items={metrics.inventory} />
      </div>
    </div>
  )
}
