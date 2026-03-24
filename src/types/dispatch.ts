export type DeliveryType = 'H.O' | 'P.C';
export type DispatchStatus = 'In-Transit' | 'Delivered' | 'Returned';

export interface Dispatch {
  dispatchId: string;       // DSP-YYYYMM-XXXX
  date: string;
  jobRef: string;
  clientName: string;
  deliveryType: DeliveryType;
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
