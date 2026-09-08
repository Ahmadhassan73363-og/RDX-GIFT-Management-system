import { storage } from './storage';
import {
  INITIAL_ROLES,
  INITIAL_USERS,
  INITIAL_TEAMS,
  INITIAL_REQUESTS,
  INITIAL_FORMS,
  INITIAL_FORM_ASSIGNMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SETTINGS,
  INITIAL_BUDGET_TRANSACTIONS
} from './mockData';
import { Role, Permission } from '../types/rbac';
import { User } from '../types/user';
import { Team } from '../types/team';
import { GiftRequest, RequestStatus, RequestPriority } from '../types/request';
import { FormSchema, FormAssignment, FormSubmission } from '../types/form';
import { BudgetTransaction, BudgetActionType } from '../types/budget';
import { Notification, NotificationType } from '../types/notification';
import { AuditLog, AuditActionType } from '../types/audit';
import { SystemSettings } from '../types/settings';
import { ApprovalActionType, ApprovalHistoryEntry } from '../types/approval';

class DataService {
  constructor() {
    this.initStorage();
  }

  private initStorage() {
    if (!storage.get('initialized', false)) {
      storage.set('roles', INITIAL_ROLES);
      storage.set('users', INITIAL_USERS);
      storage.set('teams', INITIAL_TEAMS);
      storage.set('requests', INITIAL_REQUESTS);
      storage.set('forms', INITIAL_FORMS);
      storage.set('form_assignments', INITIAL_FORM_ASSIGNMENTS);
      storage.set('form_submissions', []);
      storage.set('notifications', INITIAL_NOTIFICATIONS);
      storage.set('audit_logs', INITIAL_AUDIT_LOGS);
      storage.set('settings', INITIAL_SETTINGS);
      storage.set('budget_transactions', INITIAL_BUDGET_TRANSACTIONS);
      storage.set('current_user_id', 'usr-1'); // Alexander Vance (Super Admin)
      storage.set('initialized', true);
    }

    // Branding migration: force-patch stale OmniCorp name to RDX
    const currentSettings = storage.get<SystemSettings>('settings', INITIAL_SETTINGS);
    if (
      currentSettings?.branding?.companyName === 'OmniCorp Enterprise Systems' ||
      currentSettings?.branding?.companyName === 'OmniCorp' ||
      currentSettings?.branding?.appTitle === 'Enterprise Gift & Budget Management'
    ) {
      storage.set('settings', {
        ...currentSettings,
        branding: {
          ...currentSettings.branding,
          companyName: 'RDX',
          appTitle: 'Gift & Budget Management System',
        }
      });
    }
  }


  // --- Audit Logging ---
  public logAudit(
    action: AuditActionType,
    entityType: AuditLog['entityType'],
    entityId: string,
    description: string,
    user: User,
    oldValue?: string,
    newValue?: string
  ) {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: 'audit-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.roleName,
      action,
      entityType,
      entityId,
      description,
      oldValue,
      newValue,
      ipAddress: '192.168.1.' + (100 + Math.floor(Math.random() * 50)),
      browser: 'Enterprise Web Client (Chrome/Edge)',
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    storage.set('audit_logs', logs.slice(0, 500));
  }

  public getAuditLogs(): AuditLog[] {
    return storage.get<AuditLog[]>('audit_logs', INITIAL_AUDIT_LOGS);
  }

  // --- Notifications ---
  public getNotifications(): Notification[] {
    return storage.get<Notification[]>('notifications', INITIAL_NOTIFICATIONS);
  }

  public notify(
    userId: string,
    title: string,
    message: string,
    type: NotificationType,
    entityId?: string,
    entityType?: Notification['entityType'],
    actionUrl?: string,
    emailPreviewSubject?: string,
    emailPreviewHtml?: string
  ) {
    const notifs = this.getNotifications();
    const newNotif: Notification = {
      id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      userId,
      title,
      message,
      type,
      entityId,
      entityType,
      actionUrl,
      read: false,
      createdAt: new Date().toISOString(),
      emailPreview: emailPreviewSubject ? {
        to: userId,
        subject: emailPreviewSubject,
        htmlBody: emailPreviewHtml || `<p>${message}</p>`
      } : undefined
    };
    notifs.unshift(newNotif);
    storage.set('notifications', notifs);
    return newNotif;
  }

