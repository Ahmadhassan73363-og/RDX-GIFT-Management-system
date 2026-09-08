import { ApprovalHistoryEntry } from './approval';

export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'pending_executive'
  | 'pending_assistant'
  | 'pending_president'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface RequestAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface RequestComment {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  avatar?: string;
  content: string;
  createdAt: string;
}

export interface GiftRequest {
  id: string;
  trackingNumber: string; // e.g. GFT-2026-0042
  customerName: string;
  customerCompany: string;
  giftCategory: string;
  giftItem: string;
  discountPercentage: number; // e.g. 25 for 25% discount
  giftValue: number; // original value e.g. $1,000
  budgetAmount: number; // calculated cost e.g. $750 after discount or direct cost
  teamId: string;
  teamName: string;
  reason: string;
  requestDate: string; // YYYY-MM-DD
  deliveryTargetDate?: string;
  priority: RequestPriority;
  status: RequestStatus;
  currentApprovalStepIndex: number;
  totalApprovalSteps: number;
  currentApproverRole: string;
  
  // Budget snapshot at submission / evaluation
  teamRemainingBudgetAtRequest: number;
  budgetAfterApproval: number;
  approvedAmount?: number;

  submittedByUserId: string;
  submittedByUserName: string;
  submittedByUserEmail: string;

  attachments: RequestAttachment[];
  comments: RequestComment[];
  approvalHistory: ApprovalHistoryEntry[];

  createdAt: string;
  updatedAt: string;
}
