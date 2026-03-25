import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardShell from './components/layout/DashboardShell'
import FinancialDashboard from './pages/FinancialDashboard'
import OperationsDashboard from './pages/OperationsDashboard'
import InventoryDashboard from './pages/InventoryDashboard'
import SalesDashboard from './pages/SalesDashboard'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <DashboardShell>
      <Routes>
        <Route path="/" element={<Navigate to="/financial" replace />} />
        <Route path="/financial"  element={<FinancialDashboard />} />
        <Route path="/operations" element={<OperationsDashboard />} />
        <Route path="/inventory"  element={<InventoryDashboard />} />
        <Route path="/sales"      element={<SalesDashboard />} />
        <Route path="/settings"   element={<SettingsPage />} />
      </Routes>
    </DashboardShell>
  )
}
