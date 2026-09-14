import React, { useState, useEffect } from 'react';
import { CommandPalette } from './CommandPalette';
import { QuickCreateModal } from './QuickCreateModal';

export const AppLayout = ({
  children,
  activePage,
  pageTitle,
  breadcrumbs = [],
  onNavigate,
  onRefresh,
}) => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [quickCreateState, setQuickCreateState] = useState({ isOpen: false, type: 'lead' });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    const handleOpenCommandPalette = () => {
      setIsCommandPaletteOpen(true);
    };
    const handleOpenQuickCreateModal = (e) => {
      const type = e.detail?.type || 'lead';
      setQuickCreateState({ isOpen: true, type });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('crm:open-command-palette', handleOpenCommandPalette);
    window.addEventListener('crm:open-quick-create', handleOpenQuickCreateModal);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('crm:open-command-palette', handleOpenCommandPalette);
      window.removeEventListener('crm:open-quick-create', handleOpenQuickCreateModal);
    };
  }, []);

  const handleOpenQuickCreate = (type = 'lead') => {
    setQuickCreateState({ isOpen: true, type });
  };

  const handleCloseQuickCreate = () => {
    setQuickCreateState({ isOpen: false, type: 'lead' });
  };

  return (
    <div className="flex flex-col min-w-0 min-h-full bg-slate-50">

      {/* Main Workspace Page Body */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">{children}</div>
      </main>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={onNavigate}
        onOpenQuickCreate={handleOpenQuickCreate}
      />

      {/* Universal Quick Create Modal */}
      <QuickCreateModal
        isOpen={quickCreateState.isOpen}
        initialType={quickCreateState.type}
        onClose={handleCloseQuickCreate}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
};
