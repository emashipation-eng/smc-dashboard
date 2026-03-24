export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatCompactINR(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)}Cr`
  if (amount >= 1_00_000)    return `₹${(amount / 1_00_000).toFixed(2)}L`
  if (amount >= 1_000)       return `₹${(amount / 1_000).toFixed(1)}K`
  return formatINR(amount)
}

export function formatPct(value: number): string {
  return `${value.toFixed(2)}%`
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short'
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}
