import { useState } from 'react'
import type { MatchResult } from '../../services/columnMatcher'

interface Props {
  sheetLabel: string
  matchResult: MatchResult
  autoMatchedCount: number
  onConfirm: (overrides: Record<string, number>) => void
  onCancel: () => void
}

export default function MappingScreen({ sheetLabel, matchResult, autoMatchedCount, onConfirm, onCancel }: Props) {
  // overrides: schemaField → uploadedColIndex  (or -1 = skip)
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const alreadyMapped = new Set(Object.keys(matchResult.matched))

  const availableFields = matchResult.schemaFields.filter(
    f => !alreadyMapped.has(f)
  )

  function handleSelect(uploadedIdx: number, schemaField: string) {
    // Remove any existing mapping that used the same schemaField
    const cleaned = Object.fromEntries(
      Object.entries(overrides).filter(([, v]) => v !== uploadedIdx)
    )
    if (schemaField === '__skip__') {
      setOverrides(cleaned)
    } else {
      setOverrides({ ...cleaned, [schemaField]: uploadedIdx })
    }
  }

  function handleConfirm() {
    onConfirm(overrides)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Column Mapping — {sheetLabel}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {matchResult.unmatched.length} column{matchResult.unmatched.length !== 1 ? 's' : ''} could not be auto-matched.
            Assign each to a dashboard field or skip it.
          </p>
        </div>

        <div className="space-y-3">
          {matchResult.unmatched.map(({ uploadedHeader, uploadedIndex }) => (
            <div key={uploadedIndex} className="flex items-center gap-3">
              <div className="flex-1 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 truncate">
                "{uploadedHeader}"
              </div>
              <span className="text-gray-400">→</span>
              <select
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
                defaultValue="__skip__"
                onChange={e => handleSelect(uploadedIndex, e.target.value)}
              >
                <option value="__skip__">Skip this column</option>
                {availableFields.map(field => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="bg-green-50 text-green-700 text-sm rounded-lg px-3 py-2">
          ✓ {autoMatchedCount} column{autoMatchedCount !== 1 ? 's' : ''} auto-matched
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 rounded-xl bg-brand text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Confirm & Import
          </button>
        </div>
      </div>
    </div>
  )
}
