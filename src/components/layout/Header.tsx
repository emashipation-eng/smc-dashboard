import { getOverallDataSource } from '../../services/googleSheets'
import { getImportedSheetKeys } from '../../services/importStore'

interface HeaderProps {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const now = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  })

  const source = getOverallDataSource()
  const importedCount = getImportedSheetKeys().length

  const badge = source === 'imported'
    ? { label: `${importedCount} sheet${importedCount !== 1 ? 's' : ''} imported`, color: 'bg-green-100 text-green-700' }
    : source === 'live'
    ? { label: 'Live', color: 'bg-green-100 text-green-700' }
    : { label: 'Mock data', color: 'bg-gray-100 text-gray-500' }

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-1 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Spacer on desktop where hamburger is hidden */}
      <div className="hidden md:block" />

      <div className="flex items-center gap-3 ml-auto">
        <span className="hidden sm:block text-sm text-gray-500">{now}</span>
        <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${badge.color}`}>
          {badge.label}
        </span>
      </div>
    </header>
  )
}
