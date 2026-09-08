export type UserStatus = 'active' | 'disabled' | 'pending_verification';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  roleId: string;
  roleName: string;
  teamId?: string;
  teamName?: string;
  title?: string;
  department?: string;
  status: UserStatus;
  phone?: string;
  emailVerified: boolean;
  lastLogin?: string;
  createdAt: string;
}
