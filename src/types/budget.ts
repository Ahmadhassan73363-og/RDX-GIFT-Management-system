export type BudgetActionType =
  | 'INITIAL_ALLOCATION'
  | 'BUDGET_INCREASE'
  | 'BUDGET_DECREASE'
  | 'REQUEST_DEDUCTION'
  | 'REQUEST_REFUND'
  | 'OVERRIDE_DEDUCTION';

export interface BudgetTransaction {
  id: string;
  teamId: string;
  teamName: string;
  type: BudgetActionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  requestId?: string;
  performedByUserId: string;
  performedByUserName: string;
  isOverride?: boolean;
  createdAt: string;
}

export interface BudgetSummary {
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
  percentUsed: number;
  lowBudgetCount: number;
  exhaustedCount: number;
}
