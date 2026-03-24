import { formatDate } from '../../utils/formatters'

interface Job {
  jobId: string
  clientName: string
  stage: string
  assignedTo: string
  status: string
  dueDate: string
  estimatedHours: number
  actualHours: number
}

interface Props {
  jobs: Job[]
  highlightDelayed?: boolean
}

function statusBadge(status: string): string {
  if (status === 'Complete')    return 'bg-green-100 text-green-700'
  if (status === 'In-Progress') return 'bg-blue-100 text-blue-700'
  return 'bg-gray-100 text-gray-600'
}

export default function JobsTable({ jobs, highlightDelayed = false }: Props) {
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Active Jobs</h2>
      {jobs.length === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center">No active jobs</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-3 py-2 text-left">Job ID</th>
                <th className="px-3 py-2 text-left">Client</th>
                <th className="px-3 py-2 text-left">Stage</th>
                <th className="px-3 py-2 text-left">Assigned</th>
                <th className="px-3 py-2 text-left">Due Date</th>
                <th className="px-3 py-2 text-right">Est.Hrs</th>
                <th className="px-3 py-2 text-right">Act.Hrs</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const isDelayed = highlightDelayed && job.dueDate && job.dueDate < today
                return (
                  <tr
                    key={job.jobId}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${isDelayed ? 'bg-red-50' : ''}`}
                  >
                    <td className="px-3 py-2 text-gray-700 font-medium">{job.jobId}</td>
                    <td className="px-3 py-2 text-gray-700">{job.clientName}</td>
                    <td className="px-3 py-2 text-gray-600">{job.stage}</td>
                    <td className="px-3 py-2 text-gray-600">{job.assignedTo}</td>
                    <td className="px-3 py-2 text-gray-600">{formatDate(job.dueDate)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{job.estimatedHours}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{job.actualHours}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(job.status)}`}>
                        {job.status}
                      </span>
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
