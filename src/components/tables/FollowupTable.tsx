import { formatDate } from '../../utils/formatters'

interface Followup {
  followupId: string
  enquiryRef: string
  clientName: string
  followupDate: string
  method: string
  assignedTo: string
  notes: string
  outcome: string
  nextAction: string
  nextDate: string
}

interface Props {
  followups: Followup[]
}

const outcomeBadge: Record<string, string> = {
  'Positive':    'bg-green-100 text-green-700',
  'Negative':    'bg-red-100 text-red-700',
  'Pending':     'bg-gray-100 text-gray-500',
  'Rescheduled': 'bg-amber-100 text-amber-700',
}

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function FollowupTable({ followups }: Props) {
  const today = todayString()

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Follow-up Log</h2>
      {followups.length === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center">No follow-ups recorded</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Client</th>
                <th className="px-3 py-2 text-left">Enquiry</th>
                <th className="px-3 py-2 text-left">Method</th>
                <th className="px-3 py-2 text-left">Outcome</th>
                <th className="px-3 py-2 text-left">Next Action</th>
                <th className="px-3 py-2 text-left">Next Date</th>
              </tr>
            </thead>
            <tbody>
              {followups.map(f => {
                const isToday = f.followupDate === today
                return (
                  <tr
                    key={f.followupId}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${isToday ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-3 py-2 text-gray-600">{formatDate(f.followupDate)}</td>
                    <td className="px-3 py-2 text-gray-700">{f.clientName}</td>
                    <td className="px-3 py-2 text-gray-600">{f.enquiryRef}</td>
                    <td className="px-3 py-2 text-gray-600">{f.method}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${outcomeBadge[f.outcome] ?? 'bg-gray-100 text-gray-500'}`}>
                        {f.outcome}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{f.nextAction}</td>
                    <td className="px-3 py-2 text-gray-600">{formatDate(f.nextDate)}</td>
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
