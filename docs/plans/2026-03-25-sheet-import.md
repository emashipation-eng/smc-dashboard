# Sheet Import (PIN-Protected) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A PIN-protected Settings page where Umang uploads his existing CSV/XLSX files (one per sheet), the system auto-matches columns to the dashboard schema, shows a mapping screen for unmatched columns, stores the data in localStorage, and surfaces it as the primary data source across all dashboards.

**Architecture:** File upload (CSV/XLSX via SheetJS) → header extraction → fuzzy column matching against COL constants → unmatched columns shown in mapping UI → validated rows stored in localStorage keyed by SheetKey → `fetchAllSheetData()` reads localStorage first, then Google Sheets API, then mock data. PIN is SHA-256 hashed and stored in localStorage. TanStack Query cache invalidation triggers "Sync Now".

**Tech Stack:** SheetJS (`xlsx`), Web Crypto API (SHA-256), React context (PIN state), localStorage, TanStack Query v5, React Router v6, Tailwind CSS v3, Vitest

---

### Task 1: Install SheetJS + define schema header maps

**Files:**
- Modify: `package.json` (add `xlsx` dependency)
- Create: `src/services/schemaHeaders.ts`
- Create: `src/services/schemaHeaders.test.ts`

**Step 1: Install SheetJS**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && npm install xlsx
```

Expected: `xlsx` added to `dependencies` in `package.json`.

**Step 2: Write failing tests for schemaHeaders**

Create `src/services/schemaHeaders.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SCHEMA_HEADERS, getExpectedHeaders } from './schemaHeaders'

describe('schemaHeaders', () => {
  it('exports headers for all 8 importable sheets', () => {
    const keys = Object.keys(SCHEMA_HEADERS)
    expect(keys).toContain('INVENTORY')
    expect(keys).toContain('ENQUIRY')
    expect(keys).toContain('PRODUCTION')
    expect(keys).toContain('PURCHASE')
    expect(keys).toContain('PAYMENT')
    expect(keys).toContain('EXPENSE')
    expect(keys).toContain('DISPATCH')
    expect(keys).toContain('FOLLOWUP')
    expect(keys).not.toContain('PRICING') // read-only, no import
  })

  it('getExpectedHeaders returns array matching COL index order', () => {
    const headers = getExpectedHeaders('INVENTORY')
    expect(headers[0]).toBe('Item ID')
    expect(headers[4]).toBe('Current Stock')
    expect(headers).toHaveLength(8)
  })

  it('getExpectedHeaders returns correct DISPATCH headers', () => {
    const headers = getExpectedHeaders('DISPATCH')
    expect(headers[4]).toBe('Delivery Mode') // col index 4 = DELIVERY_MODE
  })
})
```

**Step 3: Run test to verify it fails**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && npx vitest run src/services/schemaHeaders.test.ts
```

Expected: FAIL — `Cannot find module './schemaHeaders'`

**Step 4: Create `src/services/schemaHeaders.ts`**

```ts
// Maps each importable SheetKey to its expected column headers (in COL index order)
// These are the "canonical" English names shown in the mapping UI

import type { SheetKey } from '../config/sheets'

type ImportableSheetKey = Exclude<SheetKey, 'PRICING'>

export const SCHEMA_HEADERS: Record<ImportableSheetKey, string[]> = {
  INVENTORY: [
    'Item ID', 'Item Name', 'Category', 'Dimensions',
    'Current Stock', 'UOM', 'Min Alert Level', 'Location Bin',
  ],
  ENQUIRY: [
    'Enquiry ID', 'Timestamp', 'Client Name', 'Item Description',
    'Quantity', 'Unit Cost', 'Margin %', 'Total Quote', 'Status',
  ],
  PRODUCTION: [
    'Job ID', 'Client Name', 'Stage', 'Assigned To',
    'Status', 'Start Date', 'Due Date', 'Estimated Hours',
    'Actual Hours', 'Weight (kg)',
  ],
  PURCHASE: [
    'Purchase ID', 'Date', 'Supplier', 'Item ID', 'Item Description',
    'Quantity', 'Rate', 'Amount', 'GST %', 'GST Amount',
    'Total', 'Invoice No', 'Invoice Date', 'Payment Status',
    'Paid Amount', 'Job Ref',
  ],
  PAYMENT: [
    'Payment ID', 'Date', 'Type', 'Enquiry Ref', 'Client Name',
    'Amount', 'Mode', 'Reference', 'Receipt No', 'Notes',
  ],
  EXPENSE: [
    'Expense ID', 'Date', 'Category', 'Description', 'Amount',
    'GST Applicable', 'GST Amount', 'Paid To', 'Job Ref',
    'Payment Mode', 'Approved By',
  ],
  DISPATCH: [
    'Dispatch ID', 'Date', 'Job Ref', 'Client Name', 'Delivery Mode',
    'Delivery Address', 'Challan No', 'Vehicle No', 'Transporter',
    'Freight Cost', 'Weight (kg)', 'No of Packages', 'Received By',
    'Receipt Date', 'POD Link', 'Status',
  ],
  FOLLOWUP: [
    'Followup ID', 'Enquiry Ref', 'Client Name', 'Followup Date',
    'Method', 'Assigned To', 'Notes', 'Outcome', 'Next Action',
    'Next Date', 'Created At',
  ],
}

export function getExpectedHeaders(key: ImportableSheetKey): string[] {
  return SCHEMA_HEADERS[key]
}
```

