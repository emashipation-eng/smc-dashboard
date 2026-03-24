import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS: Record<string, string> = {
  'Current': '#22c55e',
  '1-30 Days': '#facc15',
  '31-60 Days': '#f97316',
  '60+ Days': '#ef4444',
}

interface Props {
  data: Record<string, number>
}

export default function PaymentAging({ data }: Props) {
  const chartData = Object.entries(data)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }))

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Payment Aging</h2>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={70}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name] ?? '#94a3b8'} />
            ))}
          </Pie>
          <Legend />
          <Tooltip formatter={(value: number) => [`${value} orders`, 'Count']} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
