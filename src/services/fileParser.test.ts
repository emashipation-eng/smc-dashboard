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