  public markNotificationAsRead(id: string) {
    const notifs = this.getNotifications().map(n => n.id === id ? { ...n, read: true } : n);
    storage.set('notifications', notifs);
  }

  public markAllNotificationsAsRead() {
    const notifs = this.getNotifications().map(n => ({ ...n, read: true }));
    storage.set('notifications', notifs);
  }

  public clearAllNotifications() {
    storage.set('notifications', []);
  }

  // --- Users & Session ---
  public getCurrentUser(): User {
    const currentId = storage.get<string>('current_user_id', 'usr-1');
    const users = this.getUsers();
    return users.find(u => u.id === currentId) || users[0];
  }

  public setCurrentUser(userId: string) {
    storage.set('current_user_id', userId);
    const user = this.getUsers().find(u => u.id === userId);
    if (user) {
      this.logAudit('USER_LOGIN', 'User', user.id, `User persona switched to ${user.name} (${user.roleName})`, user);
    }
  }

  public getUsers(): User[] {
    return storage.get<User[]>('users', INITIAL_USERS);
  }

  public saveUser(userData: Partial<User> & { name: string; email: string; roleId: string }, actor: User): User {
    const users = this.getUsers();
    const roles = this.getRoles();
    const role = roles.find(r => r.id === userData.roleId);
    const teams = this.getTeams();
    const team = teams.find(t => t.id === userData.teamId);

    let savedUser: User;
    if (userData.id) {
      const index = users.findIndex(u => u.id === userData.id);
      const oldUser = users[index];
      savedUser = {
        ...oldUser,
        ...userData,
        roleName: role ? role.name : (oldUser.roleName || 'Viewer'),
        teamName: team ? team.name : oldUser.teamName
      };
      users[index] = savedUser;
      this.logAudit('USER_UPDATE', 'User', savedUser.id, `Updated user details for ${savedUser.name}`, actor, JSON.stringify(oldUser), JSON.stringify(savedUser));
    } else {
      savedUser = {
        id: 'usr-' + Date.now(),
        name: userData.name,
        email: userData.email,
        roleId: userData.roleId,
        roleName: role ? role.name : 'Viewer',
        teamId: userData.teamId,
        teamName: team ? team.name : undefined,
        title: userData.title || 'Staff Member',
        department: userData.department || 'Operations',
        status: userData.status || 'active',
        phone: userData.phone || '',
        emailVerified: true,
        createdAt: new Date().toISOString()
      };
      users.push(savedUser);
      this.logAudit('USER_CREATE', 'User', savedUser.id, `Created new enterprise user ${savedUser.name} (${savedUser.email})`, actor, undefined, JSON.stringify(savedUser));
    }
    storage.set('users', users);
    return savedUser;
  }

  public toggleUserStatus(userId: string, actor: User): User {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    const oldStatus = user.status;
    user.status = user.status === 'active' ? 'disabled' : 'active';
    storage.set('users', users);
    this.logAudit('USER_DISABLE', 'User', user.id, `Changed status of ${user.name} from ${oldStatus} to ${user.status}`, actor);
    return user;
  }

  public deleteUser(userId: string, actor: User) {
    let users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;
    users = users.filter(u => u.id !== userId);
    storage.set('users', users);
    this.logAudit('USER_DELETE', 'User', userId, `Deleted user account ${user.name} (${user.email})`, actor);
  }

  // --- Roles & Dynamic RBAC ---
  public getRoles(): Role[] {
    return storage.get<Role[]>('roles', INITIAL_ROLES);
  }