**Step 5: Run test to verify it passes**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && npx vitest run src/services/schemaHeaders.test.ts
```

Expected: PASS — 3 tests

**Step 6: Commit**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && git add package.json package-lock.json src/services/schemaHeaders.ts src/services/schemaHeaders.test.ts && git commit -m "feat: install SheetJS, add schema header maps for all 8 importable sheets"
```

---

### Task 2: Column matcher service (fuzzy + alias dictionary)

**Files:**
- Create: `src/services/columnMatcher.ts`
- Create: `src/services/columnMatcher.test.ts`

**Step 1: Write failing tests**

Create `src/services/columnMatcher.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { matchColumns, MatchResult } from './columnMatcher'

describe('matchColumns', () => {
  it('exact match (case-insensitive)', () => {
    const result = matchColumns(['item id', 'item name', 'CATEGORY'], 'INVENTORY')
    expect(result.matched['Item ID']).toBe(0)
    expect(result.matched['Item Name']).toBe(1)
    expect(result.matched['Category']).toBe(2)
    expect(result.unmatched).toHaveLength(0)
  })

  it('alias match: "Client" → "Client Name"', () => {
    const result = matchColumns(
      ['Enquiry ID', 'Timestamp', 'Client', 'Item Description', 'Quantity', 'Unit Cost', 'Margin %', 'Total Quote', 'Status'],
      'ENQUIRY'
    )
    expect(result.matched['Client Name']).toBe(2)
  })

  it('alias match: "Qty" → "Quantity"', () => {
    const result = matchColumns(
      ['Enquiry ID', 'Timestamp', 'Client Name', 'Item Description', 'Qty', 'Unit Cost', 'Margin %', 'Total Quote', 'Status'],
      'ENQUIRY'
    )
    expect(result.matched['Quantity']).toBe(4)
  })

  it('alias match: "Bill No" → "Invoice No"', () => {
    const result = matchColumns(
      ['Purchase ID', 'Date', 'Supplier', 'Item ID', 'Item Description',
       'Quantity', 'Rate', 'Amount', 'GST %', 'GST Amount',
       'Total', 'Bill No', 'Invoice Date', 'Payment Status', 'Paid Amount', 'Job Ref'],
      'PURCHASE'
    )
    expect(result.matched['Invoice No']).toBe(11)
  })

  it('marks unrecognised columns as unmatched', () => {
    const result = matchColumns(['Item ID', 'Maal ka Naam'], 'INVENTORY')
    expect(result.unmatched).toContainEqual(
      expect.objectContaining({ uploadedHeader: 'Maal ka Naam' })
    )
  })

  it('returns full schema fields list for mapping UI', () => {
    const result = matchColumns([], 'INVENTORY')
    expect(result.schemaFields).toEqual([
      'Item ID', 'Item Name', 'Category', 'Dimensions',
      'Current Stock', 'UOM', 'Min Alert Level', 'Location Bin',
    ])
  })

  it('preserves column index of uploaded file (not schema index)', () => {
    // uploaded file has extra column at start
    const result = matchColumns(['Extra', 'Item ID', 'Item Name'], 'INVENTORY')
    expect(result.matched['Item ID']).toBe(1)   // col 1 in upload
    expect(result.matched['Item Name']).toBe(2) // col 2 in upload
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && npx vitest run src/services/columnMatcher.test.ts
```

Expected: FAIL — `Cannot find module './columnMatcher'`

**Step 3: Create `src/services/columnMatcher.ts`**

