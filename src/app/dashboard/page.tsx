'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { StatCards } from '@/components/dashboard/StatCards';
import { PipelineDistribution } from '@/components/dashboard/PipelineDistribution';
import { HighPriorityLeads } from '@/components/dashboard/HighPriorityLeads';
import { LeadModal } from '@/components/leads/LeadModal';
import { LeadDetailModal } from '@/components/leads/LeadDetailModal';
import { PropertyModal } from '@/components/properties/PropertyModal';
import { Lead, LeadStats, LeadStatus, LeadPriority } from '@/core/types/lead';
import { leadService } from '@/core/services/lead.service';
import { propertyService } from '@/core/services/property.service';
import { useToast } from '@/components/ui/Toast';
import { Sparkles, Building2, Plus, ArrowRight, Calendar, Users, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const { showToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [inventoryStats, setInventoryStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isNewPropertyModalOpen, setIsNewPropertyModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const allLeads = await leadService.getLeads();
      const currentStats = await leadService.getDashboardStats();
      const propStats = await propertyService.getInventoryStats();
      setLeads(allLeads);
      setStats(currentStats);
      setInventoryStats(propStats);
    } catch (e) {
      console.error('Error loading dashboard data', e);
      showToast('Error al cargar datos del panel', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateLead = async (leadData: any) => {
    try {
      const created = await leadService.createLead(leadData);
      showToast(`Prospecto "${created.name}" registrado con éxito`, 'success');
      await loadData();
    } catch (e: any) {
      showToast(e.message || 'Error al crear prospecto', 'error');
    }
  };

  const handleCreateProperty = async (propData: any) => {
    try {
      const created = await propertyService.createProperty(propData);
      showToast(`Inmueble "${created.code}" registrado con éxito`, 'success');
      await loadData();
    } catch (e: any) {
      showToast(e.message || 'Error al crear inmueble', 'error');
    }
  };

  const handleEditLead = async (leadData: any) => {
    if (!editingLead) return;
    try {
      const updated = await leadService.updateLead(editingLead.id, leadData);
      showToast(`Prospecto "${updated.name}" actualizado con éxito`, 'success');
      setEditingLead(null);
      await loadData();
    } catch (e: any) {
      showToast(e.message || 'Error al actualizar prospecto', 'error');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: LeadStatus) => {
    try {
      const updated = await leadService.updateLead(id, { status: newStatus });
      showToast(`Estado cambiado a ${newStatus.toUpperCase()}`, 'success');
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead(updated);
      }
      await loadData();
    } catch (e: any) {
      showToast('Error al actualizar estado', 'error');
    }
  };

  const handleUpdatePriority = async (id: string, newPriority: LeadPriority) => {
    try {
      const updated = await leadService.updateLead(id, { priority: newPriority });
      showToast(`Prioridad actualizada a ${newPriority.toUpperCase()}`, 'success');
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead(updated);
      }
      await loadData();
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
      await loadData();
    } catch (e: any) {
      showToast('Error al agregar nota', 'error');
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await leadService.deleteLead(id);
      showToast('Prospecto eliminado correctamente', 'info');
      await loadData();
    } catch (e: any) {
      showToast('Error al eliminar prospecto', 'error');
    }
  };

  const handleResetData = async () => {
    if (confirm('¿Deseas reiniciar los datos de demostración a los prospectos e inmuebles iniciales?')) {
      await leadService.resetData();
      await propertyService.resetData();
      showToast('Datos de demostración restablecidos', 'info');
      await loadData();
    }
  };

  return (
    <div className="app-container">
      <Sidebar onNewLeadClick={() => setIsNewLeadModalOpen(true)} />

      <main className="main-content">
        <Header
          title="Panel Comercial de Administración"
          onNewLeadClick={() => setIsNewLeadModalOpen(true)}
          onResetDataClick={handleResetData}
        />

        <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Top Banner: Quick Actions & Live Public Links */}
          <div
            style={{
              padding: '1.25rem 1.75rem',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.25) 0%, rgba(14, 165, 233, 0.2) 100%)',
              border: '1px solid rgba(79, 70, 229, 0.4)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(79, 70, 229, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <Sparkles size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                  IA Inmobiliaria — Panel de Gestión Comercial
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)', marginTop: '0.2rem', margin: 0 }}>
                  Control de prospectos, inventario de propiedades, agenda de visitas y seguimiento comercial.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsNewPropertyModalOpen(true)}
                icon={<Building2 size={15} />}
              >
                + Inmueble
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNewLeadModalOpen(true)}
                icon={<Plus size={15} />}
              >
                + Prospecto
              </Button>
            </div>
          </div>

          {/* KPI Stat Cards */}
          {stats && <StatCards stats={stats} />}

          {/* Quick Stats: Visits & Inventory Highlights */}
          {stats && inventoryStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(56, 189, 248, 0.15)', borderRadius: 'var(--radius-md)', color: '#38bdf8' }}>
                  <Calendar size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Visitas Agendadas</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{stats.scheduledVisitsCount}</div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--secondary)' }}>Citas programadas</span>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(52, 211, 153, 0.15)', borderRadius: 'var(--radius-md)', color: '#34d399' }}>
                  <Home size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Inmuebles Disponibles</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>{inventoryStats.availableCount}</div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>de {inventoryStats.totalProperties} totales</span>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(251, 191, 36, 0.15)', borderRadius: 'var(--radius-md)', color: '#fbbf24' }}>
                  <Users size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Oportunidades Activas</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>{stats.pendingOpportunitiesCount}</div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>En proceso comercial</span>
                </div>
              </div>
            </div>
          )}

          {/* Sales Pipeline & Operation Distribution */}
          {stats && <PipelineDistribution stats={stats} />}

          {/* High Priority Leads */}
          <HighPriorityLeads
            leads={leads}
            onSelectLead={(lead) => setSelectedLead(lead)}
          />
        </div>
      </main>

      {/* New Lead Modal */}
      <LeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        onSubmit={handleCreateLead}
        mode="create"
      />

      {/* New Property Modal */}
      <PropertyModal
        isOpen={isNewPropertyModalOpen}
        onClose={() => setIsNewPropertyModalOpen(false)}
        onSubmit={handleCreateProperty}
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

      {/* Lead Detail & Activity Modal */}
      <LeadDetailModal
        isOpen={!!selectedLead}
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdateStatus={handleUpdateStatus}
        onUpdatePriority={handleUpdatePriority}
        onAddNote={handleAddNote}
        onEdit={(lead) => setEditingLead(lead)}
        onDelete={handleDeleteLead}
      />
    </div>
  );
}
