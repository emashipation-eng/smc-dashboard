import { describe, it, expect, beforeEach } from 'vitest'
import { saveImport, getImport, clearImport, getImportMeta, hasImport, getImportedSheetKeys } from './importStore'

beforeEach(() => {
  localStorage.clear()
})

describe('importStore', () => {
  it('saves and retrieves rows for a sheet', () => {
    const rows = [['INV001', 'MS Rod', 'Raw Material']]
    saveImport('INVENTORY', rows)
    expect(getImport('INVENTORY')).toEqual(rows)
  })

  it('returns null when no import exists', () => {
    expect(getImport('INVENTORY')).toBeNull()
  })

  it('hasImport returns true after saving', () => {
    saveImport('ENQUIRY', [['ENQ001']])
    expect(hasImport('ENQUIRY')).toBe(true)
    expect(hasImport('INVENTORY')).toBe(false)
  })

  it('clears a specific sheet import', () => {
    saveImport('INVENTORY', [['INV001']])
    clearImport('INVENTORY')
    expect(getImport('INVENTORY')).toBeNull()
  })

  it('getImportMeta returns timestamp and row count', () => {
    const before = Date.now()
    saveImport('PAYMENT', [['PAY001'], ['PAY002']])
    const meta = getImportMeta('PAYMENT')
    expect(meta).not.toBeNull()
    expect(meta!.rowCount).toBe(2)
    expect(meta!.importedAt).toBeGreaterThanOrEqual(before)
  })

  it('getImportMeta returns null when no import', () => {
    expect(getImportMeta('DISPATCH')).toBeNull()
  })

  it('getImportedSheetKeys returns only data keys, not meta keys', () => {
    saveImport('INVENTORY', [['INV001']])
    saveImport('ENQUIRY', [['ENQ001']])
    const keys = getImportedSheetKeys()
    expect(keys).toContain('INVENTORY')
    expect(keys).toContain('ENQUIRY')
    expect(keys.every(k => !k.startsWith('meta_'))).toBe(true)
    expect(keys).toHaveLength(2)
  })
})
