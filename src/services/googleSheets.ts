import { SPREADSHEET_ID, SHEET_RANGES } from '../config/sheets'
import type { SheetKey } from '../config/sheets'
import {
  rowsToInventory, rowsToEnquiries, rowsToProduction,
  rowsToPurchases, rowsToPayments, rowsToExpenses,
  rowsToDispatches, rowsToFollowups,
} from './dataTransform'
import { MOCK_ROWS } from './mockData'
import { getImport, getImportedSheetKeys } from './importStore'

type Row = string[]

const API_KEY        = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined
const BASE           = 'https://sheets.googleapis.com/v4/spreadsheets'

export async function fetchRange(range: string): Promise<Row[]> {
  if (!SPREADSHEET_ID || !API_KEY) {
    console.warn('[Sheets] No SPREADSHEET_ID or API_KEY — using mock data')
    return []
  }
  const url = `${BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?key=${API_KEY}`
  const res  = await fetch(url)
  if (!res.ok) throw new Error(`Sheets API error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return (data.values ?? []) as Row[]
}

/**
 * Fetches all sheet data from the Apps Script Web App proxy.
 * The proxy MUST return rows with a header row as row[0] for each sheet key,
 * matching the raw Sheets API contract (required by dataTransform's skipHeader).
 * Returns null on failure — caller falls back to next data source.
 */
async function fetchFromAppsScript(): Promise<Record<SheetKey, Row[]> | null> {
  if (!APPS_SCRIPT_URL) return null
  try {
    const res = await fetch(APPS_SCRIPT_URL)
    if (!res.ok) return null
    return await res.json() as Record<SheetKey, Row[]>
  } catch {
    console.warn('[Sheets] Apps Script fetch failed — falling back')
    return null
  }
}

async function fetchAllRanges(): Promise<Record<SheetKey, Row[]>> {
  const keys = Object.keys(SHEET_RANGES) as SheetKey[]
  const ranges = Object.values(SHEET_RANGES)
  const useAPI = Boolean(SPREADSHEET_ID && API_KEY)

  // Try Apps Script proxy first (before raw Sheets API)
  const scriptRows = await fetchFromAppsScript()

  let apiRows: Record<SheetKey, Row[]> | null = null

  if (!scriptRows && useAPI) {
    const url = `${BASE}/${SPREADSHEET_ID}/values:batchGet?${
      ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&')
    }&key=${API_KEY}`
    try {
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        apiRows = Object.fromEntries(
          keys.map((k, i) => [k, (data.valueRanges?.[i]?.values ?? []) as Row[]])
        ) as Record<SheetKey, Row[]>
      }
    } catch { /* fallthrough to mock */ }
  }

  return Object.fromEntries(
    keys.map(k => {
      const imported = getImport(k)
      if (imported !== null) return [k, imported]
      if (scriptRows)         return [k, scriptRows[k] ?? []]
      if (apiRows)            return [k, apiRows[k]]
      return [k, MOCK_ROWS[k as keyof typeof MOCK_ROWS] ?? []]
    })
  ) as Record<SheetKey, Row[]>
}

export interface AllSheetData {
  inventory:  ReturnType<typeof rowsToInventory>
  enquiries:  ReturnType<typeof rowsToEnquiries>
  production: ReturnType<typeof rowsToProduction>
  purchases:  ReturnType<typeof rowsToPurchases>
  payments:   ReturnType<typeof rowsToPayments>
  expenses:   ReturnType<typeof rowsToExpenses>
  dispatches: ReturnType<typeof rowsToDispatches>
  followups:  ReturnType<typeof rowsToFollowups>
}

export async function fetchAllSheetData(): Promise<AllSheetData> {
  const raw = await fetchAllRanges()
  return {
    inventory:  rowsToInventory(raw.INVENTORY),
    enquiries:  rowsToEnquiries(raw.ENQUIRY),
    production: rowsToProduction(raw.PRODUCTION),
    purchases:  rowsToPurchases(raw.PURCHASE),
    payments:   rowsToPayments(raw.PAYMENT),
    expenses:   rowsToExpenses(raw.EXPENSE),
    dispatches: rowsToDispatches(raw.DISPATCH),
    followups:  rowsToFollowups(raw.FOLLOWUP),
  }
}

export type DataSource = 'imported' | 'live' | 'mock'

export function getOverallDataSource(): DataSource {
  const importedKeys = getImportedSheetKeys()
  if (importedKeys.length > 0) return 'imported'
  if (APPS_SCRIPT_URL || (SPREADSHEET_ID && API_KEY)) return 'live'
  return 'mock'
}
