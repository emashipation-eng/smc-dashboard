import { useQuery } from '@tanstack/react-query'
import { fetchAllSheetData, AllSheetData } from '../services/googleSheets'

export function useSheetData() {
  return useQuery<AllSheetData, Error>({
    queryKey: ['sheetData'],
    queryFn: fetchAllSheetData,
    staleTime: 5 * 60 * 1000,
  })
}
