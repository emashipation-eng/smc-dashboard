import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/financial',  label: 'Financial',   icon: '₹' },
  { to: '/operations', label: 'Operations',  icon: '⚙' },
  { to: '/inventory',  label: 'Inventory',   icon: '📦' },
  { to: '/sales',      label: 'Sales & CRM', icon: '📋' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-brand min-h-screen flex flex-col">
      <div className="px-4 py-5 border-b border-brand-light">
        <p className="text-white font-bold text-lg leading-tight">Sai Metal Crafts</p>
        <p className="text-blue-300 text-xs mt-0.5">ERP Dashboard</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-light text-white'
                  : 'text-blue-200 hover:bg-brand-light hover:text-white'
              }`
            }
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-brand-light">
        <p className="text-blue-300 text-xs">Auto-refresh: 5 min</p>
      </div>
    </aside>
  )
}
