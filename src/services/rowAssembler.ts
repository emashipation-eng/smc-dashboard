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