```ts
import { SCHEMA_HEADERS, getExpectedHeaders } from './schemaHeaders'
import type { SheetKey } from '../config/sheets'

type ImportableSheetKey = Exclude<SheetKey, 'PRICING'>

// Alias dictionary: uploaded header → canonical schema field name
// Keys are lowercase-trimmed for matching
const ALIASES: Record<string, string> = {
  // Generic
  'client':              'Client Name',
  'customer':            'Client Name',
  'customer name':       'Client Name',
  'party name':          'Client Name',
  'party':               'Client Name',
  'qty':                 'Quantity',
  'quantity':            'Quantity',
  'amount':              'Amount',
  'total amount':        'Amount',
  'date':                'Date',
  'sr no':               'Enquiry ID',
  'sr. no':              'Enquiry ID',
  'serial no':           'Enquiry ID',

  // INVENTORY
  'item':                'Item Name',
  'item name':           'Item Name',
  'material':            'Item Name',
  'stock':               'Current Stock',
  'current stock':       'Current Stock',
  'available stock':     'Current Stock',
  'unit':                'UOM',
  'uom':                 'UOM',
  'min stock':           'Min Alert Level',
  'minimum stock':       'Min Alert Level',
  'min level':           'Min Alert Level',
  'bin':                 'Location Bin',
  'location':            'Location Bin',
  'bin location':        'Location Bin',

  // ENQUIRY
  'enquiry no':          'Enquiry ID',
  'enquiry id':          'Enquiry ID',
  'enq id':              'Enquiry ID',
  'description':         'Item Description',
  'item desc':           'Item Description',
  'item description':    'Item Description',
  'unit cost':           'Unit Cost',
  'rate':                'Unit Cost',
  'price':               'Unit Cost',
  'margin':              'Margin %',
  'margin %':            'Margin %',
  'margin pct':          'Margin %',
  'quote':               'Total Quote',
  'total quote':         'Total Quote',
  'quoted amount':       'Total Quote',
  'enquiry status':      'Status',

  // PRODUCTION
  'job no':              'Job ID',
  'job id':              'Job ID',
  'work order':          'Job ID',
  'stage':               'Stage',
  'current stage':       'Stage',
  'assigned':            'Assigned To',
  'worker':              'Assigned To',
  'assigned to':         'Assigned To',
  'start':               'Start Date',
  'start date':          'Start Date',
  'due':                 'Due Date',
  'due date':            'Due Date',
  'deadline':            'Due Date',
  'est hours':           'Estimated Hours',
  'estimated hours':     'Estimated Hours',
  'actual hours':        'Actual Hours',
  'hours taken':         'Actual Hours',
  'weight':              'Weight (kg)',
  'weight kg':           'Weight (kg)',
  'weight (kg)':         'Weight (kg)',

  // PURCHASE
  'purchase id':         'Purchase ID',
  'purchase no':         'Purchase ID',
  'supplier':            'Supplier',
  'vendor':              'Supplier',
  'vendor name':         'Supplier',
  'gst':                 'GST %',
  'gst %':               'GST %',
  'gst rate':            'GST %',
  'gst amount':          'GST Amount',
  'tax amount':          'GST Amount',
  'total':               'Total',
  'grand total':         'Total',
  'invoice no':          'Invoice No',
  'invoice number':      'Invoice No',
  'bill no':             'Invoice No',
  'bill number':         'Invoice No',
  'invoice date':        'Invoice Date',
  'bill date':           'Invoice Date',
  'payment status':      'Payment Status',
  'paid amount':         'Paid Amount',
  'amount paid':         'Paid Amount',
  'job ref':             'Job Ref',
  'job reference':       'Job Ref',

  // PAYMENT
  'payment id':          'Payment ID',
  'payment no':          'Payment ID',
  'type':                'Type',
  'payment type':        'Type',
  'enquiry ref':         'Enquiry Ref',
  'mode':                'Mode',
  'payment mode':        'Mode',
  'reference':           'Reference',
  'utr':                 'Reference',
  'cheque no':           'Reference',
  'receipt no':          'Receipt No',
  'receipt number':      'Receipt No',
  'notes':               'Notes',
  'remarks':             'Notes',

  // EXPENSE
  'expense id':          'Expense ID',
  'category':            'Category',
  'expense category':    'Category',
  'paid to':             'Paid To',
  'payee':               'Paid To',
  'vendor paid':         'Paid To',
  'gst applicable':      'GST Applicable',
  'gst?':                'GST Applicable',
  'approved by':         'Approved By',
  'approved':            'Approved By',

  // DISPATCH
  'dispatch id':         'Dispatch ID',
  'dispatch no':         'Dispatch ID',
  'delivery mode':       'Delivery Mode',
  'mode of delivery':    'Delivery Mode',
  'transport mode':      'Delivery Mode',
  'delivery address':    'Delivery Address',
  'address':             'Delivery Address',
  'challan no':          'Challan No',
  'challan number':      'Challan No',
  'dc no':               'Challan No',
  'vehicle no':          'Vehicle No',
  'vehicle number':      'Vehicle No',
  'truck no':            'Vehicle No',
  'transporter':         'Transporter',
  'transport':           'Transporter',
  'freight':             'Freight Cost',
  'freight cost':        'Freight Cost',
  'freight charges':     'Freight Cost',
  'packages':            'No of Packages',
  'no of packages':      'No of Packages',
  'boxes':               'No of Packages',
  'received by':         'Received By',
  'receipt date':        'Receipt Date',
  'pod':                 'POD Link',
  'pod link':            'POD Link',
  'proof of delivery':   'POD Link',
  'dispatch status':     'Status',

  // FOLLOWUP
  'followup id':         'Followup ID',
  'follow up id':        'Followup ID',
  'followup date':       'Followup Date',
  'follow up date':      'Followup Date',
  'method':              'Method',
  'contact method':      'Method',
  'outcome':             'Outcome',
  'result':              'Outcome',
  'next action':         'Next Action',
  'action':              'Next Action',
  'next date':           'Next Date',
  'follow up next':      'Next Date',
  'created at':          'Created At',
  'created':             'Created At',
}

export interface UnmatchedColumn {
  uploadedHeader: string
  uploadedIndex: number
}

export interface MatchResult {
  /** schemaField → column index in the uploaded file */
  matched: Record<string, number>
  unmatched: UnmatchedColumn[]
  /** Full ordered list of schema fields (for mapping UI dropdowns) */
  schemaFields: string[]
}

export function matchColumns(
  uploadedHeaders: string[],
  sheetKey: ImportableSheetKey,
): MatchResult {
  const schemaFields = getExpectedHeaders(sheetKey)
  const matched: Record<string, number> = {}
  const unmatched: UnmatchedColumn[] = []

  // Build reverse map: schemaField (lowercase) → canonical name
  const schemaLower = Object.fromEntries(
    schemaFields.map(f => [f.toLowerCase().trim(), f])
  )

  uploadedHeaders.forEach((header, idx) => {
    const key = header.toLowerCase().trim()

    // 1. Exact match against schema field (case-insensitive)
    if (schemaLower[key]) {
      matched[schemaLower[key]] = idx
      return
    }

    // 2. Alias dictionary lookup
    const aliasTarget = ALIASES[key]
    if (aliasTarget && schemaFields.includes(aliasTarget) && !(aliasTarget in matched)) {
      matched[aliasTarget] = idx
      return
    }

    // 3. No match
    unmatched.push({ uploadedHeader: header, uploadedIndex: idx })
  })

  return { matched, unmatched, schemaFields }
}
```

