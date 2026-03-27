# Live Google Sheets Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Connect the dashboard directly to Umang's private Google Sheets via an Apps Script proxy Web App, eliminating the need for manual file imports.

**Architecture:** A new `DataAPI.gs` Apps Script (deployed under Umang's account) reads his private sheets, remaps his column headers to our schema order, and returns clean JSON. The dashboard's `googleSheets.ts` gets a new `VITE_APPS_SCRIPT_URL` env var and calls the Script URL as its highest-priority data source (after localStorage imports, above mock data).

**Tech Stack:** Google Apps Script, Vite env vars (`import.meta.env`), Vitest for frontend tests, `fetch` API, Vercel environment variables.

---

### Task 1: Add `fetchFromAppsScript` to `googleSheets.ts`

**Files:**
- Modify: `src/services/googleSheets.ts`
- Create: `src/services/googleSheets.test.ts`

**Context:**
The current priority order in `fetchAllRanges` is: localStorage import → raw Sheets API → mock.
We're inserting Apps Script between localStorage import and raw Sheets API.
`APPS_SCRIPT_URL` comes from `import.meta.env.VITE_APPS_SCRIPT_URL`.

**Step 1: Write failing tests**

Create `src/services/googleSheets.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We test getOverallDataSource which is exported and reflects env state
// We test fetchAllSheetData by stubbing global fetch

describe('getOverallDataSource', () => {
  const originalEnv = { ...import.meta.env }

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns "live" when VITE_APPS_SCRIPT_URL is set', async () => {
    vi.stubEnv('VITE_APPS_SCRIPT_URL', 'https://script.google.com/macros/s/test/exec')
    // Re-import to pick up new env
    const { getOverallDataSource } = await import('./googleSheets?t=' + Date.now())
    expect(getOverallDataSource()).toBe('live')
  })

  it('returns "mock" when no URL or API key is set', async () => {
    vi.stubEnv('VITE_APPS_SCRIPT_URL', '')
    vi.stubEnv('VITE_SPREADSHEET_ID', '')
    vi.stubEnv('VITE_GOOGLE_API_KEY', '')
    const { getOverallDataSource } = await import('./googleSheets?t=' + Date.now())
    expect(getOverallDataSource()).toBe('mock')
  })
})

describe('fetchAllSheetData — Apps Script path', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_APPS_SCRIPT_URL', 'https://script.google.com/macros/s/test/exec')
    vi.stubEnv('VITE_SPREADSHEET_ID', '')
    vi.stubEnv('VITE_GOOGLE_API_KEY', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('uses Apps Script data when URL is set and fetch succeeds', async () => {
    const mockRows = {
      INVENTORY:  [['INV001', 'MS Rod', 'Raw Material', '', '50', 'kg', '10', '']],
      ENQUIRY:    [],
      PRODUCTION: [],
      PURCHASE:   [],
      PAYMENT:    [],
      EXPENSE:    [],
      DISPATCH:   [],
      FOLLOWUP:   [],
      PRICING:    [],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRows),
    }))
    const { fetchAllSheetData } = await import('./googleSheets?t=' + Date.now())
    const data = await fetchAllSheetData()
    expect(data.inventory[0].itemId).toBe('INV001')
    expect(fetch).toHaveBeenCalledWith('https://script.google.com/macros/s/test/exec')
  })

  it('falls back to mock when Apps Script fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    const { fetchAllSheetData } = await import('./googleSheets?t=' + Date.now())
    const data = await fetchAllSheetData()
    // Mock data has inventory entries
    expect(Array.isArray(data.inventory)).toBe(true)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
cd /Users/ashish/claude/smc/smc-dashboard
npx vitest run src/services/googleSheets.test.ts
```
Expected: FAIL — `googleSheets.test.ts` errors or assertions fail since `VITE_APPS_SCRIPT_URL` isn't read yet.

**Step 3: Implement the changes in `googleSheets.ts`**

Add near top, after existing const declarations:
```typescript
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined
```

Add new function after `fetchRange`:
```typescript
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
```

Update `fetchAllRanges` to insert Apps Script between localStorage and raw API:
```typescript
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
```

Update `getOverallDataSource` to treat Apps Script URL as 'live':
```typescript
export function getOverallDataSource(): DataSource {
  const importedKeys = getImportedSheetKeys()
  if (importedKeys.length > 0) return 'imported'
  if (APPS_SCRIPT_URL || (SPREADSHEET_ID && API_KEY)) return 'live'
  return 'mock'
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run src/services/googleSheets.test.ts
```
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/services/googleSheets.ts src/services/googleSheets.test.ts
git commit -m "feat: add Apps Script proxy data source to googleSheets service"
```

---

### Task 2: Create `DataAPI.gs` Apps Script file

**Files:**
- Create: `apps-script/DataAPI.gs`

**Context:**
This file is saved in the repo for version control but deployed manually in Google Apps Script editor.
It must be attached to Umang's spreadsheet or a standalone project with access to it.
The `COLUMN_MAP` entries use placeholder header names — these will be updated in Task 3
once we inspect Umang's actual sheet headers.

**Note:** No Vitest test for this file — Apps Script runs server-side in Google's runtime.
Verification is done manually in Task 4 by calling the deployed URL.

**Step 1: Create the file**

Create `apps-script/DataAPI.gs`:

```javascript
/**
 * DataAPI.gs — SMC Dashboard Data Proxy
 * Deployed as a Web App under Umang's Google account.
 * Reads private sheets, remaps columns to dashboard schema, returns JSON.
 *
 * Deploy settings:
 *   Execute as: Me (Umang's account)
 *   Who has access: Anyone
 */

// ─── CONFIG ────────────────────────────────────────────────────────────────
// Umang's spreadsheet ID (from the URL: /spreadsheets/d/<ID>/edit)
const SPREADSHEET_ID = 'REPLACE_WITH_UMANG_SPREADSHEET_ID';

/**
 * SHEET_CONFIG — one entry per sheet key.
 *
 * tabName:  Umang's actual Google Sheet tab name (exact, case-sensitive)
 * columns:  number of columns in our schema for this sheet
 * map:      { "Umang's actual column header": ourSchemaColumnIndex }
 *
 * Schema column indexes match src/config/sheets.ts COL definitions.
 * Fill in the map after inspecting Umang's actual headers (Task 3).
 */
const SHEET_CONFIG = {
  INVENTORY: {
    tabName: 'Master_Inventory',   // ← update to Umang's actual tab name
    columns: 8,
    map: {
      // 'Umang header':  schemaIndex
      // Example — replace with actual headers after inspection:
      'Item ID':         0,
      'Item Name':       1,
      'Category':        2,
      'Dimensions':      3,
      'Current Stock':   4,
      'UOM':             5,
      'Min Alert Level': 6,
      'Location Bin':    7,
    }
  },
  ENQUIRY: {
    tabName: 'Enquiry_Master',
    columns: 9,
    map: {
      'Enquiry ID':     0,
      'Timestamp':      1,
      'Client Name':    2,
      'Item Desc':      3,
      'Quantity':       4,
      'Unit Cost':      5,
      'Margin %':       6,
      'Total Quote':    7,
      'Status':         8,
    }
  },
  PRODUCTION: {
    tabName: 'Production_Queue',
    columns: 10,
    map: {
      'Job ID':          0,
      'Client Name':     1,
      'Stage':           2,
      'Assigned To':     3,
      'Status':          4,
      'Start Date':      5,
      'Due Date':        6,
      'Est. Hours':      7,
      'Actual Hours':    8,
      'Weight (kg)':     9,
    }
  },
  PURCHASE: {
    tabName: 'Purchase_Register',
    columns: 16,
    map: {
      'Purchase ID':     0,
      'Date':            1,
      'Supplier':        2,
      'Item ID':         3,
      'Item Desc':       4,
      'Quantity':        5,
      'Rate':            6,
      'Amount':          7,
      'GST %':           8,
      'GST Amount':      9,
      'Total':          10,
      'Invoice No':     11,
      'Invoice Date':   12,
      'Payment Status': 13,
      'Paid Amount':    14,
      'Job Ref':        15,
    }
  },
  PAYMENT: {
    tabName: 'Payment_Tracker',
    columns: 10,
    map: {
      'Payment ID':   0,
      'Date':         1,
      'Type':         2,
      'Enquiry Ref':  3,
      'Client Name':  4,
      'Amount':       5,
      'Mode':         6,
      'Reference':    7,
      'Receipt No':   8,
      'Notes':        9,
    }
  },
  EXPENSE: {
    tabName: 'Expense_Ledger',
    columns: 11,
    map: {
      'Expense ID':    0,
      'Date':          1,
      'Category':      2,
      'Description':   3,
      'Amount':        4,
      'GST Applicable':5,
      'GST Amount':    6,
      'Paid To':       7,
      'Job Ref':       8,
      'Payment Mode':  9,
      'Approved By':  10,
    }
  },
  DISPATCH: {
    tabName: 'Dispatch_Log',
    columns: 16,
    map: {
      'Dispatch ID':      0,
      'Date':             1,
      'Job Ref':          2,
      'Client Name':      3,
      'Delivery Mode':    4,
      'Delivery Address': 5,
      'Challan No':       6,
      'Vehicle No':       7,
      'Transporter':      8,
      'Freight Cost':     9,
      'Weight (kg)':     10,
      'No of Packages':  11,
      'Received By':     12,
      'Receipt Date':    13,
      'POD Link':        14,
      'Status':          15,
    }
  },
  FOLLOWUP: {
    tabName: 'Followup_Log',
    columns: 11,
    map: {
      'Followup ID':  0,
      'Enquiry Ref':  1,
      'Client Name':  2,
      'Followup Date':3,
      'Method':       4,
      'Assigned To':  5,
      'Notes':        6,
      'Outcome':      7,
      'Next Action':  8,
      'Next Date':    9,
      'Created At':  10,
    }
  },
  PRICING: {
    tabName: 'Price_Registry',
    columns: 5,
    map: {
      'Material Code': 0,
      'Supplier':      1,
      'Current Rate':  2,
      'Last Updated':  3,
      'Tax %':         4,
    }
  },
};
// ─── END CONFIG ────────────────────────────────────────────────────────────

/**
 * HTTP GET handler — entry point for the Web App.
 * Returns all sheet data as JSON in dashboard schema format.
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const result = {};

    for (const [key, config] of Object.entries(SHEET_CONFIG)) {
      try {
        const sheet = ss.getSheetByName(config.tabName);
        if (!sheet) {
          Logger.log(`[DataAPI] Tab not found: ${config.tabName}`);
          result[key] = [];
          continue;
        }

        const range = sheet.getDataRange();
        const data  = range.getValues();

        if (data.length < 2) {
          result[key] = [];
          continue;
        }

        const headers = data[0].map(h => String(h).trim());
        const rows    = data.slice(1);

        result[key] = rows
          .filter(row => row.some(cell => cell !== ''))  // skip blank rows
          .map(row => remapRow(row, headers, config.map, config.columns));

      } catch (sheetErr) {
        Logger.log(`[DataAPI] Error reading ${key}: ${sheetErr}`);
        result[key] = [];
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log(`[DataAPI] Fatal error: ${err}`);
    return ContentService
      .createTextOutput(JSON.stringify({ error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Remaps a row from Umang's column order to our schema column order.
 * Unknown columns are silently dropped; missing schema columns stay ''.
 */
function remapRow(row, headers, columnMap, totalCols) {
  const output = new Array(totalCols).fill('');
  for (const [headerName, targetIndex] of Object.entries(columnMap)) {
    const sourceIndex = headers.indexOf(headerName);
    if (sourceIndex !== -1 && sourceIndex < row.length) {
      const val = row[sourceIndex];
      output[targetIndex] = val instanceof Date
        ? Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd')
        : String(val ?? '');
    }
  }
  return output;
}

/**
 * Helper — run this manually in Apps Script editor to print Umang's
 * actual tab names and first-row headers. Use output to fill in SHEET_CONFIG.
 */
function inspectHeaders() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  ss.getSheets().forEach(sheet => {
    const name = sheet.getName();
    const firstRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log(`\n=== ${name} ===`);
    firstRow.forEach((h, i) => Logger.log(`  [${i}] "${h}"`));
  });
}
```

**Step 2: Commit**

```bash
git add apps-script/DataAPI.gs
git commit -m "feat: add DataAPI.gs Apps Script proxy for live Google Sheets integration"
```

---

### Task 3: Inspect Umang's Sheets & Update COLUMN_MAP

**Files:**
- Modify: `apps-script/DataAPI.gs` (update `SHEET_CONFIG` map entries)

**Context:**
This is a one-time setup step done manually using Umang's Google account.
The `inspectHeaders()` helper function in `DataAPI.gs` prints all tab names and headers to the Apps Script log.

**Step 1: Open Apps Script editor**

1. Open Umang's Google Spreadsheet
2. Go to **Extensions → Apps Script**
3. Paste the full contents of `apps-script/DataAPI.gs` into the editor
4. Set `SPREADSHEET_ID` to the actual spreadsheet ID (from the sheet URL)
5. Click **Run → inspectHeaders**
6. Click **View → Logs** — copy the full output

**Step 2: Update `SHEET_CONFIG` in `DataAPI.gs`**

Using the logged headers, update each `map` entry in `SHEET_CONFIG` to match Umang's actual column headers exactly. For example, if his Inventory tab has `"Item Code"` instead of `"Item ID"`, change:

```javascript
// Before:
'Item ID': 0,
// After:
'Item Code': 0,
```

Repeat for every sheet. Headers not in Umang's sheet simply get removed from the map (they'll default to empty string in the output).

**Step 3: Update `tabName` entries**

If any of Umang's tab names differ from the defaults in `SHEET_CONFIG`, update them to match exactly (case-sensitive).

**Step 4: Commit the updated map**

```bash
git add apps-script/DataAPI.gs
git commit -m "config: update DataAPI.gs COLUMN_MAP with Umang's actual sheet headers"
```

---

### Task 4: Deploy Apps Script & Wire Up Vercel

**Files:**
- No code changes — this is a deploy + config task

**Context:**
Apps Script Web Apps are deployed from the editor UI. The resulting URL is a permanent
`https://script.google.com/macros/s/<ID>/exec` URL that doesn't change between code updates
(use "Deploy → Manage deployments → Edit" to update, not create new).

