export type PaymentType = 'Advance' | 'Progress' | 'Final' | 'Refund';
export type PaymentMode = 'Cash' | 'Cheque' | 'NEFT' | 'UPI' | 'RTGS';

export interface Payment {
  paymentId: string;        // PAY-YYYYMM-XXXX
  date: string;
  type: PaymentType;
  enquiryRef: string;
  clientName: string;
  amount: number;
  mode: PaymentMode;
  reference: string;
  receiptNo: string;
  notes: string;
}