**Step 4: Run test to verify it passes**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && npx vitest run src/services/columnMatcher.test.ts
```

Expected: PASS — 7 tests

**Step 5: Commit**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && git add src/services/columnMatcher.ts src/services/columnMatcher.test.ts && git commit -m "feat: add fuzzy column matcher with 70+ alias dictionary"
```

---

### Task 3: File parser (CSV + XLSX → string[][])

**Files:**
- Create: `src/services/fileParser.ts`
- Create: `src/services/fileParser.test.ts`

**Step 1: Write failing tests**

Create `src/services/fileParser.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseFile, ParsedFile } from './fileParser'

// Helper to create a mock File from string content
function makeFile(content: string, name: string, type = 'text/csv'): File {
  return new File([content], name, { type })
}

describe('parseFile', () => {
  it('parses a simple CSV and returns headers + rows', async () => {
    const csv = 'Item ID,Item Name,Category\nINV001,MS Rod,Raw Material\n'
    const file = makeFile(csv, 'inventory.csv')
    const result: ParsedFile = await parseFile(file)
    expect(result.headers).toEqual(['Item ID', 'Item Name', 'Category'])
    expect(result.rows[0]).toEqual(['INV001', 'MS Rod', 'Raw Material'])
  })

  it('trims whitespace from headers', async () => {
    const csv = ' Item ID , Item Name \nINV001,MS Rod\n'
    const result = await parseFile(makeFile(csv, 'test.csv'))
    expect(result.headers).toEqual(['Item ID', 'Item Name'])
  })

  it('rejects files with no rows', async () => {
    const csv = 'Item ID,Item Name\n'
    const result = await parseFile(makeFile(csv, 'empty.csv'))
    expect(result.error).toMatch(/no data rows/i)
  })

  it('returns fileName in result', async () => {
    const csv = 'A,B\n1,2\n'
    const result = await parseFile(makeFile(csv, 'myfile.csv'))
    expect(result.fileName).toBe('myfile.csv')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && npx vitest run src/services/fileParser.test.ts
```

Expected: FAIL

**Step 3: Create `src/services/fileParser.ts`**

```ts
import * as XLSX from 'xlsx'

export interface ParsedFile {
  fileName: string
  /** First row of the file, trimmed */
  headers: string[]
  /** All subsequent rows as string arrays */
  rows: string[][]
  error?: string
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', raw: false, dateNF: 'yyyy-mm-dd' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  if (!rawRows.length) {
    return { fileName: file.name, headers: [], rows: [], error: 'File is empty' }
  }

  const headers = (rawRows[0] as unknown[]).map(h => String(h ?? '').trim())
  const dataRows = rawRows.slice(1).map(r =>
    (r as unknown[]).map(cell => String(cell ?? '').trim())
  )

  if (!dataRows.length) {
    return { fileName: file.name, headers, rows: [], error: 'No data rows found (only a header row)' }
  }

  return { fileName: file.name, headers, rows: dataRows }
}
```

