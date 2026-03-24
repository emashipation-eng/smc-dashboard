import type { PaymentMode } from './payment';

export type ExpenseCategory = 'Freight' | 'Labor' | 'Power' | 'Consumables' | 'Rent' | 'Misc';

export interface Expense {
  expenseId: string;        // EXP-YYYYMM-XXXX
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  gstApplicable: boolean;
  gstAmount: number;
  paidTo: string;
  jobRef: string;
  paymentMode: PaymentMode;
  approvedBy: string;
}
