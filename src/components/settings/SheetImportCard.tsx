import { useRef, useState } from 'react'
import type { SheetKey } from '../../config/sheets'
import type { ImportMeta } from '../../services/importStore'
import type { MatchResult } from '../../services/columnMatcher'
import { parseFile } from '../../services/fileParser'
import { matchColumns } from '../../services/columnMatcher'
import { assembleRows } from '../../services/rowAssembler'
import { saveImport, getImport, getImportMeta, clearImport } from '../../services/importStore'
import MappingScreen from './MappingScreen'
import ReplaceAppendDialog from './ReplaceAppendDialog'

const SHEET_LABELS: Record<string, string> = {
  INVENTORY:  'Master Inventory',
  ENQUIRY:    'Enquiry Master',
  PRODUCTION: 'Production Queue',
  PURCHASE:   'Purchase Register',
  PAYMENT:    'Payment Tracker',
  EXPENSE:    'Expense Ledger',
  DISPATCH:   'Dispatch Log',
  FOLLOWUP:   'Followup Log',
}

interface Props {
  sheetKey: Exclude<SheetKey, 'PRICING'>
  onImported: () => void
}

type Step = 'idle' | 'parsing' | 'mapping' | 'replace-append' | 'saving' | 'done' | 'error'

export default function SheetImportCard({ sheetKey, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [parsedRows, setParsedRows] = useState<string[][]>([])
  const [parsedFileName, setParsedFileName] = useState('')
  const [pendingOverrides, setPendingOverrides] = useState<Record<string, number>>({})
  const [showReplaceAppend, setShowReplaceAppend] = useState(false)

  const meta: ImportMeta | null = getImportMeta(sheetKey)
  const label = SHEET_LABELS[sheetKey] ?? sheetKey

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStep('parsing')
    setErrorMsg('')

    const parsed = await parseFile(file)
    if (parsed.error) {
      setStep('error')
      setErrorMsg(parsed.error)
      return
    }

    setParsedRows(parsed.rows)
    setParsedFileName(parsed.fileName)

    const result = matchColumns(parsed.headers, sheetKey)
    setMatchResult(result)

    if (result.unmatched.length > 0) {
      setStep('mapping')
    } else {
      checkExistingAndProceed({})
    }

    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = ''
  }

  function checkExistingAndProceed(overrides: Record<string, number>) {
    setPendingOverrides(overrides)
    const existing = getImport(sheetKey)
    if (existing && existing.length > 0) {
      setShowReplaceAppend(true)
      setStep('replace-append')
    } else {
      doImport(overrides, 'replace')
    }
  }

  function doImport(overrides: Record<string, number>, mode: 'replace' | 'append') {
    if (!matchResult) return
    setStep('saving')
    const assembled = assembleRows(parsedRows, matchResult, overrides)

    if (mode === 'append') {
      const existing = getImport(sheetKey) ?? []
      saveImport(sheetKey, [...existing, ...assembled], parsedFileName)
    } else {
      saveImport(sheetKey, assembled, parsedFileName)
    }

    setShowReplaceAppend(false)
    setStep('done')
    onImported()
  }

  function handleMappingConfirm(overrides: Record<string, number>) {
    setStep('idle')
    checkExistingAndProceed(overrides)
  }

  function handleClearImport() {
    clearImport(sheetKey)
    setStep('idle')
    onImported()
  }

  const statusColor = meta
    ? 'border-green-200 bg-green-50'
    : 'border-gray-200 bg-white'

  return (
    <>
      <div className={`rounded-xl border p-4 ${statusColor}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">{label}</span>
              {meta && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Imported</span>}
              {!meta && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">No data</span>}
            </div>
            {meta && (
              <p className="text-xs text-gray-500 mt-0.5">
                {meta.rowCount} rows · {meta.fileName} · {new Date(meta.importedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
              </p>
            )}
            {step === 'error' && (
              <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {meta && (
              <button
                onClick={handleClearImport}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1"
                title="Remove imported data"
              >
                ✕
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={step === 'parsing' || step === 'saving'}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-brand text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {step === 'parsing' ? 'Reading…' : step === 'saving' ? 'Saving…' : '↑ Upload File'}
            </button>
          </div>
        </div>
      </div>

      {step === 'mapping' && matchResult && (
        <MappingScreen
          sheetLabel={label}
          matchResult={matchResult}
          autoMatchedCount={Object.keys(matchResult.matched).length}
          onConfirm={handleMappingConfirm}
          onCancel={() => setStep('idle')}
        />
      )}

      {showReplaceAppend && (
        <ReplaceAppendDialog
          sheetLabel={label}
          existingRowCount={getImport(sheetKey)?.length ?? 0}
          onChoice={choice => doImport(pendingOverrides, choice)}
          onCancel={() => { setShowReplaceAppend(false); setStep('idle') }}
        />
      )}
    </>
  )
}