**Step 4: Run test to verify it passes**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && npx vitest run src/services/fileParser.test.ts
```

Expected: PASS — 4 tests

**Step 5: Commit**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && git add src/services/fileParser.ts src/services/fileParser.test.ts && git commit -m "feat: add SheetJS file parser for CSV and XLSX uploads"
```

---

### Task 4: Import store (localStorage CRUD)

**Files:**
- Create: `src/services/importStore.ts`
- Create: `src/services/importStore.test.ts`

**Step 1: Write failing tests**

Create `src/services/importStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { saveImport, getImport, clearImport, getImportMeta, hasImport } from './importStore'

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
})
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && npx vitest run src/services/importStore.test.ts
```

Expected: FAIL

**Step 3: Create `src/services/importStore.ts`**

```ts
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
```

**Step 4: Run test to verify it passes**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && npx vitest run src/services/importStore.test.ts
```

Expected: PASS — 6 tests

**Step 5: Commit**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && git add src/services/importStore.ts src/services/importStore.test.ts && git commit -m "feat: add localStorage import store with metadata (timestamp, row count)"
```

---

### Task 5: Row assembler — build `string[][]` from match result

**Files:**
- Create: `src/services/rowAssembler.ts`
- Create: `src/services/rowAssembler.test.ts`

The row assembler converts uploaded rows (arbitrary column order) into canonical rows ordered by the schema column index, filling missing fields with `''`.

**Step 1: Write failing tests**

Create `src/services/rowAssembler.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { assembleRows } from './rowAssembler'
import type { MatchResult } from './columnMatcher'

describe('assembleRows', () => {
  it('reorders columns to match schema order', () => {
    // Schema: Item ID(0), Item Name(1), Category(2), ...8 cols
    // Upload has columns in different order
    const matchResult: MatchResult = {
      matched: { 'Item Name': 0, 'Item ID': 1, 'Category': 2 },
      unmatched: [],
      schemaFields: ['Item ID', 'Item Name', 'Category', 'Dimensions', 'Current Stock', 'UOM', 'Min Alert Level', 'Location Bin'],
    }
    const uploadedRows = [['MS Rod', 'INV001', 'Raw Material']]
    const result = assembleRows(uploadedRows, matchResult)
    // result[0][0] = Item ID = 'INV001'
    // result[0][1] = Item Name = 'MS Rod'
    // result[0][2] = Category = 'Raw Material'
    expect(result[0][0]).toBe('INV001')
    expect(result[0][1]).toBe('MS Rod')
    expect(result[0][2]).toBe('Raw Material')
  })

  it('fills unmatched schema columns with empty string', () => {
    const matchResult: MatchResult = {
      matched: { 'Item ID': 0 },
      unmatched: [],
      schemaFields: ['Item ID', 'Item Name', 'Category'],
    }
    const result = assembleRows([['INV001']], matchResult)
    expect(result[0]).toEqual(['INV001', '', ''])
  })

  it('skips header row if uploaded rows include headers', () => {
    // assembleRows only processes data rows — caller strips headers
    const matchResult: MatchResult = {
      matched: { 'Item ID': 0, 'Item Name': 1 },
      unmatched: [],
      schemaFields: ['Item ID', 'Item Name'],
    }
    const result = assembleRows([['INV001', 'MS Rod'], ['INV002', 'SS Rod']], matchResult)
    expect(result).toHaveLength(2)
  })

  it('uses manually mapped columns from overrides', () => {
    // User maps 'Maal ka Naam' (upload col 1) → 'Item Name' (schema field)
    const matchResult: MatchResult = {
      matched: { 'Item ID': 0 },
      unmatched: [{ uploadedHeader: 'Maal ka Naam', uploadedIndex: 1 }],
      schemaFields: ['Item ID', 'Item Name', 'Category'],
    }
    const overrides: Record<string, number> = { 'Item Name': 1 }
    const result = assembleRows([['INV001', 'MS Rod']], matchResult, overrides)
    expect(result[0][1]).toBe('MS Rod')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && npx vitest run src/services/rowAssembler.test.ts
```

Expected: FAIL

**Step 3: Create `src/services/rowAssembler.ts`**

