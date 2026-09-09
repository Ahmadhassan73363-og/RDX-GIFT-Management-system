import React, { useState } from 'react';
import { FileText, DollarSign, UploadCloud, AlertCircle, CheckCircle2, Trash2, Calendar, Calculator, Building, Tag, Hash, UserCheck } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { useAuth } from '../../context/AuthContext';
import { useSystem } from '../../context/SystemContext';
import { dataService } from '../../services/dataService';
import { RequestPriority } from '../../types/request';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (requestId: string) => void;
}

export const NewRequestModal: React.FC<NewRequestModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const { settings } = useSystem();
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

  // 7. Sample SKU: text field which can be typed
  const [sampleSku, setSampleSku] = useState('');

  // 8. Sample SKU QTY: text field which can be typed
  const [sampleSkuQty, setSampleSkuQty] = useState<number | ''>(1);

  // 9. Sample SKU COST PER UNIT: text field which can be typed
  const [sampleSkuCostPerUnit, setSampleSkuCostPerUnit] = useState<number | ''>(50);

  // General request metadata
  const [teamId, setTeamId] = useState(currentUser.teamId || teams[0]?.id || '');
  const [priority, setPriority] = useState<RequestPriority>('normal');
  const [reason, setReason] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; size: number; type: string }[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 10. Sample SKU Total: calculated from (qty * cost per item)
  const numQty = Number(sampleSkuQty) || 0;
  const numCostPerUnit = Number(sampleSkuCostPerUnit) || 0;
  const sampleSkuTotal = Math.round(numQty * numCostPerUnit * 100) / 100;

  // Selected team balance check
  const selectedTeam = teams.find(t => t.id === teamId);
  const currentRemaining = selectedTeam ? selectedTeam.remainingBudget : 0;
  const projectedBalance = currentRemaining - sampleSkuTotal;
  const isOverBudget = projectedBalance < 0;

  const handleAddMockFile = (name: string) => {
    setAttachments(prev => [
      ...prev,
      { name, size: Math.floor(Math.random() * 2000000) + 500000, type: 'application/pdf' }
    ]);
  };

  const handleRemoveFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!department.trim() || !agentOrTeamName.trim() || !businessName.trim() || !typeOfFoc.trim() || !sampleSku.trim()) {
      setError('Please fill in all required fields (Department, Agent/Team, Business Name, Type of FOC, Sample SKU)');
      return;
    }

    if (numQty <= 0) {
      setError('Sample SKU QTY must be greater than 0');
      return;
    }

    if (numCostPerUnit < 0) {
      setError('Sample SKU COST PER UNIT cannot be negative');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = dataService.createRequest(
        {
          date,
          department,
          agentOrTeamName,
          businessName,
          typeOfFoc,
          systemInvoiceNo: systemInvoiceNo || undefined,
          sampleSku,
          sampleSkuQty: numQty,
          sampleSkuCostPerUnit: numCostPerUnit,
          sampleSkuTotal,

          // Mapped fields for backwards compatibility across older widgets
          customerName: agentOrTeamName,
          customerCompany: businessName,
          giftCategory: typeOfFoc,
          giftItem: `${sampleSku} (Qty: ${numQty})`,
          giftValue: sampleSkuTotal,
          discountPercentage: 0,
          teamId,
          reason: reason.trim() || `FOC request for ${businessName} - SKU: ${sampleSku} (Qty: ${numQty})`,
          priority,
          attachments
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

        {/* Row 4: Sample SKU & QTY & Cost per Unit & Total Calculation */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-primary" />
              Sample SKU & Pricing Breakdown
            </span>
            <span className="text-[11px] text-muted-foreground">
              Auto-calculated total from Qty × Cost
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Sample SKU *"
              placeholder="e.g. SKU-RDX-8821"
              value={sampleSku}
              onChange={(e) => setSampleSku(e.target.value)}
              required
            />
            <Input
              label="Sample SKU QTY *"
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 5"
              value={sampleSkuQty}
              onChange={(e) => setSampleSkuQty(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Sample SKU COST PER UNIT ($) *"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 25.00"
              value={sampleSkuCostPerUnit}
              onChange={(e) => setSampleSkuCostPerUnit(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />

            {/* Calculated Sample SKU Total */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Sample SKU Total ($)
              </label>
              <div className="h-10 px-3.5 bg-background border-2 border-primary/40 rounded-lg flex items-center justify-between font-mono font-bold text-sm text-primary shadow-xs">
                <span>${sampleSkuTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-[10px] uppercase font-sans font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                  Qty × Cost
                </span>
              </div>
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
                  -${sampleSkuTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} → Projected: ${(projectedBalance || 0).toLocaleString()}
                </span>
              </div>
              {isOverBudget && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 pt-1 border-t border-rose-500/20">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Warning: Total exceeds current team remaining balance. Authorized override will be required.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Row 5: Team Allocation & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Team Budget Ledger *"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            options={teams.map(t => ({ label: `${t.name} ($${(t.remainingBudget || 0).toLocaleString()} left)`, value: t.id }))}
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

        {/* File attachments */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Supporting Documentation / Slips
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddMockFile('Sample_Invoice_Document.pdf')}
              leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
            >
              Attach Invoice (PDF)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddMockFile('Dispatch_Approval_Slip.pdf')}
              leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
            >
              Attach Dispatch Slip (PDF)
            </Button>
          </div>

          {attachments.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground">{file.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({Math.round(file.size / 1024)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
