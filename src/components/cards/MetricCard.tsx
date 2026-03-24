interface MetricCardProps {
  title: string
  value: string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: 'default' | 'success' | 'warning' | 'danger'
}

const colorMap: Record<string, string> = {
  default: 'border-l-brand',
  success: 'border-l-success',
  warning: 'border-l-warning',
  danger:  'border-l-danger',
}

const trendIcon = { up: '↑', down: '↓', neutral: '→' }
const trendColor = { up: 'text-success', down: 'text-danger', neutral: 'text-gray-400' }

export default function MetricCard({ title, value, sub, trend, color = 'default' }: MetricCardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 ${colorMap[color]} p-5`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      {(sub || trend) && (
        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
          {trend && <span className={trendColor[trend]}>{trendIcon[trend]}</span>}
          {sub}
        </p>
      )}
    </div>
  )
}
