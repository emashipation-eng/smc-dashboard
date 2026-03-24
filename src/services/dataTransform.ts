import type {
  InventoryItem, Enquiry, ProductionJob, Purchase,
  Payment, Expense, Dispatch, Followup
} from '../types'
import { COL } from '../config/sheets'

type Row = string[]

const num  = (v: string | undefined) => parseFloat(v ?? '0') || 0
const bool = (v: string | undefined) => v?.toLowerCase() === 'true' || v === '1'
const str  = (v: string | undefined) => v?.trim() ?? ''

export function rowToInventory(row: Row): InventoryItem {
  const c = COL.INVENTORY
  return {
    itemId:        str(row[c.ITEM_ID]),
    itemName:      str(row[c.ITEM_NAME]),
    category:      str(row[c.CATEGORY]) as InventoryItem['category'],
    dimensions:    str(row[c.DIMENSIONS]),
    currentStock:  num(row[c.CURRENT_STOCK]),
    uom:           str(row[c.UOM]) as InventoryItem['uom'],
    minAlertLevel: num(row[c.MIN_ALERT_LEVEL]),
    locationBin:   str(row[c.LOCATION_BIN]),
  }
}

export function rowToEnquiry(row: Row): Enquiry {
  const c = COL.ENQUIRY
  return {
    enquiryId:   str(row[c.ENQUIRY_ID]),
    timestamp:   str(row[c.TIMESTAMP]),
    clientName:  str(row[c.CLIENT_NAME]),
    itemDesc:    str(row[c.ITEM_DESC]),
    quantity:    num(row[c.QUANTITY]),
    unitCost:    num(row[c.UNIT_COST]),
    marginPct:   num(row[c.MARGIN_PCT]),
    totalQuote:  num(row[c.TOTAL_QUOTE]),
    status:      str(row[c.STATUS]) as Enquiry['status'],
  }
}

export function rowToProduction(row: Row): ProductionJob {
  const c = COL.PRODUCTION
  return {
    jobId:          str(row[c.JOB_ID]),
    clientName:     str(row[c.CLIENT_NAME]),
    stage:          str(row[c.STAGE]) as ProductionJob['stage'],
    assignedTo:     str(row[c.ASSIGNED_TO]),
    status:         str(row[c.STATUS]) as ProductionJob['status'],
    startDate:      str(row[c.START_DATE]),
    dueDate:        str(row[c.DUE_DATE]),
    estimatedHours: num(row[c.ESTIMATED_HOURS]),
    actualHours:    num(row[c.ACTUAL_HOURS]),
    weightKg:       num(row[c.WEIGHT_KG]),
  }
}

export function rowToPurchase(row: Row): Purchase {
  const c = COL.PURCHASE
  return {
    purchaseId:    str(row[c.PURCHASE_ID]),
    date:          str(row[c.DATE]),
    supplier:      str(row[c.SUPPLIER]),
    itemId:        str(row[c.ITEM_ID]),
    itemDesc:      str(row[c.ITEM_DESC]),
    quantity:      num(row[c.QUANTITY]),
    rate:          num(row[c.RATE]),
    amount:        num(row[c.AMOUNT]),
    gstPct:        num(row[c.GST_PCT]),
    gstAmount:     num(row[c.GST_AMOUNT]),
    total:         num(row[c.TOTAL]),
    invoiceNo:     str(row[c.INVOICE_NO]),
    invoiceDate:   str(row[c.INVOICE_DATE]),
    paymentStatus: str(row[c.PAYMENT_STATUS]) as Purchase['paymentStatus'],
    paidAmount:    num(row[c.PAID_AMOUNT]),
    jobRef:        str(row[c.JOB_REF]),
  }
}

export function rowToPayment(row: Row): Payment {
  const c = COL.PAYMENT
  return {
    paymentId:  str(row[c.PAYMENT_ID]),
    date:       str(row[c.DATE]),
    type:       str(row[c.TYPE]) as Payment['type'],
    enquiryRef: str(row[c.ENQUIRY_REF]),
    clientName: str(row[c.CLIENT_NAME]),
    amount:     num(row[c.AMOUNT]),
    mode:       str(row[c.MODE]) as Payment['mode'],
    reference:  str(row[c.REFERENCE]),
    receiptNo:  str(row[c.RECEIPT_NO]),
    notes:      str(row[c.NOTES]),
  }
}

