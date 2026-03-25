import { getExpectedHeaders } from './schemaHeaders'
import type { SheetKey } from '../config/sheets'

type ImportableSheetKey = Exclude<SheetKey, 'PRICING'>

// Alias dictionary: uploaded header → canonical schema field name
// Keys are lowercase-trimmed for matching
const ALIASES: Record<string, string> = {
  // Generic
  'client':              'Client Name',
  'customer':            'Client Name',
  'customer name':       'Client Name',
  'party name':          'Client Name',
  'party':               'Client Name',
  'qty':                 'Quantity',
  'quantity':            'Quantity',
  'amount':              'Amount',
  'total amount':        'Amount',
  'date':                'Date',
  'sr no':               'Enquiry ID',
  'sr. no':              'Enquiry ID',
  'serial no':           'Enquiry ID',

  // INVENTORY
  'item':                'Item Name',
  'item name':           'Item Name',
  'material':            'Item Name',
  'stock':               'Current Stock',
  'current stock':       'Current Stock',
  'available stock':     'Current Stock',
  'unit':                'UOM',
  'uom':                 'UOM',
  'min stock':           'Min Alert Level',
  'minimum stock':       'Min Alert Level',
  'min level':           'Min Alert Level',
  'bin':                 'Location Bin',
  'location':            'Location Bin',
  'bin location':        'Location Bin',

  // ENQUIRY
  'enquiry no':          'Enquiry ID',
  'enquiry id':          'Enquiry ID',
  'enq id':              'Enquiry ID',
  'description':         'Item Description',
  'item desc':           'Item Description',
  'item description':    'Item Description',
  'unit cost':           'Unit Cost',
  'rate':                'Unit Cost',
  'price':               'Unit Cost',
  'margin':              'Margin %',
  'margin %':            'Margin %',
  'margin pct':          'Margin %',
  'quote':               'Total Quote',
  'total quote':         'Total Quote',
  'quoted amount':       'Total Quote',
  'enquiry status':      'Status',

  // PRODUCTION
  'job no':              'Job ID',
  'job id':              'Job ID',
  'work order':          'Job ID',
  'stage':               'Stage',
  'current stage':       'Stage',
  'assigned':            'Assigned To',
  'worker':              'Assigned To',
  'assigned to':         'Assigned To',
  'start':               'Start Date',
  'start date':          'Start Date',
  'due':                 'Due Date',
  'due date':            'Due Date',
  'deadline':            'Due Date',
  'est hours':           'Estimated Hours',
  'estimated hours':     'Estimated Hours',
  'actual hours':        'Actual Hours',
  'hours taken':         'Actual Hours',
  'weight':              'Weight (kg)',
  'weight kg':           'Weight (kg)',
  'weight (kg)':         'Weight (kg)',

  // PURCHASE
  'purchase id':         'Purchase ID',
  'purchase no':         'Purchase ID',
  'supplier':            'Supplier',
  'vendor':              'Supplier',
  'vendor name':         'Supplier',
  'gst':                 'GST %',
  'gst %':               'GST %',
  'gst rate':            'GST %',
  'gst amount':          'GST Amount',
  'tax amount':          'GST Amount',
  'total':               'Total',
  'grand total':         'Total',
  'invoice no':          'Invoice No',
  'invoice number':      'Invoice No',
  'bill no':             'Invoice No',
  'bill number':         'Invoice No',
  'invoice date':        'Invoice Date',
  'bill date':           'Invoice Date',
  'payment status':      'Payment Status',
  'paid amount':         'Paid Amount',
  'amount paid':         'Paid Amount',
  'job ref':             'Job Ref',
  'job reference':       'Job Ref',

  // PAYMENT
  'payment id':          'Payment ID',
  'payment no':          'Payment ID',
  'type':                'Type',
  'payment type':        'Type',
  'enquiry ref':         'Enquiry Ref',
  'mode':                'Mode',
  'payment mode':        'Mode',
  'reference':           'Reference',
  'utr':                 'Reference',
  'cheque no':           'Reference',
  'receipt no':          'Receipt No',
  'receipt number':      'Receipt No',
  'notes':               'Notes',
  'remarks':             'Notes',

  // EXPENSE
  'expense id':          'Expense ID',
  'category':            'Category',
  'expense category':    'Category',
  'paid to':             'Paid To',
  'payee':               'Paid To',
  'vendor paid':         'Paid To',
  'gst applicable':      'GST Applicable',
  'gst?':                'GST Applicable',
  'approved by':         'Approved By',
  'approved':            'Approved By',

  // DISPATCH
  'dispatch id':         'Dispatch ID',
  'dispatch no':         'Dispatch ID',
  'delivery mode':       'Delivery Mode',
  'mode of delivery':    'Delivery Mode',
  'transport mode':      'Delivery Mode',
  'delivery address':    'Delivery Address',
  'address':             'Delivery Address',
  'challan no':          'Challan No',
  'challan number':      'Challan No',
  'dc no':               'Challan No',
  'vehicle no':          'Vehicle No',
  'vehicle number':      'Vehicle No',
  'truck no':            'Vehicle No',
  'transporter':         'Transporter',
  'transport':           'Transporter',
  'freight':             'Freight Cost',
  'freight cost':        'Freight Cost',
  'freight charges':     'Freight Cost',
  'packages':            'No of Packages',
  'no of packages':      'No of Packages',
  'boxes':               'No of Packages',
  'received by':         'Received By',
  'receipt date':        'Receipt Date',
  'pod':                 'POD Link',
  'pod link':            'POD Link',
  'proof of delivery':   'POD Link',
  'dispatch status':     'Status',

  // FOLLOWUP
  'followup id':         'Followup ID',
  'follow up id':        'Followup ID',
  'followup date':       'Followup Date',
  'follow up date':      'Followup Date',
  'method':              'Method',
  'contact method':      'Method',
  'outcome':             'Outcome',
  'result':              'Outcome',
  'next action':         'Next Action',
  'action':              'Next Action',
  'next date':           'Next Date',
  'follow up next':      'Next Date',
  'created at':          'Created At',
  'created':             'Created At',
}

export interface UnmatchedColumn {
  uploadedHeader: string
  uploadedIndex: number
}

export interface MatchResult {
  /** schemaField → column index in the uploaded file */
  matched: Record<string, number>
  unmatched: UnmatchedColumn[]
  /** Full ordered list of schema fields (for mapping UI dropdowns) */
  schemaFields: string[]
}

export function matchColumns(
  uploadedHeaders: string[],
  sheetKey: ImportableSheetKey,
): MatchResult {
  const schemaFields = getExpectedHeaders(sheetKey)
  const matched: Record<string, number> = {}
  const unmatched: UnmatchedColumn[] = []

  // Build reverse map: schemaField (lowercase) → canonical name
  const schemaLower = Object.fromEntries(
    schemaFields.map(f => [f.toLowerCase().trim(), f])
  )

  uploadedHeaders.forEach((header, idx) => {
    const key = header.toLowerCase().trim()

    // 1. Exact match against schema field (case-insensitive)
    if (schemaLower[key]) {
      matched[schemaLower[key]] = idx
      return
    }

    // 2. Alias dictionary lookup
    const aliasTarget = ALIASES[key]
    if (aliasTarget && schemaFields.includes(aliasTarget) && !(aliasTarget in matched)) {
      matched[aliasTarget] = idx
      return
    }

    // 3. No match
    unmatched.push({ uploadedHeader: header, uploadedIndex: idx })
  })

  return { matched, unmatched, schemaFields }
}
