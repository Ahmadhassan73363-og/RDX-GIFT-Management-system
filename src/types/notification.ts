export type NotificationType =
  | 'REQUEST_SUBMITTED'
  | 'REQUEST_APPROVED'
  | 'REQUEST_REJECTED'
  | 'CHANGES_REQUESTED'
  | 'BUDGET_LOW'
  | 'BUDGET_EXHAUSTED'
  | 'COMMENT_ADDED'
  | 'FORM_ASSIGNED'
  | 'SHIPMENT_UPDATED';

export interface Notification {
  id: string;
  userId: string; // recipient or 'all_admins'
  title: string;
  message: string;
  type: NotificationType;
  entityId?: string; // e.g. requestId or teamId
  entityType?: 'request' | 'team' | 'form' | 'budget';
  read: boolean;
  actionUrl?: string;
  createdAt: string;
  
  // Simulated email payload if notification triggered an email
  emailPreview?: {
    to: string;
    subject: string;
    htmlBody: string;
  };
}
