export type FollowupMethod = 'Call' | 'WhatsApp' | 'Email' | 'Visit';
export type FollowupOutcome = 'Pending' | 'Positive' | 'Negative' | 'Rescheduled' | 'Converted';

export interface Followup {
  followupId: string;       // FLW-YYYYMM-XXXX
  enquiryRef: string;
  clientName: string;
  followupDate: string;
  method: FollowupMethod;
  assignedTo: string;
  notes: string;
  outcome: FollowupOutcome;
  nextAction: string;
  nextDate: string;
  createdAt: string;
}
