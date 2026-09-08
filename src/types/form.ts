export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'time'
  | 'dropdown'
  | 'multi_select'
  | 'checkbox'
  | 'radio'
  | 'textarea'
  | 'currency'
  | 'file_upload'
  | 'image_upload'
  | 'signature'
  | 'notes';

export interface FieldCondition {
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'is_empty' | 'is_not_empty';
  value: any;
  action: 'show' | 'hide' | 'require';
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: any;
  required: boolean;
  helpText?: string;
  options?: { label: string; value: string }[]; // For dropdown, radio, multi_select
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  currencyPrefix?: string;
  fileAcceptedTypes?: string[];
  maxFileSizeMb?: number;
  condition?: FieldCondition;
}

export type AssignmentTargetType = 'individual' | 'multiple_users' | 'entire_team';

export interface FormAssignment {
  id: string;
  formId: string;
  targetType: AssignmentTargetType;
  targetTeamId?: string;
  targetTeamName?: string;
  targetUserIds: string[];
  targetUserNames?: string[];
  assignedByUserId: string;
  assignedByUserName: string;
  dueDate?: string;
  assignedAt: string;
}

export interface FormSchema {
  id: string;
  title: string;
  description: string;
  category: string;
  version: number;
  fields: FormField[];
  isActive: boolean;
  requiresBudgetApproval: boolean;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  formTitle: string;
  submittedByUserId: string;
  submittedByUserName: string;
  submittedByTeamId?: string;
  submittedByTeamName?: string;
  data: Record<string, any>;
  status: 'pending' | 'completed' | 'approved' | 'rejected';
  submittedAt: string;
}
