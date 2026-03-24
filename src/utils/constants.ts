export const PRODUCTION_STAGES  = ['Cutting','Welding','Paint','QC','Dispatch'] as const
export const ENQUIRY_STATUSES   = ['Quoted','PO Received','Rejected','Expired'] as const
export const PAYMENT_MODES      = ['Cash','Cheque','NEFT','UPI','RTGS'] as const
export const EXPENSE_CATEGORIES = ['Freight','Labor','Power','Consumables','Rent','Misc'] as const
export const DELIVERY_MODES     = ['Self-Pickup','By Road','By Rail','By Air'] as const

export const STAGE_ORDER: Record<string, number> = {
  Cutting: 1, Welding: 2, Paint: 3, QC: 4, Dispatch: 5,
}

export const STATUS_COLOR: Record<string, string> = {
  'Pending':     'bg-yellow-100 text-yellow-800',
  'In-Progress': 'bg-blue-100 text-blue-800',
  'Complete':    'bg-green-100 text-green-800',
  'Quoted':      'bg-purple-100 text-purple-800',
  'PO Received': 'bg-green-100 text-green-800',
  'Rejected':    'bg-red-100 text-red-800',
  'Expired':     'bg-gray-100 text-gray-600',
  'In-Transit':  'bg-blue-100 text-blue-800',
  'Delivered':   'bg-green-100 text-green-800',
  'Returned':    'bg-red-100 text-red-800',
}

export const REFRESH_INTERVAL_MS = 5 * 60 * 1000  // 5 minutes
export const CACHE_TTL_MS        = 5 * 60 * 1000