```ts
import type { MatchResult } from './columnMatcher'

/**
 * assembleRows converts uploaded rows (arbitrary column order) into canonical
 * rows ordered by schema field index.
 *
 * @param uploadedRows  Data rows from the uploaded file (headers already stripped)
 * @param matchResult   Output of matchColumns()
 * @param overrides     User-supplied mappings from MappingScreen: schemaField → uploadedColIndex
 */
export function assembleRows(
  uploadedRows: string[][],
  matchResult: MatchResult,
  overrides: Record<string, number> = {},
): string[][] {
  const { matched, schemaFields } = matchResult
  const finalMapping = { ...matched, ...overrides }

  return uploadedRows.map(uploadedRow =>
    schemaFields.map(field => {
      const uploadedColIdx = finalMapping[field]
      if (uploadedColIdx === undefined) return ''
      return uploadedRow[uploadedColIdx] ?? ''
    })
  )
}
```

**Step 4: Run test to verify it passes**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && npx vitest run src/services/rowAssembler.test.ts
```

Expected: PASS — 4 tests

**Step 5: Commit**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && git add src/services/rowAssembler.ts src/services/rowAssembler.test.ts && git commit -m "feat: add row assembler to reorder uploaded columns into schema order"
```

---

### Task 6: PIN context + PinGate component

**Files:**
- Create: `src/contexts/PinContext.tsx`
- Create: `src/components/settings/PinGate.tsx`

> Note: PIN is stored as SHA-256 hash using Web Crypto API. Default PIN is `1234` — user changes it in Settings. No unit tests for UI components (Vitest/jsdom has limited crypto support — just ship it).

**Step 1: Create `src/contexts/PinContext.tsx`**

```tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

const PIN_HASH_KEY = 'smc_pin_hash'
const DEFAULT_PIN = '1234'

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function initDefaultPin() {
  if (!localStorage.getItem(PIN_HASH_KEY)) {
    const hash = await sha256(DEFAULT_PIN)
    localStorage.setItem(PIN_HASH_KEY, hash)
  }
}
initDefaultPin()

interface PinContextValue {
  isUnlocked: boolean
  unlock: (pin: string) => Promise<boolean>
  lock: () => void
  changePin: (newPin: string) => Promise<void>
}

const PinContext = createContext<PinContextValue | null>(null)

export function PinProvider({ children }: { children: ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false)

  const unlock = useCallback(async (pin: string): Promise<boolean> => {
    const stored = localStorage.getItem(PIN_HASH_KEY) ?? ''
    const hash = await sha256(pin)
    if (hash === stored) { setIsUnlocked(true); return true }
    return false
  }, [])

  const lock = useCallback(() => setIsUnlocked(false), [])

  const changePin = useCallback(async (newPin: string) => {
    const hash = await sha256(newPin)
    localStorage.setItem(PIN_HASH_KEY, hash)
  }, [])

  return (
    <PinContext.Provider value={{ isUnlocked, unlock, lock, changePin }}>
      {children}
    </PinContext.Provider>
  )
}

export function usePin() {
  const ctx = useContext(PinContext)
  if (!ctx) throw new Error('usePin must be used within PinProvider')
  return ctx
}
```

**Step 2: Create `src/components/settings/PinGate.tsx`**

```tsx
import { useState, ReactNode } from 'react'
import { usePin } from '../../contexts/PinContext'

export default function PinGate({ children }: { children: ReactNode }) {
  const { isUnlocked, unlock } = usePin()
  const [digits, setDigits] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  if (isUnlocked) return <>{children}</>

  async function handleDigit(d: string) {
    const next = digits + d
    setDigits(next)
    setError(false)
    if (next.length === 4) {
      const ok = await unlock(next)
      if (!ok) {
        setError(true)
        setShake(true)
        setDigits('')
        setTimeout(() => setShake(false), 500)
      }
    }
  }

  function handleClear() { setDigits(''); setError(false) }

  const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="flex flex-col items-center justify-center h-full py-20 gap-6">
      <p className="text-gray-500 text-sm font-medium tracking-widest uppercase">Settings PIN</p>

      {/* Dots */}
      <div className={`flex gap-3 ${shake ? 'animate-bounce' : ''}`}>
        {[0,1,2,3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-colors ${
              i < digits.length ? 'bg-brand border-brand' : 'border-gray-300'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-500 text-sm">Incorrect PIN — try again</p>
      )}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3">
        {PAD.map((key, idx) => {
          if (!key) return <div key={idx} />
          return (
            <button
              key={key}
              onClick={() => key === '⌫' ? handleClear() : handleDigit(key)}
              className="w-16 h-16 rounded-xl bg-white border border-gray-200 text-gray-700 text-xl font-medium hover:bg-gray-50 active:bg-gray-100 shadow-sm transition-colors"
            >
              {key}
            </button>
          )
        })}
      </div>

      <p className="text-gray-400 text-xs mt-2">Default PIN: 1234</p>
    </div>
  )
}
```

**Step 3: Add PinProvider to `src/main.tsx`**

