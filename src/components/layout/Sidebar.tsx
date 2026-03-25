import { NavLink } from 'react-router-dom'
import { REFRESH_INTERVAL_MS } from '../../utils/constants'

const REFRESH_LABEL = `Auto-refresh: ${REFRESH_INTERVAL_MS / 60000} min`

const NAV = [
  { to: '/financial',  label: 'Financial',   icon: '₹' },
  { to: '/operations', label: 'Operations',  icon: '⚙' },
  { to: '/inventory',  label: 'Inventory',   icon: '📦' },
  { to: '/sales',      label: 'Sales & CRM', icon: '📋' },
  { to: '/settings',   label: 'Settings',    icon: '⚙' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: Props) {
  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 w-56 bg-brand flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:flex md:min-h-screen
      `}
    >
      {/* Header row with close button on mobile */}
      <div className="px-4 py-5 border-b border-brand-light flex items-center justify-between">
        <div>
          <p className="text-white font-bold text-lg leading-tight">Sai Metal Crafts</p>
          <p className="text-blue-300 text-xs mt-0.5">ERP Dashboard</p>
        </div>
        <button
          onClick={onClose}
          className="md:hidden text-blue-200 hover:text-white p-1"
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
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
        <p className="text-blue-300 text-xs">{REFRESH_LABEL}</p>
      </div>
    </aside>
  )
}
