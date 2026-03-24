import { describe, it, expect } from 'vitest'
import { fetchAllSheetData } from '../services/googleSheets'

describe('fetchAllSheetData', () => {
  it('returns typed data from mock when no credentials configured', async () => {
    const data = await fetchAllSheetData()
    expect(data.inventory.length).toBeGreaterThan(0)
    expect(data.inventory[0].itemId).toBe('SMC-0001')
    expect(data.enquiries[0].status).toBe('PO Received')
    expect(data.enquiries[0].totalQuote).toBe(103500)
  })
})