  public saveRole(roleData: Partial<Role> & { name: string; permissions: Permission[] }, actor: User): Role {
    const roles = this.getRoles();
    let savedRole: Role;
    if (roleData.id) {
      const idx = roles.findIndex(r => r.id === roleData.id);
      const oldRole = roles[idx];
      savedRole = {
        ...oldRole,
        ...roleData
      };
      roles[idx] = savedRole;
      this.logAudit('ROLE_UPDATE', 'Role', savedRole.id, `Updated permissions for role ${savedRole.name}`, actor, JSON.stringify(oldRole), JSON.stringify(savedRole));
    } else {
      savedRole = {
        id: 'role-' + Date.now(),
        name: roleData.name,
        description: roleData.description || 'Custom configured role',
        permissions: roleData.permissions,
        color: roleData.color || '#6366f1',
        isSystem: false,
        createdAt: new Date().toISOString()
      };
      roles.push(savedRole);
      this.logAudit('ROLE_CREATE', 'Role', savedRole.id, `Created dynamic role ${savedRole.name} with ${savedRole.permissions.length} permissions`, actor, undefined, JSON.stringify(savedRole));
    }
    storage.set('roles', roles);
    return savedRole;
  }

  public deleteRole(roleId: string, actor: User) {
    let roles = this.getRoles();
    const role = roles.find(r => r.id === roleId);
    if (!role || role.isSystem) {
      throw new Error('System roles cannot be deleted');
    }
    roles = roles.filter(r => r.id !== roleId);
    storage.set('roles', roles);
    this.logAudit('ROLE_UPDATE', 'Role', roleId, `Deleted custom role ${role.name}`, actor);
  }

  public hasPermission(user: User, permission: Permission): boolean {
    const roles = this.getRoles();
    const role = roles.find(r => r.id === user.roleId);
    if (!role) return false;
    return role.permissions.includes(permission);
  }

  // --- Teams & Budgets ---
  public getTeams(): Team[] {
    return storage.get<Team[]>('teams', INITIAL_TEAMS);
  }

  public saveTeam(teamData: Partial<Team> & { name: string; allocatedBudget: number }, actor: User): Team {
    const teams = this.getTeams();
    let savedTeam: Team;
    if (teamData.id) {
      const idx = teams.findIndex(t => t.id === teamData.id);
      const oldTeam = teams[idx];
      const budgetDiff = teamData.allocatedBudget !== undefined ? teamData.allocatedBudget - oldTeam.allocatedBudget : 0;
      
      savedTeam = {
        ...oldTeam,
        ...teamData,
        remainingBudget: oldTeam.remainingBudget + budgetDiff
      };
      teams[idx] = savedTeam;

      if (budgetDiff !== 0) {
        this.addBudgetTransaction({
          teamId: savedTeam.id,
          teamName: savedTeam.name,
          type: budgetDiff > 0 ? 'BUDGET_INCREASE' : 'BUDGET_DECREASE',
          amount: Math.abs(budgetDiff),
          balanceBefore: oldTeam.remainingBudget,
          balanceAfter: savedTeam.remainingBudget,
          reason: `Team budget allocation adjustment by ${actor.name}`,
          performedByUserId: actor.id,
          performedByUserName: actor.name
        });
      }

      this.logAudit('TEAM_UPDATE', 'Team', savedTeam.id, `Updated team details for ${savedTeam.name}`, actor, JSON.stringify(oldTeam), JSON.stringify(savedTeam));
    } else {
      const initialBudget = Number(teamData.allocatedBudget) || 0;
      savedTeam = {
        id: 'team-' + Date.now(),
        name: teamData.name,
        code: teamData.code || teamData.name.substring(0, 4).toUpperCase(),
        description: teamData.description || 'Enterprise functional team',
        leadId: teamData.leadId || actor.id,
        leadName: teamData.leadName || actor.name,
        leadEmail: teamData.leadEmail || actor.email,
        allocatedBudget: initialBudget,
        spentBudget: 0,
        remainingBudget: initialBudget,
        active: true,
        memberCount: 1,
        currency: '$',
        color: teamData.color || '#3b82f6',
        createdAt: new Date().toISOString()
      };
      teams.push(savedTeam);

      this.addBudgetTransaction({
        teamId: savedTeam.id,
        teamName: savedTeam.name,
        type: 'INITIAL_ALLOCATION',
        amount: initialBudget,
        balanceBefore: 0,
        balanceAfter: initialBudget,
        reason: 'Initial team budget setup',
        performedByUserId: actor.id,
        performedByUserName: actor.name
      });

      this.logAudit('TEAM_CREATE', 'Team', savedTeam.id, `Created new team ${savedTeam.name} with initial budget $${initialBudget.toLocaleString()}`, actor, undefined, JSON.stringify(savedTeam));
    }
    storage.set('teams', teams);
    return savedTeam;
  }

