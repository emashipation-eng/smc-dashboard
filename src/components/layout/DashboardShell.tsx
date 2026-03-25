import { useState } from 'react'
import type { ReactNode } from 'react'
import Sidebar from './Sidebar'

interface Props { children: ReactNode }

export default function DashboardShell({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
