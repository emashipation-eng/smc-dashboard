import { formatCompactINR } from '../../utils/formatters'

interface Order {
  enquiryId: string
  clientName: string
  itemDesc: string
  totalQuote: number
  profit: number
}

interface Props {
  orders: Order[]
}

function marginColor(margin: number): string {
  if (margin >= 15) return 'text-green-600'
  if (margin >= 5) return 'text-amber-500'
  return 'text-red-500'
}

export default function OrdersTable({ orders }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Orders</h2>
      {orders.length === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center">No orders yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-3 py-2 text-left">Enquiry ID</th>
                <th className="px-3 py-2 text-left">Client</th>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-right">Revenue</th>
                <th className="px-3 py-2 text-right">Profit</th>
                <th className="px-3 py-2 text-right">Margin%</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const margin = order.totalQuote > 0
                  ? (order.profit / order.totalQuote) * 100
                  : 0
                return (
                  <tr
                    key={order.enquiryId}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2 text-gray-700">{order.enquiryId}</td>
                    <td className="px-3 py-2 text-gray-700">{order.clientName}</td>
                    <td className="px-3 py-2 text-gray-600">{order.itemDesc}</td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {formatCompactINR(order.totalQuote)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {formatCompactINR(order.profit)}
                    </td>
                    <td className={`px-3 py-2 text-right font-medium ${marginColor(margin)}`}>
                      {margin.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