  public adjustTeamBudget(
    teamId: string,
    amount: number,
    type: 'BUDGET_INCREASE' | 'BUDGET_DECREASE',
    reason: string,
    actor: User
  ): Team {
    const teams = this.getTeams();
    const team = teams.find(t => t.id === teamId);
    if (!team) throw new Error('Team not found');

    const oldRemaining = team.remainingBudget;
    const oldAllocated = team.allocatedBudget;

    if (type === 'BUDGET_INCREASE') {
      team.allocatedBudget += amount;
      team.remainingBudget += amount;
    } else {
      if (team.remainingBudget < amount) {
        throw new Error('Cannot decrease budget below remaining available balance');
      }
      team.allocatedBudget -= amount;
      team.remainingBudget -= amount;
    }

    storage.set('teams', teams);

    this.addBudgetTransaction({
      teamId: team.id,
      teamName: team.name,
      type,
      amount,
      balanceBefore: oldRemaining,
      balanceAfter: team.remainingBudget,
      reason,
      performedByUserId: actor.id,
      performedByUserName: actor.name
    });

    this.logAudit('BUDGET_ADJUST', 'Budget', team.id, `${type === 'BUDGET_INCREASE' ? 'Increased' : 'Decreased'} budget of ${team.name} by $${amount.toLocaleString()}. Reason: ${reason}`, actor, JSON.stringify({ allocated: oldAllocated, remaining: oldRemaining }), JSON.stringify({ allocated: team.allocatedBudget, remaining: team.remainingBudget }));

    return team;
  }

  public getBudgetTransactions(teamId?: string): BudgetTransaction[] {
    const txns = storage.get<BudgetTransaction[]>('budget_transactions', INITIAL_BUDGET_TRANSACTIONS);
    if (teamId) {
      return txns.filter(t => t.teamId === teamId);
    }
    return txns;
  }

  private addBudgetTransaction(txn: Omit<BudgetTransaction, 'id' | 'createdAt'>) {
    const txns = this.getBudgetTransactions();
    const newTxn: BudgetTransaction = {
      ...txn,
      id: 'txn-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString()
    };
    txns.unshift(newTxn);
    storage.set('budget_transactions', txns);
  }

