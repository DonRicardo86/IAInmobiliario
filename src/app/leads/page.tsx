'use client';

import React, { useState, useEffect, useCallback, useTransition, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { LeadFiltersBar } from '@/components/leads/LeadFiltersBar';
import { LeadTable } from '@/components/leads/LeadTable';
import { LeadKanban } from '@/components/leads/LeadKanban';
import { LeadModal } from '@/components/leads/LeadModal';
import { LeadDetailModal } from '@/components/leads/LeadDetailModal';
import { Lead, LeadFilters, LeadPriority, LeadStatus } from '@/core/types/lead';
import { leadService } from '@/core/services/lead.service';
import { useToast } from '@/components/ui/Toast';

function LeadsContent() {
  const searchParams = useSearchParams();
  const initialView = searchParams.get('view') === 'kanban' ? 'kanban' : 'table';

  const { showToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeView, setActiveView] = useState<'table' | 'kanban'>(initialView);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filters, setFilters] = useState<LeadFilters>({
    search: '',
    status: 'todos',
    priority: 'todos',
    operationType: 'todos',
    propertyType: 'todos',
    zone: '',
    sortBy: 'date_desc',
  });

  // Modal states
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      const data = await leadService.getLeads(filters);
      setLeads(data);
    } catch (e) {
      console.error(e);
      showToast('Error al cargar prospectos', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleFilterChange = (updated: Partial<LeadFilters>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleCreateLead = async (leadData: any) => {
    try {
      const created = await leadService.createLead(leadData);
      showToast(`Prospecto "${created.name}" registrado exitosamente`, 'success');
      await loadLeads();
    } catch (e: any) {
      showToast(e.message || 'Error al registrar prospecto', 'error');
    }
  };

  const handleEditLead = async (leadData: any) => {
    if (!editingLead) return;
    try {
      const updated = await leadService.updateLead(editingLead.id, leadData);
      showToast(`Prospecto "${updated.name}" actualizado exitosamente`, 'success');
      setEditingLead(null);
      await loadLeads();
    } catch (e: any) {
      showToast(e.message || 'Error al actualizar prospecto', 'error');
    }
  };

  const handleStatusChange = async (id: string, newStatus: LeadStatus) => {
    try {
      const updated = await leadService.updateLead(id, { status: newStatus });
      showToast(`Estado actualizado a ${newStatus.toUpperCase()}`, 'success');
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead(updated);
      }
      await loadLeads();
    } catch (e: any) {
      showToast('Error al actualizar estado', 'error');
    }
  };

  const handlePriorityChange = async (id: string, newPriority: LeadPriority) => {
    try {
      const updated = await leadService.updateLead(id, { priority: newPriority });
      showToast(`Prioridad cambiada a ${newPriority.toUpperCase()}`, 'success');
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead(updated);
      }
      await loadLeads();
    } catch (e: any) {
      showToast('Error al actualizar prioridad', 'error');
    }
  };

  const handleAddNote = async (id: string, note: string) => {
    try {
      const updated = await leadService.addNote(id, note);
      showToast('Nota registrada en la bitácora', 'success');
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead(updated);
      }
      await loadLeads();
    } catch (e: any) {
      showToast('Error al agregar nota', 'error');
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await leadService.deleteLead(id);
      showToast('Prospecto eliminado', 'info');
      await loadLeads();
    } catch (e: any) {
      showToast('Error al eliminar prospecto', 'error');
    }
  };

  const handleResetData = async () => {
    if (confirm('¿Restablecer datos a los prospectos de demostración iniciales?')) {
      await leadService.resetData();
      showToast('Datos de demostración restablecidos', 'info');
      await loadLeads();
    }
  };

  return (
    <div className="app-container">
      <Sidebar onNewLeadClick={() => setIsNewLeadModalOpen(true)} />

      <main className="main-content">
        <Header
          title="Gestión de Prospectos"
          onNewLeadClick={() => setIsNewLeadModalOpen(true)}
          onResetDataClick={handleResetData}
        />

        <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Filters Bar */}
          <LeadFiltersBar
            filters={filters}
            onChange={handleFilterChange}
            activeView={activeView}
            onViewChange={(v) => setActiveView(v)}
            totalResults={leads.length}
          />

          {/* Main View: Table or Kanban */}
          {activeView === 'table' ? (
            <LeadTable
              leads={leads}
              onSelectLead={(lead) => setSelectedLead(lead)}
              onEditLead={(lead) => setEditingLead(lead)}
              onDeleteLead={handleDeleteLead}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <LeadKanban
              leads={leads}
              onSelectLead={(lead) => setSelectedLead(lead)}
              onStatusChange={handleStatusChange}
            />
          )}
        </div>
      </main>

      {/* New Lead Modal */}
      <LeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        onSubmit={handleCreateLead}
        mode="create"
      />

      {/* Edit Lead Modal */}
      <LeadModal
        isOpen={!!editingLead}
        initialLead={editingLead}
        onClose={() => setEditingLead(null)}
        onSubmit={handleEditLead}
        mode="edit"
      />

      {/* Lead Detail Modal */}
      <LeadDetailModal
        isOpen={!!selectedLead}
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdateStatus={handleStatusChange}
        onUpdatePriority={handlePriorityChange}
        onAddNote={handleAddNote}
        onEdit={(lead) => setEditingLead(lead)}
        onDelete={handleDeleteLead}
      />
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#fff' }}>Cargando prospectos...</div>}>
      <LeadsContent />
    </Suspense>
  );
}
