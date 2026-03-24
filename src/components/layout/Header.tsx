interface HeaderProps { title: string }

export default function Header({ title }: HeaderProps) {
  const now = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  })
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-bold text-gray-800">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">{now}</span>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Live</span>
      </div>
    </header>
  )
}
