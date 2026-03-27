import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We test getOverallDataSource which is exported and reflects env state
// We test fetchAllSheetData by stubbing global fetch

describe('getOverallDataSource', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('returns "live" when VITE_APPS_SCRIPT_URL is set', async () => {
    vi.stubEnv('VITE_APPS_SCRIPT_URL', 'https://script.google.com/macros/s/test/exec')
    vi.resetModules()
    const { getOverallDataSource } = await import('./googleSheets')
    expect(getOverallDataSource()).toBe('live')
  })

  it('returns "mock" when no URL or API key is set', async () => {
    vi.stubEnv('VITE_APPS_SCRIPT_URL', '')
    vi.stubEnv('VITE_SPREADSHEET_ID', '')
    vi.stubEnv('VITE_GOOGLE_API_KEY', '')
    vi.resetModules()
    const { getOverallDataSource } = await import('./googleSheets')
    expect(getOverallDataSource()).toBe('mock')
  })
})

describe('fetchAllSheetData — Apps Script path', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_APPS_SCRIPT_URL', 'https://script.google.com/macros/s/test/exec')
    vi.stubEnv('VITE_SPREADSHEET_ID', '')
    vi.stubEnv('VITE_GOOGLE_API_KEY', '')
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('uses Apps Script data when URL is set and fetch succeeds', async () => {
    const mockRows = {
      INVENTORY:  [
        ['Item ID', 'Name', 'Category', 'Sub', 'Qty', 'Unit', 'Price', 'Notes'],
        ['INV001', 'MS Rod', 'Raw Material', '', '50', 'kg', '10', ''],
      ],
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
    const { fetchAllSheetData } = await import('./googleSheets')
    const data = await fetchAllSheetData()
    expect(data.inventory[0].itemId).toBe('INV001')
    expect(fetch).toHaveBeenCalledWith('https://script.google.com/macros/s/test/exec')
  })

  it('falls back to mock when Apps Script fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    const { fetchAllSheetData } = await import('./googleSheets')
    const data = await fetchAllSheetData()
    // Mock data has inventory entries
    expect(Array.isArray(data.inventory)).toBe(true)
  })
})
