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
