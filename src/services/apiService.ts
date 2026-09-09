// Client API adapter to sync state with the PostgreSQL Express backend
export const api = {
  async getBootstrap() {
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async saveUser(user: any) {
    try {
      const method = user.id ? 'PUT' : 'POST';
      const url = user.id ? `/api/users/${user.id}` : '/api/users';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
    } catch (e) {
      console.warn('API sync failed for saveUser', e);
    }
  },

  async deleteUser(userId: string) {
    try {
      await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('API sync failed for deleteUser', e);
    }
  },

  async saveTeam(team: any) {
    try {
      const method = team.id ? 'PUT' : 'POST';
      const url = team.id ? `/api/teams/${team.id}` : '/api/teams';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(team)
      });
    } catch (e) {
      console.warn('API sync failed for saveTeam', e);
    }
  },

  async deleteTeam(teamId: string) {
    try {
      await fetch(`/api/teams/${teamId}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('API sync failed for deleteTeam', e);
    }
  },

  async createRequest(req: any) {
    try {
      await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      });
    } catch (e) {
      console.warn('API sync failed for createRequest', e);
    }
  },

  async updateRequest(id: string, req: any) {
    try {
      await fetch(`/api/requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      });
    } catch (e) {
      console.warn('API sync failed for updateRequest', e);
    }
  },

  async deleteRequest(id: string) {
    try {
      await fetch(`/api/requests/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('API sync failed for deleteRequest', e);
    }
  },

  async addBudgetTransaction(txn: any) {
    try {
      await fetch('/api/budget-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txn)
      });
    } catch (e) {
      console.warn('API sync failed for addBudgetTransaction', e);
    }
  },

  async saveForm(form: any) {
    try {
      await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
    } catch (e) {
      console.warn('API sync failed for saveForm', e);
    }
  },

  async saveFormAssignment(fa: any) {
    try {
      await fetch('/api/form-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fa)
      });
    } catch (e) {
      console.warn('API sync failed for saveFormAssignment', e);
    }
  },

  async addAuditLog(log: any) {
    try {
      await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      });
    } catch (e) {
      console.warn('API sync failed for addAuditLog', e);
    }
  },

  async addNotification(notif: any) {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notif)
      });
    } catch (e) {
      console.warn('API sync failed for addNotification', e);
    }
  },

  async updateSettings(settings: any) {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
    } catch (e) {
      console.warn('API sync failed for updateSettings', e);
    }
  }
};
