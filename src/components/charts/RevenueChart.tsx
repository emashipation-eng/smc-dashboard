import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCompactINR } from '@/utils/formatters'

interface Props {
  data: Record<string, number>
}

export default function RevenueChart({ data }: Props) {
  const chartData = Object.entries(data).map(([month, value]) => ({ month, value }))

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Monthly Revenue</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <XAxis dataKey="month" />
          <YAxis tickFormatter={formatCompactINR} />
          <Tooltip formatter={(value: number) => formatCompactINR(value)} />
          <Bar dataKey="value" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