export function rowToExpense(row: Row): Expense {
  const c = COL.EXPENSE
  return {
    expenseId:     str(row[c.EXPENSE_ID]),
    date:          str(row[c.DATE]),
    category:      str(row[c.CATEGORY]) as Expense['category'],
    description:   str(row[c.DESCRIPTION]),
    amount:        num(row[c.AMOUNT]),
    gstApplicable: bool(row[c.GST_APPLICABLE]),
    gstAmount:     num(row[c.GST_AMOUNT]),
    paidTo:        str(row[c.PAID_TO]),
    jobRef:        str(row[c.JOB_REF]),
    paymentMode:   str(row[c.PAYMENT_MODE]) as Expense['paymentMode'],
    approvedBy:    str(row[c.APPROVED_BY]),
  }
}

export function rowToDispatch(row: Row): Dispatch {
  const c = COL.DISPATCH
  return {
    dispatchId:      str(row[c.DISPATCH_ID]),
    date:            str(row[c.DATE]),
    jobRef:          str(row[c.JOB_REF]),
    clientName:      str(row[c.CLIENT_NAME]),
    deliveryMode:    str(row[c.DELIVERY_MODE]) as Dispatch['deliveryMode'],
    deliveryAddress: str(row[c.DELIVERY_ADDRESS]),
    challanNo:       str(row[c.CHALLAN_NO]),
    vehicleNo:       str(row[c.VEHICLE_NO]),
    transporter:     str(row[c.TRANSPORTER]),
    freightCost:     num(row[c.FREIGHT_COST]),
    weightKg:        num(row[c.WEIGHT_KG]),
    noOfPackages:    num(row[c.NO_OF_PACKAGES]),
    receivedBy:      str(row[c.RECEIVED_BY]),
    receiptDate:     str(row[c.RECEIPT_DATE]),
    podLink:         str(row[c.POD_LINK]),
    status:          str(row[c.STATUS]) as Dispatch['status'],
  }
}

export function rowToFollowup(row: Row): Followup {
  const c = COL.FOLLOWUP
  return {
    followupId:   str(row[c.FOLLOWUP_ID]),
    enquiryRef:   str(row[c.ENQUIRY_REF]),
    clientName:   str(row[c.CLIENT_NAME]),
    followupDate: str(row[c.FOLLOWUP_DATE]),
    method:       str(row[c.METHOD]) as Followup['method'],
    assignedTo:   str(row[c.ASSIGNED_TO]),
    notes:        str(row[c.NOTES]),
    outcome:      str(row[c.OUTCOME]) as Followup['outcome'],
    nextAction:   str(row[c.NEXT_ACTION]),
    nextDate:     str(row[c.NEXT_DATE]),
    createdAt:    str(row[c.CREATED_AT]),
  }
}

// Batch converters — skip header row
function skipHeader(rows: Row[]) { return rows.slice(1).filter(r => r.length > 0 && r[0]) }

export const rowsToInventory  = (rows: Row[]) => skipHeader(rows).map(rowToInventory)
export const rowsToEnquiries  = (rows: Row[]) => skipHeader(rows).map(rowToEnquiry)
export const rowsToProduction = (rows: Row[]) => skipHeader(rows).map(rowToProduction)
export const rowsToPurchases  = (rows: Row[]) => skipHeader(rows).map(rowToPurchase)
export const rowsToPayments   = (rows: Row[]) => skipHeader(rows).map(rowToPayment)
export const rowsToExpenses   = (rows: Row[]) => skipHeader(rows).map(rowToExpense)
export const rowsToDispatches = (rows: Row[]) => skipHeader(rows).map(rowToDispatch)
export const rowsToFollowups  = (rows: Row[]) => skipHeader(rows).map(rowToFollowup)
