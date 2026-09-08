import React from 'react';
import { Mail, X, CheckCircle, ExternalLink } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export const EmailPreviewModal: React.FC = () => {
  const { selectedEmailPreview, closeEmailPreview } = useNotifications();

  if (!selectedEmailPreview) return null;

  return (
    <Modal
      isOpen={!!selectedEmailPreview}
      onClose={closeEmailPreview}
      title={
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          <span>Simulated Enterprise Email Delivery</span>
        </div>
      }
      description="Preview of transactional enterprise email dispatched by workflow triggers"
      maxWidth="lg"
      footer={
        <Button variant="primary" onClick={closeEmailPreview}>
          Close Preview
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Email Header Meta */}
        <div className="p-3 bg-muted/40 rounded-xl border border-border/80 text-xs space-y-1.5 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">To:</span>
            <span className="font-semibold text-foreground">{selectedEmailPreview.to}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subject:</span>
            <span className="font-semibold text-foreground">{selectedEmailPreview.subject}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Status:</span>
            <span className="text-emerald-500 font-medium flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Dispatched via Enterprise SMTP / SES
            </span>
          </div>
        </div>

        {/* Email Body Container */}
        <div className="p-6 rounded-xl border border-border bg-white text-slate-800 shadow-inner">
          <div className="border-b pb-3 mb-4 flex items-center justify-between">
            <span className="font-bold text-sm text-indigo-700 tracking-tight">RDX</span>
            <span className="text-[11px] text-slate-400">Automated Notification System</span>
          </div>
          <div
            className="prose prose-sm max-w-none text-slate-700"
            dangerouslySetInnerHTML={{ __html: selectedEmailPreview.htmlBody }}
          />
          <div className="mt-6 pt-4 border-t text-[11px] text-slate-400 flex items-center justify-between">
            <span>This is an automated system message. Do not reply directly.</span>
            <span>Security ID: #EXP-2026</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
