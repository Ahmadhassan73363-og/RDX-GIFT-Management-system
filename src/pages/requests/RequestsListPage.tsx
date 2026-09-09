import React, { useState, useMemo } from 'react';
import {
  FileText,
  Table as TableIcon,
  Kanban,
  Calendar as CalendarIcon,
  Search,
  Filter,
  Plus,
  Download,
  ArrowUpDown,
  ChevronDown,
  X,
  SlidersHorizontal
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { GiftRequest, RequestStatus, RequestPriority } from '../../types/request';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { KanbanView } from './KanbanView';
import { CalendarView } from './CalendarView';
import { NewRequestModal } from './NewRequestModal';
import { RequestDetailPage } from './RequestDetailPage';

interface RequestsListPageProps {
  initialRequestId?: string;
  onClearInitialId?: () => void;
}

export const RequestsListPage: React.FC<RequestsListPageProps> = ({
  initialRequestId,
  onClearInitialId
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'calendar'>('table');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(initialRequestId || null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<RequestPriority | 'ALL'>('ALL');
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'tracking'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const teams = dataService.getTeams();
  const allRequests = dataService.getRequests();

  // Filter & sort requests
  const filteredRequests = useMemo(() => {
    let list = [...allRequests];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.trackingNumber.toLowerCase().includes(q) ||
        r.customerCompany.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.giftItem.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    }

    if (teamFilter !== 'ALL') {
      list = list.filter(r => r.teamId === teamFilter);
    }

    if (statusFilter !== 'ALL') {
      list = list.filter(r => r.status === statusFilter);
    }

    if (priorityFilter !== 'ALL') {
      list = list.filter(r => r.priority === priorityFilter);
    }

    // Sort
    list.sort((a, b) => {
      if (sortField === 'amount') {
        return sortOrder === 'asc' ? a.budgetAmount - b.budgetAmount : b.budgetAmount - a.budgetAmount;
      } else if (sortField === 'tracking') {
        return sortOrder === 'asc' ? a.trackingNumber.localeCompare(b.trackingNumber) : b.trackingNumber.localeCompare(a.trackingNumber);
      } else {
        return sortOrder === 'asc' ? a.requestDate.localeCompare(b.requestDate) : b.requestDate.localeCompare(a.requestDate);
      }
    });

    return list;
  }, [allRequests, searchQuery, teamFilter, statusFilter, priorityFilter, sortField, sortOrder, refreshKey]);

  const handleExportCSV = () => {
    const headers = ['Tracking #', 'Client Name', 'Company', 'Team', 'Item / Sample', 'Value', 'Discount %', 'Budget Amount', 'Status', 'Priority', 'Date'];
    const rows = filteredRequests.map(r => [
      r.trackingNumber,
      `"${r.customerName}"`,
      `"${r.customerCompany}"`,
      `"${r.teamName}"`,
      `"${r.giftItem}"`,
      r.giftValue,
      r.discountPercentage,
      r.budgetAmount,
      r.status,
      r.priority,
      r.requestDate
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `requests_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeFiltersCount = (teamFilter !== 'ALL' ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0) + (priorityFilter !== 'ALL' ? 1 : 0);

  // If a request is selected, render the detail page
  if (selectedRequestId) {
    return (
      <RequestDetailPage
        requestId={selectedRequestId}
        onBack={() => {
          setSelectedRequestId(null);
          if (onClearInitialId) onClearInitialId();
        }}
        onUpdate={() => setRefreshKey(k => k + 1)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Requests Hub
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage submissions, multi-level authorizations, and budget deduct allocations
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Switcher Tabs */}
          <div className="p-1 bg-muted rounded-xl border border-border flex items-center gap-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Data Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'kanban' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Kanban Board View"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'calendar' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Calendar Schedule View"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsNewModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Request
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by tracking #, customer name, company, item, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="bg-background border border-input text-xs rounded-lg px-2.5 py-2 text-foreground focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Teams</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-background border border-input text-xs rounded-lg px-2.5 py-2 text-foreground focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="pending_executive">Pending Executive</option>
              <option value="pending_manager">Pending Manager</option>
              <option value="pending_hod">Pending HOD</option>
              <option value="pending_president">Pending President</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="bg-background border border-input text-xs rounded-lg px-2.5 py-2 text-foreground focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTeamFilter('ALL');
                  setStatusFilter('ALL');
                  setPriorityFilter('ALL');
                  setSearchQuery('');
                }}
                className="text-xs text-primary"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Results counter & active sort info */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
          <span>
            Showing <strong>{filteredRequests.length}</strong> of {allRequests.length} requests
          </span>
          <div className="flex items-center gap-2">
            <span>Sort by:</span>
            <button
              onClick={() => {
                if (sortField === 'date') setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                else { setSortField('date'); setSortOrder('desc'); }
              }}
              className={`hover:text-foreground font-medium ${sortField === 'date' ? 'text-primary' : ''}`}
            >
              Date {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <span>•</span>
            <button
              onClick={() => {
                if (sortField === 'amount') setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                else { setSortField('amount'); setSortOrder('desc'); }
              }}
              className={`hover:text-foreground font-medium ${sortField === 'amount' ? 'text-primary' : ''}`}
            >
              Amount {sortField === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>
      </div>

      {/* Main View rendering */}
      {viewMode === 'table' ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                  <th className="p-3.5 pl-4">Tracking #</th>
                  <th className="p-3.5">Customer / Company</th>
                  <th className="p-3.5">Item / Sample & Category</th>
                  <th className="p-3.5">Team</th>
                  <th className="p-3.5">Retail / Discount</th>
                  <th className="p-3.5">Budget Charge</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Shipment</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5 text-right pr-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      No requests found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr
                      key={req.id}
                      onClick={() => setSelectedRequestId(req.id)}
                      className="hover:bg-muted/40 cursor-pointer transition-colors group"
                    >
                      <td className="p-3.5 pl-4 font-mono font-bold text-primary">
                        {req.trackingNumber}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {req.customerCompany}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{req.customerName}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-foreground font-medium truncate max-w-[200px]">
                          {req.sampleSku ? `${req.sampleSku}${req.sampleSkuQty ? ` (Qty: ${req.sampleSkuQty})` : ''}` : req.giftItem}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{req.typeOfFoc || req.giftCategory}</div>
                      </td>
                      <td className="p-3.5 text-muted-foreground font-medium">
                        {req.teamName}
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="text-foreground">${(req.giftValue || 0).toLocaleString()}</div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          -{req.discountPercentage || 0}% off
                        </div>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-sm text-foreground">
                        ${(req.budgetAmount || 0).toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={req.status} size="sm" />
                      </td>
                      <td className="p-3.5">
                        {/* Shipment status pill */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          req.shipmentStatus === 'delivered'
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400'
                            : req.shipmentStatus === 'ready_to_dispatch'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                        }`}>
                          {req.shipmentStatus === 'delivered' ? '📦 Delivered'
                            : req.shipmentStatus === 'ready_to_dispatch' ? '✅ Ready'
                            : '⏳ Pending'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <PriorityBadge priority={req.priority} size="sm" />
                      </td>
                      <td className="p-3.5 text-right pr-4 font-mono text-muted-foreground">
                        {req.requestDate}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : viewMode === 'kanban' ? (
        <KanbanView
          requests={filteredRequests}
          onSelectRequest={(req) => setSelectedRequestId(req.id)}
        />
      ) : (
        <CalendarView
          requests={filteredRequests}
          onSelectRequest={(req) => setSelectedRequestId(req.id)}
        />
      )}

      {/* Modal for creating a new request */}
      <NewRequestModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={(id) => {
          setSelectedRequestId(id);
          setRefreshKey(k => k + 1);
        }}
      />
    </div>
  );
};
