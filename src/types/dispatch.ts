// HD = Hot Dipping, PC = Powder Coating — tracks material sent for outsourced surface treatment
export type OutsourceProcess = 'HD' | 'PC';
export type DispatchStatus = 'In-Transit' | 'Delivered' | 'Returned';

export interface Dispatch {
  dispatchId: string;       // DSP-YYYYMM-XXXX
  date: string;
  jobRef: string;
  clientName: string;
  processType: OutsourceProcess;  // Which outsourced process (Hot Dipping or Powder Coating)
  deliveryAddress: string;
  challanNo: string;
  vehicleNo: string;
  transporter: string;
  freightCost: number;
  weightKg: number;
  noOfPackages: number;
  receivedBy: string;
  receiptDate: string;
  podLink: string;
  status: DispatchStatus;
}
