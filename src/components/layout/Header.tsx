import { getOverallDataSource } from '../../services/googleSheets'
import { getImportedSheetKeys } from '../../services/importStore'

interface HeaderProps { title: string }

export default function Header({ title }: HeaderProps) {
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
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-bold text-gray-800">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">{now}</span>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.color}`}>
          {badge.label}
        </span>
      </div>
    </header>
  )
}
