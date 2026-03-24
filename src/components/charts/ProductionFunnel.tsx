import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface StageCount {
  stage: string
  count: number
}

interface Props {
  data: StageCount[]
}

export default function ProductionFunnel({ data }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-700 mb-3">Production by Stage</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical">
          <YAxis dataKey="stage" type="category" width={80} />
          <XAxis type="number" allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
