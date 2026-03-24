import { formatDate } from '../../utils/formatters'

interface Dispatch {
  dispatchId: string
  clientName: string
  jobRef: string
  date: string
  deliveryMode: string
  transporter: string
  weightKg: number
  status: string
}

interface Props {
  dispatches: Dispatch[]
}

function statusBadge(status: string): string {
  if (status === 'In-Transit') return 'bg-amber-100 text-amber-700'
  if (status === 'Delivered')  return 'bg-green-100 text-green-700'
  if (status === 'Returned')   return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-600'
}

export default function DispatchTable({ dispatches }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Pending Deliveries</h2>
      {dispatches.length === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center">No pending deliveries</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Client</th>
                <th className="px-3 py-2 text-left">Job Ref</th>
                <th className="px-3 py-2 text-left">Mode</th>
                <th className="px-3 py-2 text-left">Transporter</th>
                <th className="px-3 py-2 text-right">Weight</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {dispatches.map((d) => (
                <tr key={d.dispatchId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-600">{formatDate(d.date)}</td>
                  <td className="px-3 py-2 text-gray-700">{d.clientName}</td>
                  <td className="px-3 py-2 text-gray-700 font-medium">{d.jobRef}</td>
                  <td className="px-3 py-2 text-gray-600">{d.deliveryMode}</td>
                  <td className="px-3 py-2 text-gray-600">{d.transporter}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{d.weightKg} kg</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(d.status)}`}>
                      {d.status}
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
