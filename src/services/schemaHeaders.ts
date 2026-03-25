// Maps each importable SheetKey to its expected column headers (in COL index order)
// These are the "canonical" English names shown in the mapping UI

import type { SheetKey } from '../config/sheets'

type ImportableSheetKey = Exclude<SheetKey, 'PRICING'>

export const SCHEMA_HEADERS: Record<ImportableSheetKey, string[]> = {
  INVENTORY: [
    'Item ID', 'Item Name', 'Category', 'Dimensions',
    'Current Stock', 'UOM', 'Min Alert Level', 'Location Bin',
  ],
  ENQUIRY: [
    'Enquiry ID', 'Timestamp', 'Client Name', 'Item Description',
    'Quantity', 'Unit Cost', 'Margin %', 'Total Quote', 'Status',
  ],
  PRODUCTION: [
    'Job ID', 'Client Name', 'Stage', 'Assigned To',
    'Status', 'Start Date', 'Due Date', 'Estimated Hours',
    'Actual Hours', 'Weight (kg)',
  ],
  PURCHASE: [
    'Purchase ID', 'Date', 'Supplier', 'Item ID', 'Item Description',
    'Quantity', 'Rate', 'Amount', 'GST %', 'GST Amount',
    'Total', 'Invoice No', 'Invoice Date', 'Payment Status',
    'Paid Amount', 'Job Ref',
  ],
  PAYMENT: [
    'Payment ID', 'Date', 'Type', 'Enquiry Ref', 'Client Name',
    'Amount', 'Mode', 'Reference', 'Receipt No', 'Notes',
  ],
  EXPENSE: [
    'Expense ID', 'Date', 'Category', 'Description', 'Amount',
    'GST Applicable', 'GST Amount', 'Paid To', 'Job Ref',
    'Payment Mode', 'Approved By',
  ],
  DISPATCH: [
    'Dispatch ID', 'Date', 'Job Ref', 'Client Name', 'Delivery Mode',
    'Delivery Address', 'Challan No', 'Vehicle No', 'Transporter',
    'Freight Cost', 'Weight (kg)', 'No of Packages', 'Received By',
    'Receipt Date', 'POD Link', 'Status',
  ],
  FOLLOWUP: [
    'Followup ID', 'Enquiry Ref', 'Client Name', 'Followup Date',
    'Method', 'Assigned To', 'Notes', 'Outcome', 'Next Action',
    'Next Date', 'Created At',
  ],
}

export function getExpectedHeaders(key: ImportableSheetKey): string[] {
  return [...SCHEMA_HEADERS[key]]
}
