interface AlertItem {
  itemId: string
  itemName: string
  currentStock: number
  uom: string
  minAlertLevel: number
  stockStatus?: 'low' | 'critical'
}

interface AlertCardProps {
  items: AlertItem[]
  type: 'critical' | 'low'
}

export default function AlertCard({ items, type }: AlertCardProps) {
  if (items.length === 0) return null

  const isCritical = type === 'critical'
  const wrapperClass = isCritical
    ? 'bg-red-50 border border-red-200'
    : 'bg-amber-50 border border-amber-200'
  const headingClass = isCritical ? 'text-red-700' : 'text-amber-700'
  const itemClass = isCritical ? 'text-red-600' : 'text-amber-600'
  const heading = isCritical ? '⚠ Out of Stock' : '⚠ Low Stock'

  return (
    <div className={`rounded-lg p-4 ${wrapperClass}`}>
      <h3 className={`text-sm font-semibold mb-2 ${headingClass}`}>{heading}</h3>
      <ul className="space-y-1">
        {items.map(item => (
          <li key={item.itemId} className={`text-sm ${itemClass}`}>
            {item.itemName} — {item.currentStock} {item.uom} (min: {item.minAlertLevel})
          </li>
        ))}
      </ul>
    </div>
  )
}
