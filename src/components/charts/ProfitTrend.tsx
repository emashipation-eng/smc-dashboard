import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCompactINR } from '@/utils/formatters'

interface OrderEntry {
  enquiryId: string
  clientName: string
  totalQuote: number
  profit: number
}

interface Props {
  data: OrderEntry[]
}

export default function ProfitTrend({ data }: Props) {
  const top5 = [...data]
    .sort((a, b) => b.totalQuote - a.totalQuote)
    .slice(0, 5)

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Order Profitability</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart layout="vertical" data={top5}>
          <XAxis type="number" tickFormatter={formatCompactINR} />
          <YAxis type="category" dataKey="clientName" width={120} />
          <Tooltip formatter={(value: number) => formatCompactINR(value)} />
          <Legend />
          <Bar dataKey="totalQuote" name="Revenue" fill="#93c5fd" />
          <Bar dataKey="profit" name="Profit" fill="#22c55e" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
