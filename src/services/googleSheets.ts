import { SPREADSHEET_ID, SHEET_RANGES } from '../config/sheets'
import type { SheetKey } from '../config/sheets'
import {
  rowsToInventory, rowsToEnquiries, rowsToProduction,
  rowsToPurchases, rowsToPayments, rowsToExpenses,
  rowsToDispatches, rowsToFollowups,
} from './dataTransform'
import { MOCK_ROWS } from './mockData'

type Row = string[]

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined
const BASE    = 'https://sheets.googleapis.com/v4/spreadsheets'

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

async function fetchAllRanges(): Promise<Record<SheetKey, Row[]>> {
  const keys   = Object.keys(SHEET_RANGES) as SheetKey[]
  const ranges = Object.values(SHEET_RANGES)

  if (!SPREADSHEET_ID || !API_KEY) {
    return Object.fromEntries(
      keys.map(k => [k, MOCK_ROWS[k as keyof typeof MOCK_ROWS] ?? []])
    ) as Record<SheetKey, Row[]>
  }

  const url = `${BASE}/${SPREADSHEET_ID}/values:batchGet?${
    ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&')
  }&key=${API_KEY}`

  const res  = await fetch(url)
  if (!res.ok) throw new Error(`Sheets batchGet error ${res.status}`)
  const data = await res.json()

  return Object.fromEntries(
    keys.map((k, i) => [k, (data.valueRanges?.[i]?.values ?? []) as Row[]])
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
