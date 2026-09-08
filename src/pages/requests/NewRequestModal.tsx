import React, { useState } from 'react';
import { Gift, DollarSign, UploadCloud, AlertCircle, CheckCircle2, FileText, Trash2 } from 'lucide-react';
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

  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [giftCategory, setGiftCategory] = useState(settings.categories[0] || 'Premium Electronics');
  const [giftItem, setGiftItem] = useState('');
  const [giftValue, setGiftValue] = useState<number | ''>(1000);
  const [discountPercentage, setDiscountPercentage] = useState<number | ''>(20);
  const [teamId, setTeamId] = useState(currentUser.teamId || teams[0]?.id || '');
  const [priority, setPriority] = useState<RequestPriority>('normal');
  const [deliveryTargetDate, setDeliveryTargetDate] = useState('');
  const [reason, setReason] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; size: number; type: string }[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Financial calculations
  const numValue = Number(giftValue) || 0;
  const numDiscount = Number(discountPercentage) || 0;
  const discountMultiplier = Math.max(0, 1 - (numDiscount / 100));
  const calculatedBudgetAmount = Math.round(numValue * discountMultiplier * 100) / 100;

  // Selected team balance check
  const selectedTeam = teams.find(t => t.id === teamId);
  const currentRemaining = selectedTeam ? selectedTeam.remainingBudget : 0;
  const projectedBalance = currentRemaining - calculatedBudgetAmount;
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

    if (!customerName.trim() || !customerCompany.trim() || !giftItem.trim() || !reason.trim()) {
      setError('Please fill in all required fields marked with *');
      return;
    }

    if (calculatedBudgetAmount <= 0) {
      setError('Calculated budget amount must be greater than $0');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = dataService.createRequest(
        {
          customerName,
          customerCompany,
          giftCategory,
          giftItem,
          discountPercentage: numDiscount,
          giftValue: numValue,
          teamId,
          reason,
          priority,
          deliveryTargetDate: deliveryTargetDate || undefined,
          attachments
        },
        currentUser
      );

      setIsSubmitting(false);
      onClose();
      onSuccess(created.id);
    } catch (err: any) {
      setError(err.message || 'Error creating gift request');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          <span>New Customer Gift Request</span>
        </div>
      }
      description="Submit a discounted customer or partner gift for multi-level executive authorization"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Client & Company */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Recipient Full Name *"
            placeholder="e.g. Eleanor Vance"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
          <Input
            label="Client Organization / Company *"
            placeholder="e.g. Apex Global Industries"
            value={customerCompany}
            onChange={(e) => setCustomerCompany(e.target.value)}
            required
          />
        </div>

        {/* Category & Gift Item */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Gift Category *"
            value={giftCategory}
            onChange={(e) => setGiftCategory(e.target.value)}
            options={settings.categories.map(c => ({ label: c, value: c }))}
          />
          <Input
            label="Gift Item Description *"
            placeholder="e.g. Montblanc Meisterstück Pen"
            value={giftItem}
            onChange={(e) => setGiftItem(e.target.value)}
            required
          />
        </div>

        {/* Financial & Discounting Inputs */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Financial & Discount Calculations
            </span>
            <span className="text-[11px] text-muted-foreground">
              Automatic budget deduction upon approval
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Retail Gift Value ($) *"
              type="number"
              min="1"
              value={giftValue}
              onChange={(e) => setGiftValue(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />
            <Input
              label="Discount Applied (%) *"
              type="number"
              min="0"
              max="100"
              value={discountPercentage}
              onChange={(e) => setDiscountPercentage(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Net Budget Charge ($)
              </label>
              <div className="h-10 px-3.5 bg-background border border-border rounded-lg flex items-center font-mono font-bold text-sm text-primary shadow-xs">
                ${calculatedBudgetAmount.toLocaleString()}
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
                <span>Team: <strong>{selectedTeam.name}</strong></span>
                <span>Current Balance: <strong>${currentRemaining.toLocaleString()}</strong></span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>Cost after approval:</span>
                <span className="font-mono font-bold">
                  -${calculatedBudgetAmount.toLocaleString()} → Projected: ${projectedBalance.toLocaleString()}
                </span>
              </div>
              {isOverBudget && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 pt-1 border-t border-rose-500/20">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Warning: This amount exceeds current remaining balance! Approval will require authorized override.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Team, Priority, Delivery Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Team Allocation *"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            options={teams.map(t => ({ label: `${t.name} ($${t.remainingBudget.toLocaleString()} left)`, value: t.id }))}
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
          <Input
            label="Target Delivery Date"
            type="date"
            value={deliveryTargetDate}
            onChange={(e) => setDeliveryTargetDate(e.target.value)}
          />
        </div>

        {/* Reason / Business Justification */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Business Rationale & Deal Justification *
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain how this discounted gift supports relationship building, contract renewals, or corporate milestones..."
            required
            className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* File attachments simulation */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Supporting Documentation / Quotes
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddMockFile('Vendor_Quotation.pdf')}
              leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
            >
              Attach Quote (PDF)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddMockFile('Client_Contract_Addendum.pdf')}
              leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
            >
              Attach Contract (PDF)
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
