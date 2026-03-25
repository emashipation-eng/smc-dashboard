import type { SheetKey } from '../config/sheets'

const PREFIX = 'smc_import_'
const META_PREFIX = 'smc_import_meta_'

export interface ImportMeta {
  importedAt: number
  rowCount: number
  fileName: string
}

export function saveImport(key: SheetKey, rows: string[][], fileName = ''): void {
  localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(rows))
  const meta: ImportMeta = { importedAt: Date.now(), rowCount: rows.length, fileName }
  localStorage.setItem(`${META_PREFIX}${key}`, JSON.stringify(meta))
}

export function getImport(key: SheetKey): string[][] | null {
  const raw = localStorage.getItem(`${PREFIX}${key}`)
  if (!raw) return null
  try { return JSON.parse(raw) as string[][] }
  catch { return null }
}

export function hasImport(key: SheetKey): boolean {
  return localStorage.getItem(`${PREFIX}${key}`) !== null
}

export function clearImport(key: SheetKey): void {
  localStorage.removeItem(`${PREFIX}${key}`)
  localStorage.removeItem(`${META_PREFIX}${key}`)
}

export function getImportMeta(key: SheetKey): ImportMeta | null {
  const raw = localStorage.getItem(`${META_PREFIX}${key}`)
  if (!raw) return null
  try { return JSON.parse(raw) as ImportMeta }
  catch { return null }
}

export function getImportedSheetKeys(): SheetKey[] {
  return (Object.keys(localStorage) as string[])
    .filter(k => k.startsWith(PREFIX))
    .map(k => k.replace(PREFIX, '') as SheetKey)
}
