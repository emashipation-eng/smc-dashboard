export type EnquiryStatus = 'Quoted' | 'PO Received' | 'Rejected' | 'Expired';

export interface Enquiry {
  enquiryId: string;        // ENQ-YYYYMM-XXXX
  timestamp: string;
  clientName: string;
  itemDesc: string;
  quantity: number;
  unitCost: number;
  marginPct: number;
  totalQuote: number;
  status: EnquiryStatus;
  // Computed fields
  purchaseCost?: number;
  expenseCost?: number;
  totalCost?: number;
  grossProfit?: number;
  profitPct?: number;
  advanceReceived?: number;
  balanceDue?: number;
}
