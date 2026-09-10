import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { EmailPreviewModal } from '../notifications/EmailPreviewModal';

interface LayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPath, onNavigate }) => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <Header
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onToggleSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar: Permanent, full height of content viewport */}
        <div className="hidden md:flex w-64 shrink-0 h-full border-r border-sidebar-border bg-sidebar overflow-hidden">
          <Sidebar currentPath={currentPath} onNavigate={onNavigate} />
        </div>

        {/* Mobile Slide-Out Drawer & Backdrop */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fade-in"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            {/* Drawer */}
            <div className="relative w-72 max-w-[85vw] h-full bg-sidebar border-r border-sidebar-border shadow-2xl z-10 flex flex-col animate-fade-in">
              <div className="h-16 px-4 border-b border-sidebar-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-black flex items-center justify-center border border-border/40">
                    <img src="/rdx-logo.png" alt="RDX" className="w-7 h-7 object-contain" />
                  </div>
                  <span className="text-sm font-bold text-foreground">Navigation Menu</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-lg"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <Sidebar
                  currentPath={currentPath}
                  onNavigate={onNavigate}
                  onCloseMobile={() => setIsMobileSidebarOpen(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={onNavigate}
      />

      <EmailPreviewModal />
    </div>
  );
};
