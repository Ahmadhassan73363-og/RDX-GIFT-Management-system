import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Building,
  User,
  Calendar,
  AlertTriangle,
  FileText,
  MessageSquare,
  Send,
  ShieldCheck,
  Award,
  ChevronRight,
  Printer
} from 'lucide-react';
import { GiftRequest, RequestStatus } from '../../types/request';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { SignaturePad } from '../../components/common/SignaturePad';
import { Modal } from '../../components/common/Modal';

interface RequestDetailPageProps {
  requestId: string;
  onBack: () => void;
  onUpdate: () => void;
}

export const RequestDetailPage: React.FC<RequestDetailPageProps> = ({ requestId, onBack, onUpdate }) => {
  const { currentUser, hasPermission } = useAuth();
  const request = dataService.getRequestById(requestId);
  const team = request ? dataService.getTeams().find(t => t.id === request.teamId) : null;

  const [commentText, setCommentText] = useState('');
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'request_changes' | 'override_approve'>('approve');
  const [actionComments, setActionComments] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [actionError, setActionError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!request || !team) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Request not found.</p>
        <Button variant="outline" onClick={onBack}>Back to Requests</Button>
      </div>
    );
  }

  const isPending = ['submitted', 'under_review', 'pending_executive', 'pending_assistant', 'pending_president'].includes(request.status);
  const canApprove = hasPermission('approvals:approve');
  const canOverride = hasPermission('budgets:override');
  const hasSufficientBudget = team.remainingBudget >= request.budgetAmount;

  // Stages
  const stages = [
    { order: 1, role: 'Executive', label: 'Executive Committee Review' },
    { order: 2, role: 'Assistant', label: 'Assistant Policy Verification' },
    { order: 3, role: 'President', label: 'Presidential Sign-Off' },
    { order: 4, role: 'Admin', label: 'Admin Budget Execution' },
  ];

  const handleOpenAction = (type: 'approve' | 'reject' | 'request_changes' | 'override_approve') => {
    setActionType(type);
    setActionComments('');
    setSignatureData('');
    setActionError('');
    setIsActionModalOpen(true);
  };

  const handleExecuteApproval = () => {
    setActionError('');
    if (actionType === 'reject' && !actionComments.trim()) {
      setActionError('A rationale comment is mandatory when rejecting a gift request.');
      return;
    }

    if ((actionType === 'approve' || actionType === 'override_approve') && !signatureData) {
      setActionError('Digital signature sign-off is required.');
      return;
    }

    setIsProcessing(true);
    try {
      dataService.processApprovalStep(
        request.id,
        actionType === 'override_approve' ? 'approve' : actionType,
        actionComments,
        signatureData,
        currentUser,
        actionType === 'override_approve'
      );
      setIsProcessing(false);
      setIsActionModalOpen(false);
      onUpdate();
    } catch (err: any) {
      setActionError(err.message || 'Error processing approval step');
      setIsProcessing(false);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    dataService.addCommentToRequest(request.id, commentText.trim(), currentUser);
    setCommentText('');
    onUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold font-mono text-primary tracking-tight">
                {request.trackingNumber}
              </h2>
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Submitted on {request.requestDate} by {request.submittedByUserName} ({request.teamName})
            </p>
          </div>
        </div>

        {/* Action Buttons for Approvers */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
            className="no-print"
          >
            Print
          </Button>

          {isPending && canApprove && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenAction('request_changes')}
              >
                Request Changes
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleOpenAction('reject')}
              >
                Reject
              </Button>

              {!hasSufficientBudget ? (
                canOverride ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenAction('override_approve')}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    Override & Approve
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" disabled title="Insufficient team remaining budget">
                    Budget Insufficient
                  </Button>
                )
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenAction('approve')}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Approve Stage
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Grid: Request details + Budget Impact Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Full Request Overview & Approval Workflow */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Gift Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Gift Details & Commercial Value</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Client / Recipient</span>
                  <p className="text-sm font-bold text-foreground">{request.customerName}</p>
                  <p className="text-xs text-muted-foreground">{request.customerCompany}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Category</span>
                  <p className="text-sm font-bold text-foreground">{request.giftCategory}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-1">
                <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Gift Item Description</span>
                <p className="text-sm font-semibold text-foreground">{request.giftItem}</p>
              </div>

              {/* Rationale */}
              <div className="space-y-1.5 text-xs">
                <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Business Justification</span>
                <p className="text-xs text-foreground/90 leading-relaxed bg-background p-3 rounded-lg border border-border">
                  {request.reason}
                </p>
              </div>

              {/* Attachments */}
              {request.attachments.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Attached Verification Documents</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {request.attachments.map(att => (
                      <div key={att.id} className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-medium truncate">{att.name}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                          {Math.round(att.size / 1024)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Multi-Level Approval Pipeline Visualizer */}
          <Card>
            <CardHeader>
              <CardTitle>Multi-Level Approval Pipeline</CardTitle>
              <p className="text-xs text-muted-foreground">
                Configured 4-stage executive governance chain
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 pt-2">
                {stages.map((stage, idx) => {
                  const historyEntry = request.approvalHistory.find(h => h.stepOrder === stage.order);
                  const isCurrent = isPending && request.currentApprovalStepIndex === stage.order;
                  const isPassed = request.currentApprovalStepIndex > stage.order || request.status === 'approved';
                  const isRejectedHere = request.status === 'rejected' && historyEntry?.action === 'reject';

                  return (
                    <div key={stage.order} className="flex items-start gap-4 text-xs">
                      {/* Circle indicator */}
                      <div className="relative flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isRejectedHere
                              ? 'bg-rose-500 text-white'
                              : isPassed
                              ? 'bg-emerald-500 text-white'
                              : isCurrent
                              ? 'bg-primary text-white ring-4 ring-primary/20 animate-pulse'
                              : 'bg-muted text-muted-foreground border border-border'
                          }`}
                        >
                          {isRejectedHere ? (
                            <XCircle className="w-4 h-4" />
                          ) : isPassed ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            stage.order
                          )}
                        </div>
                        {idx < stages.length - 1 && (
                          <div
                            className={`w-0.5 h-12 my-1 ${
                              isPassed ? 'bg-emerald-500' : 'bg-border'
                            }`}
                          />
                        )}
                      </div>

                      {/* Stage Body */}
                      <div className="flex-1 min-w-0 pb-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground text-sm">
                            {stage.label} ({stage.role})
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {isPassed
                              ? 'PASSED'
                              : isRejectedHere
                              ? 'DECLINED'
                              : isCurrent
                              ? 'AWAITING SIGN-OFF'
                              : 'UPCOMING'}
                          </span>
                        </div>

                        {historyEntry ? (
                          <div className="mt-1.5 p-2.5 rounded-lg bg-muted/40 border border-border/60 space-y-1 text-xs">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>Signed off by: <strong>{historyEntry.userName}</strong> ({historyEntry.roleName})</span>
                              <span className="font-mono">{new Date(historyEntry.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-foreground italic">"{historyEntry.comments}"</p>
                            {historyEntry.digitalSignature && (
                              <div className="text-[10px] text-primary font-mono pt-1 border-t border-border/40 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                <span>Digital Seal: {historyEntry.digitalSignature.substring(0, 40)}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {isCurrent ? `Pending sign-off by any ${stage.role} member.` : 'Waiting for prior stage completion.'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Comments & Collaboration Stream */}
          <Card>
            <CardHeader>
              <CardTitle>Comments & Discussion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {request.comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No comments yet.</p>
                ) : (
                  request.comments.map(c => (
                    <div key={c.id} className="p-3 rounded-xl bg-muted/30 border border-border/60 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{c.userName} ({c.userRole})</span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-foreground/90">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment */}
              <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add a remark or note for review committee..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 bg-background border border-input rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button type="submit" size="sm" variant="primary" leftIcon={<Send className="w-3.5 h-3.5" />}>
                  Post
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Real-Time Budget Impact Ledger */}
        <div className="space-y-6">
          <Card className="border-primary/30 shadow-md">
            <CardHeader>
              <CardTitle className="text-sm">Team Budget Impact Ledger</CardTitle>
              <p className="text-xs text-muted-foreground">
                Real-time financial reconciliation for {team.name}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Financial Snapshot Numbers */}
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/80">
                  <span className="text-muted-foreground">Retail Gift Value:</span>
                  <span className="font-semibold text-foreground">${request.giftValue.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-border/80">
                  <span className="text-muted-foreground">Corporate Discount:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">-{request.discountPercentage}%</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-border/80">
                  <span className="text-muted-foreground font-bold">Total Budget Charged:</span>
                  <span className="font-bold text-sm text-primary">${request.budgetAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-border/80">
                  <span className="text-muted-foreground">Current Team Remaining:</span>
                  <span className="font-semibold text-foreground">${team.remainingBudget.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted-foreground font-bold">Projected After Approval:</span>
                  <span className={`font-bold text-sm ${
                    hasSufficientBudget ? 'text-foreground' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    ${(team.remainingBudget - (request.status === 'approved' ? 0 : request.budgetAmount)).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Budget status alert */}
              {!hasSufficientBudget && request.status !== 'approved' && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Insufficient Budget Alert</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    This team only has ${team.remainingBudget.toLocaleString()} left. Standard approval is blocked unless authorized by Super Admin or President override.
                  </p>
                </div>
              )}

              {request.status === 'approved' && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Budget Deducted Successfully</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    ${request.budgetAmount.toLocaleString()} has been charged to {team.name}'s fiscal ledger.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submitter & Delivery Meta Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Metadata & Target Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Submitting User:</span>
                <span className="font-semibold text-foreground">{request.submittedByUserName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="text-foreground">{request.submittedByUserEmail}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Team:</span>
                <span className="text-foreground font-semibold">{request.teamName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Delivery Deadline:</span>
                <span className="font-mono text-foreground font-semibold">
                  {request.deliveryTargetDate || 'Immediate'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Interactive Approval Action Modal with Digital Signature */}
      <Modal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        title={
          actionType === 'approve'
            ? 'Sign & Authorize Request'
            : actionType === 'override_approve'
            ? 'Executive Budget Override Authorization'
            : actionType === 'reject'
            ? 'Decline Gift Request'
            : 'Request Modifications'
        }
        description={`Taking action as ${currentUser.name} (${currentUser.roleName})`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {actionError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {actionError}
            </div>
          )}

          {actionType === 'override_approve' && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
              <strong>Executive Override Notice:</strong> This request exceeds {team.name}'s remaining balance. Your digital authorization will be logged in the permanent enterprise audit register.
            </div>
          )}

          {/* Comments */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reviewer Notes / Rationale {actionType === 'reject' && '*'}
            </label>
            <textarea
              rows={3}
              value={actionComments}
              onChange={(e) => setActionComments(e.target.value)}
              placeholder={actionType === 'reject' ? 'Explain required reason for declining...' : 'Add remarks or stipulations (optional)...'}
              className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Digital Signature Pad (required for approve & override) */}
          {(actionType === 'approve' || actionType === 'override_approve') && (
            <SignaturePad
              value={signatureData}
              onChange={(data) => setSignatureData(data)}
              label="Reviewer Digital Sign-Off Seal"
              required
            />
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setIsActionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === 'reject' ? 'destructive' : 'primary'}
              size="sm"
              isLoading={isProcessing}
              onClick={handleExecuteApproval}
            >
              Confirm {actionType.replace(/_/g, ' ').toUpperCase()}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