  // --- Gift Requests & Approvals ---
  public getRequests(filters?: {
    teamId?: string;
    status?: RequestStatus;
    search?: string;
    priority?: RequestPriority;
  }): GiftRequest[] {
    let requests = storage.get<GiftRequest[]>('requests', INITIAL_REQUESTS);
    if (!filters) return requests;

    if (filters.teamId) {
      requests = requests.filter(r => r.teamId === filters.teamId);
    }
    if (filters.status) {
      requests = requests.filter(r => r.status === filters.status);
    }
    if (filters.priority) {
      requests = requests.filter(r => r.priority === filters.priority);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      requests = requests.filter(r =>
        r.trackingNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerCompany.toLowerCase().includes(q) ||
        r.giftItem.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    }
    return requests;
  }

  public getRequestById(id: string): GiftRequest | undefined {
    return this.getRequests().find(r => r.id === id);
  }

  public createRequest(
    payload: {
      customerName: string;
      customerCompany: string;
      giftCategory: string;
      giftItem: string;
      discountPercentage: number;
      giftValue: number;
      teamId: string;
      reason: string;
      priority: RequestPriority;
      deliveryTargetDate?: string;
      attachments?: { name: string; size: number; type: string }[];
    },
    actor: User
  ): GiftRequest {
    const teams = this.getTeams();
    const team = teams.find(t => t.id === payload.teamId);
    if (!team) throw new Error('Team not found');

    const discountMultiplier = Math.max(0, 1 - (payload.discountPercentage / 100));
    const budgetAmount = Math.round(payload.giftValue * discountMultiplier * 100) / 100;
    const remainingBudget = team.remainingBudget;
    const budgetAfterApproval = remainingBudget - budgetAmount;

    const requests = this.getRequests();
    const count = requests.length + 1;
    const trackingNumber = `GFT-2026-${String(count).padStart(4, '0')}`;

    const newRequest: GiftRequest = {
      id: 'req-' + Date.now(),
      trackingNumber,
      customerName: payload.customerName,
      customerCompany: payload.customerCompany,
      giftCategory: payload.giftCategory,
      giftItem: payload.giftItem,
      discountPercentage: payload.discountPercentage,
      giftValue: payload.giftValue,
      budgetAmount,
      teamId: team.id,
      teamName: team.name,
      reason: payload.reason,
      requestDate: new Date().toISOString().split('T')[0],
      deliveryTargetDate: payload.deliveryTargetDate,
      priority: payload.priority,
      status: 'pending_executive',
      currentApprovalStepIndex: 1,
      totalApprovalSteps: 4,
      currentApproverRole: 'Executive',
      teamRemainingBudgetAtRequest: remainingBudget,
      budgetAfterApproval,
      submittedByUserId: actor.id,
      submittedByUserName: actor.name,
      submittedByUserEmail: actor.email,
      attachments: (payload.attachments || []).map((a, i) => ({
        id: 'att-' + Date.now() + '-' + i,
        name: a.name,
        size: a.size,
        type: a.type,
        url: '#',
        uploadedAt: new Date().toISOString()
      })),
      comments: [],
      approvalHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    requests.unshift(newRequest);
    storage.set('requests', requests);

    // Notify approvers & team
    this.notify(
      'all_executives',
      'New Gift Request Submitted',
      `Request ${newRequest.trackingNumber} for ${newRequest.customerCompany} ($${budgetAmount.toLocaleString()}) awaits Executive sign-off.`,
      'REQUEST_SUBMITTED',
      newRequest.id,
      'request',
      `/approvals`
    );

    this.logAudit(
      'REQUEST_CREATE',
      'GiftRequest',
      newRequest.id,
      `Submitted gift request ${newRequest.trackingNumber} for ${newRequest.customerName} (${newRequest.customerCompany}) - $${budgetAmount.toLocaleString()}`,
      actor,
      undefined,
      JSON.stringify({ tracking: newRequest.trackingNumber, amount: budgetAmount, team: team.name })
    );

    return newRequest;
  }

  public addCommentToRequest(requestId: string, content: string, actor: User): GiftRequest {
    const requests = this.getRequests();
    const req = requests.find(r => r.id === requestId);
    if (!req) throw new Error('Request not found');

    const comment = {
      id: 'c-' + Date.now(),
      userId: actor.id,
      userName: actor.name,
      userRole: actor.roleName,
      content,
      createdAt: new Date().toISOString()
    };

    req.comments.push(comment);
    req.updatedAt = new Date().toISOString();
    storage.set('requests', requests);

    this.notify(
      req.submittedByUserId,
      'New Comment on Request',
      `${actor.name} commented on ${req.trackingNumber}: "${content.substring(0, 50)}..."`,
      'COMMENT_ADDED',
      req.id,
      'request',
      `/requests`
    );

    return req;
  }

  /**
   * Multi-level approval engine
   * Progresses request through Executive -> Assistant -> President -> Admin -> Approved
   * Deducts budget on final approval
   * Blocks if insufficient budget unless overridden by authorized user
   */
  public processApprovalStep(
    requestId: string,
    action: ApprovalActionType,
    comments: string,
    digitalSignature: string,
    actor: User,
    isOverride: boolean = false
  ): GiftRequest {
    const requests = this.getRequests();
    const req = requests.find(r => r.id === requestId);
    if (!req) throw new Error('Request not found');

    const teams = this.getTeams();
    const team = teams.find(t => t.id === req.teamId);
    if (!team) throw new Error('Team not found');

    const settings = this.getSettings();

    // Check budget sufficiency
    const hasSufficientBudget = team.remainingBudget >= req.budgetAmount;
    if (!hasSufficientBudget && action === 'approve' && !isOverride) {
      throw new Error(`Insufficient team budget. Remaining: $${team.remainingBudget.toLocaleString()}, Requested: $${req.budgetAmount.toLocaleString()}. Requires authorized override.`);
    }

    const historyEntry: ApprovalHistoryEntry = {
      id: 'ah-' + Date.now(),
      stepOrder: req.currentApprovalStepIndex,
      roleName: actor.roleName,
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      action,
      comments: comments || (action === 'approve' ? 'Approved through workflow' : 'Action taken'),
      digitalSignature: digitalSignature || `${actor.name}_Verified_DigitalSign`,
      ipAddress: '192.168.1.' + (100 + Math.floor(Math.random() * 50)),
      timestamp: new Date().toISOString()
    };

    req.approvalHistory.push(historyEntry);

    if (action === 'reject') {
      req.status = 'rejected';
      req.updatedAt = new Date().toISOString();
      storage.set('requests', requests);

      this.notify(
        req.submittedByUserId,
        'Gift Request Declined',
        `Your request ${req.trackingNumber} for ${req.customerCompany} was rejected by ${actor.name} (${actor.roleName}). Reason: ${comments}`,
        'REQUEST_REJECTED',
        req.id,
        'request',
        `/requests`,
        `[DECISION] Request ${req.trackingNumber} Rejected`,
        `<p>Your gift request has been rejected by <strong>${actor.name}</strong> with the following rationale:</p><blockquote>${comments}</blockquote>`
      );

      this.logAudit('REQUEST_REJECT', 'GiftRequest', req.id, `Rejected request ${req.trackingNumber}. Comments: ${comments}`, actor);
      return req;
    }

    if (action === 'request_changes') {
      req.status = 'under_review';
      req.updatedAt = new Date().toISOString();
      storage.set('requests', requests);

      this.notify(
        req.submittedByUserId,
        'Changes Requested on Gift Submission',
        `${actor.name} requested modifications on ${req.trackingNumber}: ${comments}`,
        'CHANGES_REQUESTED',
        req.id,
        'request',
        `/requests`
      );

      this.logAudit('REQUEST_CHANGE_REQUESTED', 'GiftRequest', req.id, `Requested changes on ${req.trackingNumber}. Comments: ${comments}`, actor);
      return req;
    }

    // Action is APPROVE or OVERRIDE_APPROVE
    // Sequential pipeline: Step 1 (Executive) -> Step 2 (Assistant) -> Step 3 (President) -> Step 4 (Admin) -> Approved
    if (req.currentApprovalStepIndex < req.totalApprovalSteps) {
      req.currentApprovalStepIndex += 1;
      if (req.currentApprovalStepIndex === 2) {
        req.status = 'pending_assistant';
        req.currentApproverRole = 'Assistant';
      } else if (req.currentApprovalStepIndex === 3) {
        req.status = 'pending_president';
        req.currentApproverRole = 'President';
      } else if (req.currentApprovalStepIndex === 4) {
        req.status = 'submitted'; // or pending admin
        req.currentApproverRole = 'Admin';
      }

      req.updatedAt = new Date().toISOString();
      storage.set('requests', requests);

      this.notify(
        'approvers_' + req.currentApproverRole.toLowerCase(),
        `Approval Required: ${req.trackingNumber}`,
        `Request ${req.trackingNumber} ($${req.budgetAmount.toLocaleString()}) passed to ${req.currentApproverRole} stage.`,
        'REQUEST_SUBMITTED',
        req.id,
        'request',
        `/approvals`
      );

      this.logAudit('REQUEST_APPROVE', 'GiftRequest', req.id, `Advanced request ${req.trackingNumber} to stage ${req.currentApprovalStepIndex} (${req.currentApproverRole})`, actor);
      return req;
    }

    // FINAL APPROVAL REACHED (Step 4 completed)
    req.status = 'approved';
    req.approvedAmount = req.budgetAmount;
    req.updatedAt = new Date().toISOString();

    // AUTOMATIC BUDGET DEDUCTION
    const balanceBefore = team.remainingBudget;
    team.spentBudget += req.budgetAmount;
    team.remainingBudget -= req.budgetAmount;
    const balanceAfter = team.remainingBudget;

    storage.set('teams', teams);
    storage.set('requests', requests);

    // Record Budget Transaction
    this.addBudgetTransaction({
      teamId: team.id,
      teamName: team.name,
      type: isOverride ? 'OVERRIDE_DEDUCTION' : 'REQUEST_DEDUCTION',
      amount: req.budgetAmount,
      balanceBefore,
      balanceAfter,
      reason: `${isOverride ? '[OVERRIDE] ' : ''}Auto-deduction for fully approved Request ${req.trackingNumber} (${req.giftItem})`,
      requestId: req.id,
      performedByUserId: actor.id,
      performedByUserName: actor.name,
      isOverride
    });

    // Notify Submitter
    this.notify(
      req.submittedByUserId,
      'Gift Request Fully Approved!',
      `Request ${req.trackingNumber} for ${req.customerCompany} has cleared all approval stages and budget $${req.budgetAmount.toLocaleString()} is allocated.`,
      'REQUEST_APPROVED',
      req.id,
      'request',
      `/requests`,
      `[CONFIRMED] Gift Request ${req.trackingNumber} Approved`,
      `<div style="font-family: sans-serif;"><h3 style="color: #10b981;">Gift Request Approved!</h3><p>Your request for <strong>${req.customerCompany}</strong> has received final sign-off. $${req.budgetAmount.toLocaleString()} has been charged to <strong>${team.name}</strong>.</p></div>`
    );

    // Check Budget Thresholds (Warning at 80%, Exhausted at 100%)
    const pctUsed = (team.spentBudget / team.allocatedBudget) * 100;
    if (pctUsed >= 100) {
      this.notify(
        'all_admins',
        `Budget Exhausted: ${team.name}`,
        `${team.name} budget has been 100% exhausted ($${team.spentBudget.toLocaleString()} / $${team.allocatedBudget.toLocaleString()}). Further requests will require override.`,
        'BUDGET_EXHAUSTED',
        team.id,
        'budget',
        `/budgets`
      );
    } else if (pctUsed >= settings.budgetRules.warningThresholdPercent) {
      this.notify(
        'all_admins',
        `Budget Warning: ${team.name}`,
        `${team.name} has consumed ${Math.round(pctUsed)}% of its allocated budget ($${team.remainingBudget.toLocaleString()} remaining).`,
        'BUDGET_LOW',
        team.id,
        'budget',
        `/budgets`
      );
    }

    this.logAudit(
      'REQUEST_APPROVE',
      'GiftRequest',
      req.id,
      `Fully approved ${req.trackingNumber}. Auto-deducted $${req.budgetAmount.toLocaleString()} from ${team.name}. Remaining budget: $${balanceAfter.toLocaleString()}`,
      actor,
      JSON.stringify({ remainingBudget: balanceBefore }),
      JSON.stringify({ remainingBudget: balanceAfter })
    );

    return req;
  }

  // --- Dynamic Forms Builder ---
  public getForms(): FormSchema[] {
    return storage.get<FormSchema[]>('forms', INITIAL_FORMS);
  }

  public getFormById(id: string): FormSchema | undefined {
    return this.getForms().find(f => f.id === id);
  }

  public saveForm(formData: Partial<FormSchema> & { title: string; fields: any[] }, actor: User): FormSchema {
    const forms = this.getForms();
    let saved: FormSchema;
    if (formData.id) {
      const idx = forms.findIndex(f => f.id === formData.id);
      const oldForm = forms[idx];
      saved = {
        ...oldForm,
        ...formData,
        version: oldForm.version + 1,
        updatedAt: new Date().toISOString()
      };
      forms[idx] = saved;
      this.logAudit('FORM_UPDATE', 'Form', saved.id, `Updated dynamic form "${saved.title}" (v${saved.version}) with ${saved.fields.length} fields`, actor, JSON.stringify(oldForm), JSON.stringify(saved));
    } else {
      saved = {
        id: 'form-' + Date.now(),
        title: formData.title,
        description: formData.description || 'Dynamic custom enterprise form',
        category: formData.category || 'General',
        version: 1,
        fields: formData.fields || [],
        isActive: true,
        requiresBudgetApproval: formData.requiresBudgetApproval ?? true,
        createdById: actor.id,
        createdByName: actor.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      forms.push(saved);
      this.logAudit('FORM_CREATE', 'Form', saved.id, `Created new dynamic form "${saved.title}" with ${saved.fields.length} fields`, actor, undefined, JSON.stringify(saved));
    }
    storage.set('forms', forms);
    return saved;
  }

  public deleteForm(formId: string, actor: User) {
    let forms = this.getForms();
    const form = forms.find(f => f.id === formId);
    if (!form) return;
    forms = forms.filter(f => f.id !== formId);
    storage.set('forms', forms);
    this.logAudit('FORM_UPDATE', 'Form', formId, `Deleted dynamic form "${form.title}"`, actor);
  }

  public getFormAssignments(): FormAssignment[] {
    return storage.get<FormAssignment[]>('form_assignments', INITIAL_FORM_ASSIGNMENTS);
  }

  public assignForm(
    formId: string,
    targetType: FormAssignment['targetType'],
    targetTeamId: string | undefined,
    targetUserIds: string[],
    dueDate: string | undefined,
    actor: User
  ): FormAssignment {
    const assignments = this.getFormAssignments();
    const form = this.getFormById(formId);
    if (!form) throw new Error('Form not found');

    const teams = this.getTeams();
    const targetTeam = targetTeamId ? teams.find(t => t.id === targetTeamId) : undefined;
    const users = this.getUsers();
    const targetUserNames = targetUserIds.map(uid => users.find(u => u.id === uid)?.name || uid);

    const newAssignment: FormAssignment = {
      id: 'asg-' + Date.now(),
      formId,
      targetType,
      targetTeamId,
      targetTeamName: targetTeam?.name,
      targetUserIds,
      targetUserNames,
      assignedByUserId: actor.id,
      assignedByUserName: actor.name,
      dueDate,
      assignedAt: new Date().toISOString()
    };

    assignments.push(newAssignment);
    storage.set('form_assignments', assignments);

    // Notify recipients
    targetUserIds.forEach(uid => {
      this.notify(
        uid,
        'Form Assigned to You',
        `"${form.title}" has been assigned to you by ${actor.name}. Due date: ${dueDate || 'Not specified'}.`,
        'FORM_ASSIGNED',
        form.id,
        'form',
        `/forms`
      );
    });

    this.logAudit('FORM_ASSIGN', 'Form', form.id, `Assigned form "${form.title}" to ${targetType === 'entire_team' ? targetTeam?.name : targetUserNames.join(', ')}`, actor);

    return newAssignment;
  }

  public submitFormResponse(formId: string, data: Record<string, any>, actor: User): FormSubmission {
    const form = this.getFormById(formId);
    if (!form) throw new Error('Form not found');

    const submissions = storage.get<FormSubmission[]>('form_submissions', []);
    const newSubmission: FormSubmission = {
      id: 'sub-' + Date.now(),
      formId: form.id,
      formTitle: form.title,
      submittedByUserId: actor.id,
      submittedByUserName: actor.name,
      submittedByTeamId: actor.teamId,
      submittedByTeamName: actor.teamName,
      data,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };
    submissions.unshift(newSubmission);
    storage.set('form_submissions', submissions);

    this.notify(
      'all_admins',
      'New Form Response Submitted',
      `${actor.name} submitted a response for "${form.title}".`,
      'REQUEST_SUBMITTED',
      newSubmission.id,
      'form',
      `/forms`
    );

    return newSubmission;
  }

  // --- Settings ---
  public getSettings(): SystemSettings {
    return storage.get<SystemSettings>('settings', INITIAL_SETTINGS);
  }

  public updateSettings(settings: Partial<SystemSettings>, actor: User): SystemSettings {
    const current = this.getSettings();
    const updated: SystemSettings = {
      ...current,
      ...settings,
      branding: { ...current.branding, ...settings.branding },
      budgetRules: { ...current.budgetRules, ...settings.budgetRules }
    };
    storage.set('settings', updated);
    this.logAudit('SETTINGS_UPDATE', 'SystemSettings', 'system', 'Updated enterprise system settings and branding', actor);
    return updated;
  }
}

export const dataService = new DataService();