**Step 1: Deploy as Web App**

In Apps Script editor:
1. **Deploy → New deployment**
2. Click the gear icon → select **Web App**
3. Description: `SMC Dashboard Data API`
4. Execute as: **Me** (Umang's account)
5. Who has access: **Anyone**
6. Click **Deploy**
7. Copy the Web App URL (format: `https://script.google.com/macros/s/.../exec`)

**Step 2: Test the URL manually**

Open the URL in a browser — it should return a JSON object with keys:
`INVENTORY`, `ENQUIRY`, `PRODUCTION`, `PURCHASE`, `PAYMENT`, `EXPENSE`, `DISPATCH`, `FOLLOWUP`, `PRICING`

Each value should be an array of arrays (rows). Verify a few values match Umang's actual sheet data.

If any tab returns `[]` unexpectedly — check the Apps Script **Logs** (View → Logs) for error messages.

**Step 3: Add env var to Vercel**

1. Open [vercel.com/dashboard](https://vercel.com) → `smc-dashboard` project
2. **Settings → Environment Variables**
3. Add: `VITE_APPS_SCRIPT_URL` = `<the URL from Step 1>`
4. Scope: Production (and Preview if desired)
5. Save

**Step 4: Redeploy dashboard**

```bash
cd /Users/ashish/claude/smc/smc-dashboard
vercel deploy --prod
```

**Step 5: Verify live data in dashboard**

Open the dashboard URL in browser (on mobile data or via VPN):
- Header badge should show **"Live"** (not "Mock data")
- Financial metrics should reflect Umang's actual data
- Check at least one number against the source sheet to confirm correctness

---

### Task 5: Push to GitHub (auto-deploy for future)

**Files:** No code changes

**Step 1: Push all commits**

```bash
cd /Users/ashish/claude/smc/smc-dashboard
git push origin main
```

Future updates to `DataAPI.gs` (e.g. when Umang adds a new sheet tab) only require:
1. Update `SHEET_CONFIG` in `apps-script/DataAPI.gs`
2. In Apps Script editor: paste updated code → Deploy → Manage deployments → Edit → Deploy
3. No dashboard redeploy needed (same URL)

---

## Summary

| Task | What | Where |
|------|------|-------|
| 1 | `fetchFromAppsScript()` + tests | `src/services/googleSheets.ts` |
| 2 | `DataAPI.gs` proxy script | `apps-script/DataAPI.gs` |
| 3 | Fill in Umang's actual column names | `apps-script/DataAPI.gs` SHEET_CONFIG |
| 4 | Deploy Web App + Vercel env var | Apps Script UI + Vercel dashboard |
| 5 | Push to GitHub | `git push` |
