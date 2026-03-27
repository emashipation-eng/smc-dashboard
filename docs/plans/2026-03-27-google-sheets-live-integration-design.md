# Design: Live Google Sheets Integration via Apps Script Proxy

**Date:** 2026-03-27
**Status:** Approved
**Scope:** Included in original proposal (Work Areas 3 & 4)

## Problem

Umang's Google Sheets are private (API key won't work) and have different column names
than the dashboard schema. The current dashboard uses mock data or the manual file-import
flow. The goal is to connect directly to his live sheets so the dashboard always shows real,
up-to-date data without any manual effort from Umang.

## Chosen Approach: Apps Script Proxy API (Option B)

A new Apps Script file (`DataAPI.gs`) deployed as a Web App under Umang's Google account.

**Why this approach:**
- Runs under Umang's account — natural read access to all his private sheets
- No credentials or API keys needed in the frontend
- Column remapping handled once in the Script, never touches the dashboard schema
- No Google Cloud project or OAuth consent screen required
- Existing import flow and mock fallback remain as backup

## Architecture

```
Umang's Google Sheets (private)
        ↓  (Apps Script reads with owner account access)
DataAPI.gs  →  column remapping  →  JSON response
        ↓  (single fetch call)
googleSheets.ts  →  dataTransform  →  charts & metrics
```

## Components

### 1. DataAPI.gs (new — Apps Script)
- `doGet(e)` web app entry point, returns `ContentService` JSON
- Reads all 8 sheet tabs from Umang's spreadsheet
- Remaps his column names to our schema (one-time hardcoded config)
- Returns a single JSON object with all sheet data in schema order
- Deployed as: Execute as **Me (Umang)**, Access: **Anyone**

### 2. columnMap config (inside DataAPI.gs)
A `COLUMN_MAP` constant per sheet that maps Umang's actual header names to our schema
field positions. Set once during setup by inspecting his actual sheet headers.

```js
const COLUMN_MAP = {
  INVENTORY: { 'Item': 0, 'Name': 1, 'Cat': 2, ... },
  ENQUIRY:   { 'Client': 2, 'Qty': 4, ... },
  // etc.
}
```

### 3. googleSheets.ts (updated — dashboard)
- New env var: `VITE_APPS_SCRIPT_URL`
- Priority order: **imported (localStorage) → Apps Script URL → raw Sheets API → mock**
- Single `fetchFromAppsScript()` function replaces the batchGet Sheets API call
- All existing `dataTransform` functions remain unchanged

### 4. Environment variable (Vercel)
- `VITE_APPS_SCRIPT_URL` = deployed Apps Script web app URL
- Set once in Vercel dashboard → auto-applies on next deploy
- No secrets/credentials — the URL itself is the only config needed

## Setup Process (one-time)

1. Open Umang's Google Sheets → note actual tab names and column headers
2. Create `DataAPI.gs` in Apps Script (attached to his spreadsheet)
3. Fill in `COLUMN_MAP` based on his actual headers
4. Deploy as Web App (Execute as Me, Anyone can access)
5. Copy the deployment URL → add to Vercel as `VITE_APPS_SCRIPT_URL`
6. Redeploy dashboard → dashboard now shows live data

## What Stays Unchanged

- All `dataTransform` functions — they receive the same row format
- All dashboard pages, charts, metrics — zero changes needed
- Settings import flow — stays as manual override/fallback
- Mock data fallback — still works if URL not set

## Exclusions

- No write-back to sheets (read-only)
- No real-time push (dashboard polls on page load + auto-refresh interval)
- Column mapping is hardcoded, not a UI-configurable feature
