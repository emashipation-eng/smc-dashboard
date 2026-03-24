import { useMemo } from 'react'
import { useSheetData } from './useSheetData'

export function useInventory() {
  const { data, isLoading, error } = useSheetData()

  const metrics = useMemo(() => {
    if (!data) return null
    const { inventory } = data

    const lowStock = inventory.filter(i => i.currentStock <= i.minAlertLevel)
    const critical  = inventory.filter(i => i.currentStock === 0)

    const stockWithStatus = inventory.map(item => ({
      ...item,
      stockStatus:
        item.currentStock === 0                ? 'critical' as const :
        item.currentStock <= item.minAlertLevel ? 'low'      as const : 'ok' as const,
    }))

    return { inventory: stockWithStatus, lowStock, critical, totalItems: inventory.length }
  }, [data])

  return { metrics, isLoading, error }
}
