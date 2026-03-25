import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import PinGate from '../components/settings/PinGate'
import SheetImportCard from '../components/settings/SheetImportCard'
import { usePin } from '../contexts/PinContext'
import type { SheetKey } from '../config/sheets'

const IMPORTABLE_SHEETS: Exclude<SheetKey, 'PRICING'>[] = [
  'INVENTORY', 'ENQUIRY', 'PRODUCTION', 'PURCHASE',
  'PAYMENT', 'EXPENSE', 'DISPATCH', 'FOLLOWUP',
]

export default function SettingsPage() {
  return (
    <PinGate>
      <SettingsContent />
    </PinGate>
  )
}

function SettingsContent() {
  const queryClient = useQueryClient()
  const { lock, changePin } = usePin()
  const [tick, setTick] = useState(0)
  const [newPin, setNewPin] = useState('')
  const [pinMsg, setPinMsg] = useState('')

  const handleImported = useCallback(() => {
    setTick(t => t + 1) // force re-render to reflect new meta
    queryClient.invalidateQueries({ queryKey: ['sheetData'] })
  }, [queryClient])

  async function handleChangePin() {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinMsg('PIN must be exactly 4 digits')
      return
    }
    await changePin(newPin)
    setNewPin('')
    setPinMsg('PIN updated successfully')
    setTimeout(() => setPinMsg(''), 3000)
  }

  return (
    <div className="p-3 sm:p-6 max-w-2xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Import data and manage dashboard configuration</p>
        </div>
        <button
          onClick={lock}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors"
        >
          🔒 Lock
        </button>
      </div>

      {/* Data Import */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Data Import</h2>
          <button
            onClick={() => { queryClient.invalidateQueries({ queryKey: ['sheetData'] }) }}
            className="text-xs font-medium text-brand hover:text-blue-700 transition-colors"
          >
            🔄 Sync Dashboard
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Upload your existing Google Sheets or Excel files (.csv, .xlsx).
          Column names are matched automatically.
        </p>
        <div className="space-y-2" key={tick}>
          {IMPORTABLE_SHEETS.map(key => (
            <SheetImportCard key={key} sheetKey={key} onImported={handleImported} />
          ))}
        </div>
      </section>

      {/* Change PIN */}
      <section className="space-y-3 border-t border-gray-100 pt-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Change PIN</h2>
        <div className="flex gap-3 items-start">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="New 4-digit PIN"
            value={newPin}
            onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
            className="w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <button
            onClick={handleChangePin}
            className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Update PIN
          </button>
        </div>
        {pinMsg && (
          <p className={`text-xs ${pinMsg.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
            {pinMsg}
          </p>
        )}
      </section>

    </div>
  )
}