Wrap app in `<PinProvider>`. Open `src/main.tsx` and add:

```tsx
import { PinProvider } from './contexts/PinContext'
// inside render:
<PinProvider>
  <App />
</PinProvider>
```

**Step 4: Commit**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && git add src/contexts/PinContext.tsx src/components/settings/PinGate.tsx src/main.tsx && git commit -m "feat: add PIN context (SHA-256) and PinGate component, default PIN 1234"
```

---

### Task 7: MappingScreen component

**Files:**
- Create: `src/components/settings/MappingScreen.tsx`

The mapping screen is shown when `matchResult.unmatched.length > 0`. Umang assigns each unmatched uploaded column to a schema field (or "Skip").

**Step 1: Create `src/components/settings/MappingScreen.tsx`**

```tsx
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
            className="flex-1 py-2 rounded-xl bg-brand text-white text-sm font-medium hover:bg-brand-dark transition-colors"
          >
            Confirm & Import
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && git add src/components/settings/MappingScreen.tsx && git commit -m "feat: add MappingScreen component for unmatched column resolution"
```

---

### Task 8: ReplaceAppendDialog component

**Files:**
- Create: `src/components/settings/ReplaceAppendDialog.tsx`

**Step 1: Create `src/components/settings/ReplaceAppendDialog.tsx`**

```tsx
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
```

**Step 2: Commit**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && git add src/components/settings/ReplaceAppendDialog.tsx && git commit -m "feat: add ReplaceAppendDialog for re-import choice"
```

---

### Task 9: SheetImportCard component (orchestrates the full import flow)

**Files:**
- Create: `src/components/settings/SheetImportCard.tsx`

This is the main per-sheet upload card that orchestrates: file select → parse → match → mapping screen (if needed) → replace/append dialog (if existing data) → assemble → save.

**Step 1: Create `src/components/settings/SheetImportCard.tsx`**

```tsx
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
```

**Step 2: Commit**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && git add src/components/settings/SheetImportCard.tsx && git commit -m "feat: add SheetImportCard — full import flow (parse→match→map→store)"
```

---

### Task 10: Update `fetchAllSheetData` to read localStorage first

**Files:**
- Modify: `src/services/googleSheets.ts`

**Step 1: Read the current file**

Read `src/services/googleSheets.ts` (already known from context).

**Step 2: Modify `fetchAllRanges` to check localStorage**

Replace `fetchAllRanges` to add a third priority tier:

```ts
import { getImport } from './importStore'

async function fetchAllRanges(): Promise<Record<SheetKey, Row[]>> {
  const keys = Object.keys(SHEET_RANGES) as SheetKey[]

  // Priority 1: localStorage import (per-sheet — falls back per key)
  // Priority 2: Google Sheets API (all-or-nothing batch fetch)
  // Priority 3: Mock data

  const useAPI = Boolean(SPREADSHEET_ID && API_KEY)

  let apiRows: Record<SheetKey, Row[]> | null = null
  if (useAPI) {
    const ranges = Object.values(SHEET_RANGES)
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
    } catch {
      console.warn('[Sheets] API fetch failed, using fallback')
    }
  }

  return Object.fromEntries(
    keys.map(k => {
      const imported = getImport(k)
      if (imported) return [k, imported]                          // localStorage first
      if (apiRows) return [k, apiRows[k]]                        // API second
      return [k, MOCK_ROWS[k as keyof typeof MOCK_ROWS] ?? []]  // mock last
    })
  ) as Record<SheetKey, Row[]>
}
```

Also add a helper to report data source per sheet (used by Header badge):

```ts
export type DataSource = 'imported' | 'live' | 'mock'

export function getDataSource(key: SheetKey): DataSource {
  const { getImport } = require('./importStore')  // dynamic to avoid circular
  if (getImport(key)) return 'imported'
  if (SPREADSHEET_ID && API_KEY) return 'live'
  return 'mock'
}
```

> Note: use a static import at the top instead of dynamic require — just move import to top of file.

**Full replacement for `fetchAllRanges` in `src/services/googleSheets.ts`:**

```ts
import { getImport, getImportedSheetKeys } from './importStore'

// ... (keep fetchRange as-is)

async function fetchAllRanges(): Promise<Record<SheetKey, Row[]>> {
  const keys = Object.keys(SHEET_RANGES) as SheetKey[]
  const ranges = Object.values(SHEET_RANGES)
  const useAPI = Boolean(SPREADSHEET_ID && API_KEY)

  let apiRows: Record<SheetKey, Row[]> | null = null

  if (useAPI) {
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
      if (apiRows)            return [k, apiRows[k]]
      return [k, MOCK_ROWS[k as keyof typeof MOCK_ROWS] ?? []]
    })
  ) as Record<SheetKey, Row[]>
}

export type DataSource = 'imported' | 'live' | 'mock'

