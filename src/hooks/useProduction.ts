import { useMemo } from 'react'
import { useSheetData } from './useSheetData'
import { PRODUCTION_STAGES } from '../utils/constants'

export function useProduction() {
  const { data, isLoading, error } = useSheetData()

  const metrics = useMemo(() => {
    if (!data) return null
    const { production, dispatches } = data

    const activeJobs = production.filter(j => j.status !== 'Complete')
    const today = new Date().toISOString().split('T')[0]

    const delayed = activeJobs.filter(j => j.dueDate && j.dueDate < today)

    const byStage = PRODUCTION_STAGES.map(stage => ({
      stage,
      count: production.filter(j => j.stage === stage && j.status !== 'Complete').length,
    }))

    const pendingDeliveries = dispatches.filter(d => d.status === 'In-Transit')
    const todayDispatches   = dispatches.filter(d => d.date === today)

    return { activeJobs, delayed, byStage, pendingDeliveries, todayDispatches }
  }, [data])

  return { metrics, isLoading, error }
}
