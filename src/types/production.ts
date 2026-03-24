export type ProductionStage = 'Cutting' | 'Welding' | 'Paint' | 'QC' | 'Dispatch';
export type ProductionStatus = 'Pending' | 'In-Progress' | 'Complete';

export interface ProductionJob {
  jobId: string;            // FK → Enquiry.enquiryId
  clientName: string;
  stage: ProductionStage;
  assignedTo: string;       // email
  status: ProductionStatus;
  // Extended fields
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  weightKg?: number;
  delayDays?: number;
}
