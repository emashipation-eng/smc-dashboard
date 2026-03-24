import { formatDate, formatCompactINR } from '../../utils/formatters'

interface Enquiry {
  enquiryId: string
  timestamp: string
  clientName: string
  itemDesc: string
  quantity: number
  totalQuote: number
  status: string
}

interface Props {
  enquiries: Enquiry[]
}

const statusBadge: Record<string, string> = {
  'Quoted':      'bg-blue-100 text-blue-700',
  'PO Received': 'bg-green-100 text-green-700',
  'Rejected':    'bg-red-100 text-red-700',
  'Expired':     'bg-gray-100 text-gray-500',
}

export default function QuotePipeline({ enquiries }: Props) {
  const pipeline = enquiries.filter(e => e.status === 'Quoted')

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Active Pipeline</h2>
      {pipeline.length === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center">No active pipeline enquiries</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-3 py-2 text-left">Enquiry ID</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Client</th>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Value</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.map(e => (
                <tr key={e.enquiryId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-700 font-medium">{e.enquiryId}</td>
                  <td className="px-3 py-2 text-gray-600">{formatDate(e.timestamp)}</td>
                  <td className="px-3 py-2 text-gray-700">{e.clientName}</td>
                  <td className="px-3 py-2 text-gray-600">{e.itemDesc}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{e.quantity}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{formatCompactINR(e.totalQuote)}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[e.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
