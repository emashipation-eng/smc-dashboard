interface Props {
  sheetLabel: string
  existingRowCount: number
  onChoice: (choice: 'replace' | 'append') => void
  onCancel: () => void
}

export default function ReplaceAppendDialog({ sheetLabel, existingRowCount, onChoice, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Data Already Exists</h2>
        <p className="text-sm text-gray-500">
          <span className="font-medium text-gray-700">{sheetLabel}</span> already has {existingRowCount} row{existingRowCount !== 1 ? 's' : ''} imported.
          What would you like to do?
        </p>

        <div className="space-y-2">
          <button
            onClick={() => onChoice('replace')}
            className="w-full text-left px-4 py-3 rounded-xl border-2 border-transparent hover:border-red-200 hover:bg-red-50 transition-colors group"
          >
            <p className="text-sm font-medium text-gray-800 group-hover:text-red-700">Replace all data</p>
            <p className="text-xs text-gray-400 mt-0.5">Start fresh — existing rows will be deleted</p>
          </button>
          <button
            onClick={() => onChoice('append')}
            className="w-full text-left px-4 py-3 rounded-xl border-2 border-transparent hover:border-green-200 hover:bg-green-50 transition-colors group"
          >
            <p className="text-sm font-medium text-gray-800 group-hover:text-green-700">Append new rows</p>
            <p className="text-xs text-gray-400 mt-0.5">Keep existing rows and add the new ones</p>
          </button>
        </div>

        <button
          onClick={onCancel}
          className="w-full py-2 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
