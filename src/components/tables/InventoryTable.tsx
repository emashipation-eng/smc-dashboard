interface InventoryRow {
  itemId: string
  itemName: string
  category: string
  dimensions: string
  currentStock: number
  uom: string
  minAlertLevel: number
  locationBin: string
  stockStatus: 'ok' | 'low' | 'critical'
}

interface InventoryTableProps {
  items: InventoryRow[]
}

const stockColorMap: Record<'ok' | 'low' | 'critical', string> = {
  ok:       'text-green-600',
  low:      'text-amber-600',
  critical: 'text-red-600',
}

const badgeMap: Record<'ok' | 'low' | 'critical', string> = {
  ok:       'bg-green-100 text-green-700',
  low:      'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
}

export default function InventoryTable({ items }: InventoryTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Inventory</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs uppercase text-gray-500">
              <th className="text-left px-3 py-2 font-medium">Item ID</th>
              <th className="text-left px-3 py-2 font-medium">Name</th>
              <th className="text-left px-3 py-2 font-medium">Category</th>
              <th className="text-left px-3 py-2 font-medium">Dimensions</th>
              <th className="text-right px-3 py-2 font-medium">Stock</th>
              <th className="text-left px-3 py-2 font-medium">UOM</th>
              <th className="text-right px-3 py-2 font-medium">Min Level</th>
              <th className="text-left px-3 py-2 font-medium">Location</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.itemId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500 font-mono text-xs">{item.itemId}</td>
                <td className="px-3 py-2 text-gray-800 font-medium">{item.itemName}</td>
                <td className="px-3 py-2 text-gray-600">{item.category}</td>
                <td className="px-3 py-2 text-gray-600">{item.dimensions}</td>
                <td className={`px-3 py-2 text-right font-semibold ${stockColorMap[item.stockStatus]}`}>
                  {item.currentStock}
                </td>
                <td className="px-3 py-2 text-gray-600">{item.uom}</td>
                <td className="px-3 py-2 text-right text-gray-600">{item.minAlertLevel}</td>
                <td className="px-3 py-2 text-gray-600">{item.locationBin}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeMap[item.stockStatus]}`}>
                    {item.stockStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
