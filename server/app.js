import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, current_database() as db');
    res.json({ status: 'ok', database: result.rows[0].db, time: result.rows[0].current_time });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Helper to convert snake_case DB row to camelCase JS object
function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatar,
    roleId: row.role_id,
    roleName: row.role_name,
    teamId: row.team_id,
    teamName: row.team_name,
    department: row.department,
    title: row.title,
    phone: row.phone,
    status: row.status,
    lastLogin: row.last_login,
    allocatedBudget: parseFloat(row.allocated_budget || 0),
    spentBudget: parseFloat(row.spent_budget || 0),
    createdAt: row.created_at
  };
}

function mapTeam(row) {
  if (!row) return null;
  const allocated = parseFloat(row.total_allocated_budget || 0);
  const spent = parseFloat(row.spent_budget || 0);
  return {
    id: row.id,
    name: row.name,
    code: row.code || row.id?.toUpperCase()?.slice(0, 6) || 'TEAM',
    description: row.description || '',
    leadId: row.lead_id || '',
    leadName: row.lead_name || row.lead_id || '',
    leadEmail: row.lead_email || '',
    allocatedBudget: allocated,
    spentBudget: spent,
    remainingBudget: Math.max(0, allocated - spent),
    active: row.is_active !== false,
    memberCount: Array.isArray(row.member_ids) ? row.member_ids.length : (parseInt(row.member_count) || 0),
    currency: row.currency || 'USD',
    color: row.color || '#6366f1',
    createdAt: row.created_at
  };
}

function mapRole(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isSystem: row.is_system,
    color: row.color,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    createdAt: row.created_at
  };
}

function mapRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    trackingNumber: row.tracking_number,
    customerName: row.customer_name,
    customerCompany: row.customer_company,
    giftCategory: row.gift_category,
    giftItem: row.gift_item,
    discountPercentage: parseFloat(row.discount_percentage || 0),
    giftValue: parseFloat(row.gift_value || 0),
    budgetAmount: parseFloat(row.budget_amount || 0),
    teamId: row.team_id,
    teamName: row.team_name,
    reason: row.reason,
    requestDate: row.request_date ? new Date(row.request_date).toISOString().split('T')[0] : '',
    deliveryTargetDate: row.delivery_target_date ? new Date(row.delivery_target_date).toISOString().split('T')[0] : undefined,
    priority: row.priority,
    status: row.status,
    currentApprovalStepIndex: row.current_approval_step_index,
    totalApprovalSteps: row.total_approval_steps,
    currentApproverRole: row.current_approver_role,
    teamRemainingBudgetAtRequest: parseFloat(row.team_remaining_budget_at_request || 0),
    budgetAfterApproval: parseFloat(row.budget_after_approval || 0),
    approvedAmount: row.approved_amount != null ? parseFloat(row.approved_amount) : undefined,
    submittedByUserId: row.submitted_by_user_id,
    submittedByUserName: row.submitted_by_user_name,
    submittedByUserEmail: row.submitted_by_user_email,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    comments: Array.isArray(row.comments) ? row.comments : [],
    approvalHistory: Array.isArray(row.approval_history) ? row.approval_history : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapForm(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    version: row.version,
    fields: Array.isArray(row.fields) ? row.fields : [],
    isActive: row.is_active,
    requiresBudgetApproval: row.requires_budget_approval,
    createdById: row.created_by_id,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapFormAssignment(row) {
  if (!row) return null;
  return {
    id: row.id,
    formId: row.form_id,
    targetType: row.target_type,
    targetTeamId: row.target_team_id,
    targetTeamName: row.target_team_name,
    targetUserIds: Array.isArray(row.target_user_ids) ? row.target_user_ids : [],
    targetUserNames: Array.isArray(row.target_user_names) ? row.target_user_names : [],
    assignedByUserId: row.assigned_by_user_id,
    assignedByUserName: row.assigned_by_user_name,
    dueDate: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : undefined,
    assignedAt: row.assigned_at
  };
}

function mapBudgetTxn(row) {
  if (!row) return null;
  return {
    id: row.id,
    teamId: row.team_id,
    teamName: row.team_name,
    type: row.type,
    amount: parseFloat(row.amount || 0),
    balanceBefore: parseFloat(row.balance_before || 0),
    balanceAfter: parseFloat(row.balance_after || 0),
    reason: row.reason,
    requestId: row.request_id,
    performedByUserId: row.performed_by_user_id,
    performedByUserName: row.performed_by_user_name,
    isOverride: row.is_override,
    createdAt: row.created_at
  };
}

// ----------------------------------------------------
// FULL STATE BUNDLE (for fast app bootstrap)
// ----------------------------------------------------
app.get('/api/bootstrap', async (req, res) => {
  try {
    const [
      rolesRes,
      usersRes,
      teamsRes,
      requestsRes,
      formsRes,
      assignmentsRes,
      submissionsRes,
      txnsRes,
      notifsRes,
      logsRes,
      settingsRes
    ] = await Promise.all([
      pool.query('SELECT * FROM roles ORDER BY name ASC'),
      pool.query('SELECT * FROM users ORDER BY name ASC'),
      pool.query('SELECT * FROM teams ORDER BY name ASC'),
      pool.query('SELECT * FROM requests ORDER BY created_at DESC'),
      pool.query('SELECT * FROM forms ORDER BY created_at DESC'),
      pool.query('SELECT * FROM form_assignments ORDER BY assigned_at DESC'),
      pool.query('SELECT * FROM form_submissions ORDER BY submitted_at DESC'),
      pool.query('SELECT * FROM budget_transactions ORDER BY created_at DESC'),
      pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50'),
      pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200'),
      pool.query('SELECT data FROM settings WHERE id = $1', ['global'])
    ]);

    res.json({
      roles: rolesRes.rows.map(mapRole),
      users: usersRes.rows.map(mapUser),
      teams: teamsRes.rows.map(mapTeam),
      requests: requestsRes.rows.map(mapRequest),
      forms: formsRes.rows.map(mapForm),
      formAssignments: assignmentsRes.rows.map(mapFormAssignment),
      formSubmissions: submissionsRes.rows,
      budgetTransactions: txnsRes.rows.map(mapBudgetTxn),
      notifications: notifsRes.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        title: r.title,
        message: r.message,
        type: r.type,
        isRead: r.is_read,
        link: r.link,
        relatedEntityType: r.related_entity_type,
        relatedEntityId: r.related_entity_id,
        createdAt: r.created_at
      })),
      auditLogs: logsRes.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
        userRole: r.user_role,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        description: r.description,
        oldValue: r.old_value,
        newValue: r.new_value,
        ipAddress: r.ip_address,
        browser: r.browser,
        timestamp: r.timestamp
      })),
      settings: settingsRes.rows[0]?.data || null
    });
  } catch (err) {
    console.error('Error fetching bootstrap data', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// USERS
// ----------------------------------------------------
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY name ASC');
    res.json(result.rows.map(mapUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const u = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO users (id, name, email, avatar, role_id, role_name, team_id, team_name, department, title, phone, status, allocated_budget, spent_budget, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        u.id || `usr-${Date.now()}`,
        u.name,
        u.email,
        u.avatar || null,
        u.roleId || null,
        u.roleName || null,
        u.teamId || null,
        u.teamName || null,
        u.department || null,
        u.title || null,
        u.phone || null,
        u.status || 'active',
        u.allocatedBudget || 0,
        u.spentBudget || 0,
        u.createdAt || new Date().toISOString()
      ]
    );
    res.status(201).json(mapUser(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const u = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET
         name = COALESCE($1, name),
         email = COALESCE($2, email),
         avatar = COALESCE($3, avatar),
         role_id = COALESCE($4, role_id),
         role_name = COALESCE($5, role_name),
         team_id = COALESCE($6, team_id),
         team_name = COALESCE($7, team_name),
         department = COALESCE($8, department),
         title = COALESCE($9, title),
         phone = COALESCE($10, phone),
         status = COALESCE($11, status),
         allocated_budget = COALESCE($12, allocated_budget),
         spent_budget = COALESCE($13, spent_budget)
       WHERE id = $14
       RETURNING *`,
      [
        u.name,
        u.email,
        u.avatar,
        u.roleId,
        u.roleName,
        u.teamId,
        u.teamName,
        u.department,
        u.title,
        u.phone,
        u.status,
        u.allocatedBudget,
        u.spentBudget,
        id
      ]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(mapUser(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// TEAMS
// ----------------------------------------------------
app.get('/api/teams', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM teams ORDER BY name ASC');
    res.json(result.rows.map(mapTeam));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teams', async (req, res) => {
  const t = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO teams (id, name, description, department, lead_id, member_ids, total_allocated_budget, spent_budget, fiscal_year, color, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        t.id || `team-${Date.now()}`,
        t.name,
        t.description || '',
        t.department || '',
        t.leadId || null,
        JSON.stringify(t.memberIds || []),
        t.totalAllocatedBudget || 0,
        t.spentBudget || 0,
        t.fiscalYear || '2026',
        t.color || '#3b82f6',
        t.createdAt || new Date().toISOString()
      ]
    );
    res.status(201).json(mapTeam(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/teams/:id', async (req, res) => {
  const { id } = req.params;
  const t = req.body;
  try {
    const result = await pool.query(
      `UPDATE teams SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         department = COALESCE($3, department),
         lead_id = COALESCE($4, lead_id),
         member_ids = COALESCE($5, member_ids),
         total_allocated_budget = COALESCE($6, total_allocated_budget),
         spent_budget = COALESCE($7, spent_budget),
         color = COALESCE($8, color)
       WHERE id = $9
       RETURNING *`,
      [
        t.name,
        t.description,
        t.department,
        t.leadId,
        t.memberIds ? JSON.stringify(t.memberIds) : null,
        t.totalAllocatedBudget,
        t.spentBudget,
        t.color,
        id
      ]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Team not found' });
    res.json(mapTeam(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/teams/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// REQUESTS
// ----------------------------------------------------
app.get('/api/requests', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM requests ORDER BY created_at DESC');
    res.json(result.rows.map(mapRequest));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/requests', async (req, res) => {
  const reqData = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO requests (
         id, tracking_number, customer_name, customer_company, gift_category,
         gift_item, discount_percentage, gift_value, budget_amount, team_id,
         team_name, reason, request_date, delivery_target_date, priority,
         status, current_approval_step_index, total_approval_steps, current_approver_role,
         team_remaining_budget_at_request, budget_after_approval, approved_amount,
         submitted_by_user_id, submitted_by_user_name, submitted_by_user_email,
         attachments, comments, approval_history, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
       RETURNING *`,
      [
        reqData.id || `req-${Date.now()}`,
        reqData.trackingNumber || `RDX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        reqData.customerName,
        reqData.customerCompany || '',
        reqData.giftCategory || '',
        reqData.giftItem || '',
        reqData.discountPercentage || 0,
        reqData.giftValue || 0,
        reqData.budgetAmount || 0,
        reqData.teamId,
        reqData.teamName || '',
        reqData.reason || '',
        reqData.requestDate || new Date().toISOString().split('T')[0],
        reqData.deliveryTargetDate || null,
        reqData.priority || 'normal',
        reqData.status || 'draft',
        reqData.currentApprovalStepIndex || 0,
        reqData.totalApprovalSteps || 4,
        reqData.currentApproverRole || 'Executive',
        reqData.teamRemainingBudgetAtRequest || 0,
        reqData.budgetAfterApproval || 0,
        reqData.approvedAmount || null,
        reqData.submittedByUserId || null,
        reqData.submittedByUserName || '',
        reqData.submittedByUserEmail || '',
        JSON.stringify(reqData.attachments || []),
        JSON.stringify(reqData.comments || []),
        JSON.stringify(reqData.approvalHistory || []),
        reqData.createdAt || new Date().toISOString(),
        reqData.updatedAt || new Date().toISOString()
      ]
    );
    res.status(201).json(mapRequest(result.rows[0]));
  } catch (err) {
    console.error('Error saving request', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/requests/:id', async (req, res) => {
  const { id } = req.params;
  const r = req.body;
  try {
    const result = await pool.query(
      `UPDATE requests SET
         customer_name = COALESCE($1, customer_name),
         customer_company = COALESCE($2, customer_company),
         gift_category = COALESCE($3, gift_category),
         gift_item = COALESCE($4, gift_item),
         discount_percentage = COALESCE($5, discount_percentage),
         gift_value = COALESCE($6, gift_value),
         budget_amount = COALESCE($7, budget_amount),
         status = COALESCE($8, status),
         current_approval_step_index = COALESCE($9, current_approval_step_index),
         current_approver_role = COALESCE($10, current_approver_role),
         approved_amount = COALESCE($11, approved_amount),
         comments = COALESCE($12, comments),
         approval_history = COALESCE($13, approval_history),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING *`,
      [
        r.customerName,
        r.customerCompany,
        r.giftCategory,
        r.giftItem,
        r.discountPercentage,
        r.giftValue,
        r.budgetAmount,
        r.status,
        r.currentApprovalStepIndex,
        r.currentApproverRole,
        r.approvedAmount,
        r.comments ? JSON.stringify(r.comments) : null,
        r.approvalHistory ? JSON.stringify(r.approvalHistory) : null,
        id
      ]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Request not found' });
    res.json(mapRequest(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/requests/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM requests WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// BUDGET TRANSACTIONS
// ----------------------------------------------------
app.get('/api/budget-transactions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM budget_transactions ORDER BY created_at DESC');
    res.json(result.rows.map(mapBudgetTxn));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/budget-transactions', async (req, res) => {
  const b = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO budget_transactions (id, team_id, team_name, type, amount, balance_before, balance_after, reason, request_id, performed_by_user_id, performed_by_user_name, is_override, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        b.id || `txn-${Date.now()}`,
        b.teamId,
        b.teamName || '',
        b.type,
        b.amount,
        b.balanceBefore,
        b.balanceAfter,
        b.reason || '',
        b.requestId || null,
        b.performedByUserId || null,
        b.performedByUserName || '',
        b.isOverride ?? false,
        b.createdAt || new Date().toISOString()
      ]
    );
    res.status(201).json(mapBudgetTxn(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// FORMS & ASSIGNMENTS
// ----------------------------------------------------
app.get('/api/forms', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM forms ORDER BY created_at DESC');
    res.json(result.rows.map(mapForm));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/forms', async (req, res) => {
  const f = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO forms (id, title, description, category, version, fields, is_active, requires_budget_approval, created_by_id, created_by_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        f.id || `form-${Date.now()}`,
        f.title,
        f.description || '',
        f.category || 'General',
        f.version || 1,
        JSON.stringify(f.fields || []),
        f.isActive ?? true,
        f.requiresBudgetApproval ?? false,
        f.createdById || null,
        f.createdByName || null,
        f.createdAt || new Date().toISOString(),
        f.updatedAt || new Date().toISOString()
      ]
    );
    res.status(201).json(mapForm(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/form-assignments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM form_assignments ORDER BY assigned_at DESC');
    res.json(result.rows.map(mapFormAssignment));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/form-assignments', async (req, res) => {
  const fa = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO form_assignments (id, form_id, target_type, target_team_id, target_team_name, target_user_ids, target_user_names, assigned_by_user_id, assigned_by_user_name, due_date, assigned_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        fa.id || `fa-${Date.now()}`,
        fa.formId,
        fa.targetType,
        fa.targetTeamId || null,
        fa.targetTeamName || null,
        JSON.stringify(fa.targetUserIds || []),
        JSON.stringify(fa.targetUserNames || []),
        fa.assignedByUserId || null,
        fa.assignedByUserName || null,
        fa.dueDate || null,
        fa.assignedAt || new Date().toISOString()
      ]
    );
    res.status(201).json(mapFormAssignment(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// AUDIT LOGS & NOTIFICATIONS
// ----------------------------------------------------
app.get('/api/audit-logs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/audit-logs', async (req, res) => {
  const a = req.body;
  try {
    await pool.query(
      `INSERT INTO audit_logs (id, user_id, user_name, user_email, user_role, action, entity_type, entity_id, description, old_value, new_value, ip_address, browser, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        a.id || `audit-${Date.now()}`,
        a.userId || null,
        a.userName || null,
        a.userEmail || null,
        a.userRole || null,
        a.action,
        a.entityType,
        a.entityId || null,
        a.description || '',
        a.oldValue || null,
        a.newValue || null,
        a.ipAddress || '127.0.0.1',
        a.browser || 'Browser',
        a.timestamp || new Date().toISOString()
      ]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      message: r.message,
      type: r.type,
      isRead: r.is_read,
      link: r.link,
      relatedEntityType: r.related_entity_type,
      relatedEntityId: r.related_entity_id,
      createdAt: r.created_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications', async (req, res) => {
  const n = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, link, related_entity_type, related_entity_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        n.id || `notif-${Date.now()}`,
        n.userId || 'all',
        n.title,
        n.message,
        n.type,
        n.isRead ?? false,
        n.link || null,
        n.relatedEntityType || null,
        n.relatedEntityId || null,
        n.createdAt || new Date().toISOString()
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SETTINGS
// ----------------------------------------------------
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM settings WHERE id = $1', ['global']);
    res.json(result.rows[0]?.data || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO settings (id, data, updated_at)
       VALUES ('global', $1, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(req.body)]
    );
    res.json({ success: true, settings: req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