export function getOverallDataSource(): DataSource {
  const importedKeys = getImportedSheetKeys()
  if (importedKeys.length > 0) return 'imported'
  if (SPREADSHEET_ID && API_KEY) return 'live'
  return 'mock'
}
```

**Step 3: Commit**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && git add src/services/googleSheets.ts && git commit -m "feat: googleSheets reads localStorage imports first, then API, then mock"
```

---

### Task 11: SettingsPage + sidebar entry + route

**Files:**
- Create: `src/pages/SettingsPage.tsx`
- Modify: `src/App.tsx` (add `/settings` route)
- Modify: `src/components/layout/Sidebar.tsx` (add gear icon at bottom)

**Step 1: Create `src/pages/SettingsPage.tsx`**

```tsx
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
    <div className="p-6 max-w-2xl mx-auto space-y-8">

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
```

**Step 2: Add route to `src/App.tsx`**

```tsx
import SettingsPage from './pages/SettingsPage'
// inside <Routes>:
<Route path="/settings" element={<SettingsPage />} />
```

**Step 3: Add ⚙ gear to `src/components/layout/Sidebar.tsx`**

After the `<nav>` block and before the `<div>` with REFRESH_LABEL, add:

```tsx
import { NavLink, Link } from 'react-router-dom'

// at the bottom of sidebar, above refresh label div:
<div className="px-3 pb-1">
  <NavLink
    to="/settings"
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-brand-light text-white'
          : 'text-blue-200 hover:bg-brand-light hover:text-white'
      }`
    }
  >
    <span className="text-base">⚙</span>
    Settings
  </NavLink>
</div>
```

**Step 4: Commit**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && git add src/pages/SettingsPage.tsx src/App.tsx src/components/layout/Sidebar.tsx && git commit -m "feat: add Settings page with import UI, PIN change, and sync button; add route + sidebar entry"
```

---

### Task 12: Header data source badge

**Files:**
- Modify: `src/components/layout/Header.tsx` (or `DashboardShell.tsx` — wherever the top bar lives)

**Step 1: Read the header/shell component**

Read `src/components/layout/DashboardShell.tsx` to find where the top bar is rendered.

**Step 2: Add data source badge**

Add a small badge showing the current data source:

```tsx
import { getOverallDataSource } from '../../services/googleSheets'
import { getImportedSheetKeys } from '../../services/importStore'

// inside component:
const source = getOverallDataSource()
const importedCount = getImportedSheetKeys().length

const badge = source === 'imported'
  ? { label: `${importedCount} sheets imported`, color: 'bg-green-100 text-green-700' }
  : source === 'live'
  ? { label: 'Live', color: 'bg-blue-100 text-blue-700' }
  : { label: 'Mock data', color: 'bg-gray-100 text-gray-500' }
```

Render: `<span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.color}`}>{badge.label}</span>`

**Step 3: Commit**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && git add src/components/layout/ && git commit -m "feat: header shows data source badge (imported/live/mock)"
```

---

### Task 13: Full run — tests, type-check, build, visual verify

**Step 1: Run all tests**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && npx vitest run
```

Expected: All existing tests + new ones pass (≥30 total). Zero failures.

**Step 2: TypeScript check**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && npx tsc --noEmit
```

Expected: No errors.

**Step 3: Build**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && npm run build
```

Expected: Clean build, no warnings.

**Step 4: Visual check via preview**

Navigate to `/settings` in preview, verify:
- PIN gate appears, default PIN `1234` unlocks it
- 8 SheetImportCard rows visible, all showing "No data"
- Upload a CSV to one sheet, verify "Imported" badge appears with row count
- Navigate to `/financial`, verify dashboard still loads (uses mock for unimported sheets)
- Return to `/settings`, click "Sync Dashboard", verify TanStack Query refetches
- Lock and unlock with PIN

**Step 5: Final commit**

```bash
cd /Users/ashish/claude/smc/smc-dashboard && git add -A && git commit -m "feat: complete PIN-protected sheet import feature — all tests pass, TSC clean"
```

---

## Summary

| Task | Description | Tests |
|------|-------------|-------|
| 1 | SchemaHeaders + install xlsx | 3 |
| 2 | Column matcher + alias dictionary | 7 |
| 3 | File parser (CSV/XLSX) | 4 |
| 4 | Import store (localStorage) | 6 |
| 5 | Row assembler | 4 |
| 6 | PIN context + PinGate | — |
| 7 | MappingScreen component | — |
| 8 | ReplaceAppendDialog | — |
| 9 | SheetImportCard | — |
| 10 | Update googleSheets.ts data priority | — |
| 11 | SettingsPage + route + sidebar | — |
| 12 | Header data source badge | — |
| 13 | Full verification | all |

**Total new unit tests: 24**
