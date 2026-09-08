export type ApprovalActionType = 'approve' | 'reject' | 'request_changes' | 'override_approve';

export interface ApprovalStepConfig {
  id: string;
  order: number;
  roleId: string;
  roleName: string;
  label: string;
  isRequired: boolean;
  canBypassByRoles?: string[];
}

export interface ApprovalChainConfig {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  minBudgetThreshold?: number; // applies if request budget exceeds this
  steps: ApprovalStepConfig[];
}

export interface ApprovalHistoryEntry {
  id: string;
  stepOrder: number;
  roleName: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: ApprovalActionType;
  comments: string;
  digitalSignature?: string; // canvas signature data or initial stamp
  ipAddress?: string;
  timestamp: string;
}
