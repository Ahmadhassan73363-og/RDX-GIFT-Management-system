import React, { useState } from 'react';
import { FileText, AlertCircle, Plus, Trash2, Calendar, Calculator } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { RequestPriority, SkuItem } from '../../types/request';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (requestId: string) => void;
}

interface SkuRow {
  id: string;
  sampleSku: string;
  sampleSkuQty: number | '';
  sampleSkuCostPerUnit: number | '';
}

export const NewRequestModal: React.FC<NewRequestModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const teams = dataService.getTeams().filter(t => t.active);

  // 1. Date: Auto-fetch current date (YYYY-MM-DD)
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  // 2. Department: text field which can be typed
  const [department, setDepartment] = useState(currentUser.department || 'Commercial Sales');

  // 3. Agent/Team Name: text field which can be typed
  const [agentOrTeamName, setAgentOrTeamName] = useState(currentUser.name || '');

  // 4. Business Name: text field which can be typed
  const [businessName, setBusinessName] = useState('');

  // 5. Type of FOC: text field which can be typed
  const [typeOfFoc, setTypeOfFoc] = useState('Product Sample / Trial');

  // 6. System Invoice no.: text field which can be typed number
  const [systemInvoiceNo, setSystemInvoiceNo] = useState('');

  // Team & Priority (Moved above SKU calculator per user requirement)
  const [teamId, setTeamId] = useState(currentUser.teamId || teams[0]?.id || '');
  const [priority, setPriority] = useState<RequestPriority>('normal');

  // Multiple SKU Rows
  const [skuRows, setSkuRows] = useState<SkuRow[]>([
    { id: 'sku-1', sampleSku: '', sampleSkuQty: 1, sampleSkuCostPerUnit: 50 }
  ]);

  // General request metadata
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SKU Handlers
  const handleAddSkuRow = () => {
    setSkuRows(prev => [
      ...prev,
      {
        id: 'sku-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        sampleSku: '',
        sampleSkuQty: 1,
        sampleSkuCostPerUnit: 0
      }
    ]);
  };

  const handleRemoveSkuRow = (id: string) => {
    if (skuRows.length <= 1) return;
    setSkuRows(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateSkuRow = (id: string, field: keyof SkuRow, value: any) => {
    setSkuRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // Calculated items and totals
  const calculatedSkuItems: SkuItem[] = skuRows.map(r => {
    const qty = Number(r.sampleSkuQty) || 0;
    const unitCost = Number(r.sampleSkuCostPerUnit) || 0;
    const lineTotal = Math.round(qty * unitCost * 100) / 100;
    return {
      id: r.id,
      sampleSku: r.sampleSku,
      sampleSkuQty: r.sampleSkuQty,
      sampleSkuCostPerUnit: r.sampleSkuCostPerUnit,
      sampleSkuTotal: lineTotal
    };
  });

  const totalSkuQty = calculatedSkuItems.reduce((acc, item) => acc + (Number(item.sampleSkuQty) || 0), 0);
  const grandSkuTotal = Math.round(calculatedSkuItems.reduce((acc, item) => acc + (item.sampleSkuTotal || 0), 0) * 100) / 100;

  // Selected team balance check
  const selectedTeam = teams.find(t => t.id === teamId);
  const currentRemaining = selectedTeam ? selectedTeam.remainingBudget : 0;
  const projectedBalance = currentRemaining - grandSkuTotal;
  const isOverBudget = projectedBalance < 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!department.trim() || !agentOrTeamName.trim() || !businessName.trim() || !typeOfFoc.trim()) {
      setError('Please fill in all required operational details (Department, Agent/Team, Business Name, Type of FOC)');
      return;
    }

    if (skuRows.some(r => !r.sampleSku.trim())) {
      setError('Please provide a SKU name/code for all SKU items');
      return;
    }

    if (skuRows.some(r => (Number(r.sampleSkuQty) || 0) <= 0)) {
      setError('All SKU items must have a quantity greater than 0');
      return;
    }

    if (skuRows.some(r => (Number(r.sampleSkuCostPerUnit) || 0) < 0)) {
      setError('Cost per unit cannot be negative');
      return;
    }

    setIsSubmitting(true);
    try {
      const primarySku = calculatedSkuItems.map(s => s.sampleSku).filter(Boolean).join(', ');
      const created = dataService.createRequest(
        {
          date,
          department,
          agentOrTeamName,
          businessName,
          typeOfFoc,
          systemInvoiceNo: systemInvoiceNo || undefined,
          sampleSku: primarySku,
          sampleSkuQty: totalSkuQty,
          sampleSkuCostPerUnit: calculatedSkuItems[0]?.sampleSkuCostPerUnit !== '' ? Number(calculatedSkuItems[0]?.sampleSkuCostPerUnit) : 0,
          sampleSkuTotal: grandSkuTotal,
          skuItems: calculatedSkuItems,

          // Mapped fields for backwards compatibility
          customerName: agentOrTeamName,
          customerCompany: businessName,
          giftCategory: typeOfFoc,
          giftItem: `${primarySku} (Total Qty: ${totalSkuQty})`,
          giftValue: grandSkuTotal,
          discountPercentage: 0,
          teamId,
          reason: reason.trim() || `FOC request for ${businessName} - SKUs: ${primarySku} (Total Qty: ${totalSkuQty})`,
          priority,
          attachments: []
        },
        currentUser
      );

      setIsSubmitting(false);
      onClose();
      onSuccess(created.id);
    } catch (err: any) {
      setError(err.message || 'Error creating request');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <span>New Request</span>
        </div>
      }
      description="Submit a new sample/FOC request for multi-level authorization and budget tracking"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Row 1: Date (Auto-fetched) & Department */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Date (Auto-fetched) *
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Current Date
              </span>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full h-10 px-3.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <Input
            label="Department *"
            placeholder="e.g. Commercial Sales / Marketing"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
          />
        </div>

        {/* Row 2: Agent/Team Name & Business Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Agent / Team Name *"
            placeholder="e.g. John Doe / Apex Sales Team"
            value={agentOrTeamName}
            onChange={(e) => setAgentOrTeamName(e.target.value)}
            required
          />
          <Input
            label="Business Name *"
            placeholder="e.g. Acme Corporation"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
          />
        </div>

        {/* Row 3: Type of FOC & System Invoice no. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Type of FOC *"
            placeholder="e.g. Promotional Sample / Customer Trial"
            value={typeOfFoc}
            onChange={(e) => setTypeOfFoc(e.target.value)}
            required
          />
          <Input
            label="System Invoice no."
            type="number"
            placeholder="e.g. 109482"
            value={systemInvoiceNo}
            onChange={(e) => setSystemInvoiceNo(e.target.value)}
          />
        </div>

        {/* Row 4: Team Allocation & Priority (Positioned ABOVE the SKU Calculator per user request) */}
        <div className="p-3.5 rounded-xl bg-card border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Budget Ledger & Priority Allocation
            </span>
            <span className="text-[11px] text-muted-foreground">
              Required for departmental spend control
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Team Budget Ledger *"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              options={teams.map(t => ({
                label: `${t.name} ($${(t.remainingBudget || 0).toLocaleString()} left)`,
                value: t.id
              }))}
            />
            <Select
              label="Priority *"
              value={priority}
              onChange={(e) => setPriority(e.target.value as RequestPriority)}
              options={[
                { label: 'Low', value: 'low' },
                { label: 'Normal', value: 'normal' },
                { label: 'High', value: 'high' },
                { label: 'Urgent', value: 'urgent' },
              ]}
            />
          </div>
        </div>

        {/* Row 5: Multiple SKU Calculators Section */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground">
                Sample SKU Calculators ({skuRows.length})
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddSkuRow}
              leftIcon={<Plus className="w-3.5 h-3.5 text-primary" />}
              className="text-xs font-semibold"
            >
              Add SKU Item
            </Button>
          </div>

          <div className="space-y-3">
            {skuRows.map((row, index) => {
              const qty = Number(row.sampleSkuQty) || 0;
              const unitCost = Number(row.sampleSkuCostPerUnit) || 0;
              const lineTotal = Math.round(qty * unitCost * 100) / 100;

              return (
                <div
                  key={row.id}
                  className="p-3.5 rounded-lg bg-background border border-border/70 space-y-3 shadow-2xs relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Item #{index + 1}
                    </span>
                    {skuRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSkuRow(row.id)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded-md"
                        title="Remove SKU Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div className="sm:col-span-1">
                      <Input
                        label="Sample SKU *"
                        placeholder="e.g. SKU-RDX-8821"
                        value={row.sampleSku}
                        onChange={(e) => handleUpdateSkuRow(row.id, 'sampleSku', e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Input
                        label="QTY *"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="e.g. 5"
                        value={row.sampleSkuQty}
                        onChange={(e) => handleUpdateSkuRow(row.id, 'sampleSkuQty', e.target.value === '' ? '' : Number(e.target.value))}
                        required
                      />
                    </div>

                    <div>
                      <Input
                        label="Cost / Unit ($) *"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 25.00"
                        value={row.sampleSkuCostPerUnit}
                        onChange={(e) => handleUpdateSkuRow(row.id, 'sampleSkuCostPerUnit', e.target.value === '' ? '' : Number(e.target.value))}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Line Total
                      </label>
                      <div className="h-10 px-3 bg-muted/40 border border-border rounded-lg flex items-center justify-between font-mono font-bold text-sm text-foreground">
                        <span>${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className="text-[10px] uppercase font-sans font-medium text-muted-foreground">
                          {qty} × ${unitCost}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Combined SKU Grand Total Banner */}
          <div className="p-3.5 rounded-lg bg-card border-2 border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Calculated Grand Total:</span>
              <span className="text-xs text-muted-foreground">
                ({totalSkuQty} total items across {skuRows.length} {skuRows.length === 1 ? 'SKU' : 'SKUs'})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold font-mono text-primary">
                ${grandSkuTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Real-time Team Budget Impact Box */}
          {selectedTeam && (
            <div className={`p-3 rounded-lg border text-xs space-y-1.5 transition-colors ${
              isOverBudget
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                : 'bg-primary/5 border-primary/20 text-foreground'
            }`}>
              <div className="flex items-center justify-between font-medium">
                <span>Allocated Team Ledger: <strong>{selectedTeam.name}</strong></span>
                <span>Remaining Balance: <strong>${(currentRemaining || 0).toLocaleString()}</strong></span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>Cost after approval:</span>
                <span className="font-mono font-bold">
                  -${grandSkuTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} → Projected: ${(projectedBalance || 0).toLocaleString()}
                </span>
              </div>
              {isOverBudget && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 pt-1 border-t border-rose-500/20">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Warning: Grand total exceeds current team remaining balance. Authorized override will be required.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Business Rationale / Comments */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Business Rationale & Deal Justification
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain how this sample/request supports relationship building, evaluations, contract renewals, or corporate milestones..."
            className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Submit for Multi-Level Review
          </Button>
        </div>
      </form>
    </Modal>
  );
};
