export type PaymentStatus = 'Pending' | 'Paid' | 'Partial';

export interface Purchase {
  purchaseId: string;       // PUR-YYYYMM-XXXX
  date: string;
  supplier: string;
  itemId: string;
  itemDesc: string;
  quantity: number;
  rate: number;
  amount: number;
  gstPct: number;
  gstAmount: number;
  total: number;
  invoiceNo: string;
  invoiceDate: string;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  jobRef: string;
}
