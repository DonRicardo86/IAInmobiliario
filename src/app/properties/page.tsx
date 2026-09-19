'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { PropertyFiltersBar } from '@/components/properties/PropertyFiltersBar';
import { PropertyTable } from '@/components/properties/PropertyTable';
import { PropertyModal } from '@/components/properties/PropertyModal';
import { PropertyDetailModal } from '@/components/properties/PropertyDetailModal';
import { LeadModal } from '@/components/leads/LeadModal';
import { Property, PropertyFilters, PropertyStatus } from '@/core/types/property';
import { propertyService } from '@/core/services/property.service';
import { leadService } from '@/core/services/lead.service';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Building2, Plus, DollarSign, Home, CheckCircle2 } from 'lucide-react';

export default function PropertiesAdminPage() {
  const { showToast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [inventoryStats, setInventoryStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [filters, setFilters] = useState<PropertyFilters>({
    search: '',
    operation: 'todos',
    type: 'todos',
    municipality: 'todos',
    status: 'todos',
    sortBy: 'date_desc',
  });

  // Modal states
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);
      const data = await propertyService.getProperties(filters);
      const stats = await propertyService.getInventoryStats();
      setProperties(data);
      setInventoryStats(stats);
    } catch (e) {
      console.error(e);
      showToast('Error al cargar inventario de propiedades', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const handleFilterChange = (updated: Partial<PropertyFilters>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleCreateProperty = async (propertyData: any) => {
    try {
      const created = await propertyService.createProperty(propertyData);
      showToast(`Inmueble "${created.code}" registrado con éxito`, 'success');
      await loadProperties();
    } catch (e: any) {
      showToast(e.message || 'Error al registrar inmueble', 'error');
    }
  };

  const handleEditProperty = async (propertyData: any) => {
    if (!editingProperty) return;
    try {
      const updated = await propertyService.updateProperty(editingProperty.id, propertyData);
      showToast(`Inmueble "${updated.code}" actualizado con éxito`, 'success');
      setEditingProperty(null);
      await loadProperties();
    } catch (e: any) {
      showToast(e.message || 'Error al actualizar inmueble', 'error');
    }
  };

  const handleStatusChange = async (id: string, status: PropertyStatus) => {
    try {
      const updated = await propertyService.updateStatus(id, status);
      showToast(`Disponibilidad de "${updated.code}" cambiada a ${status.toUpperCase()}`, 'success');
      if (selectedProperty && selectedProperty.id === id) {
        setSelectedProperty(updated);
      }
      await loadProperties();
    } catch (e: any) {
      showToast('Error al cambiar estado de disponibilidad', 'error');
    }
  };

  const handleDeleteProperty = async (id: string) => {
    try {
      await propertyService.deleteProperty(id);
      showToast('Inmueble eliminado del inventario', 'info');
      await loadProperties();
    } catch (e: any) {
      showToast('Error al eliminar inmueble', 'error');
    }
  };

  const handleCreateLead = async (leadData: any) => {
    try {
      const created = await leadService.createLead(leadData);
      showToast(`Prospecto "${created.name}" registrado`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Error al registrar prospecto', 'error');
    }
  };

  const formattedTotalValue = inventoryStats
    ? new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(inventoryStats.totalInventoryValueCOP)
    : '$0';

  return (
    <div className="app-container">
      <Sidebar onNewLeadClick={() => setIsNewLeadModalOpen(true)} />

      <main className="main-content">
        <Header
          title="Inventario Inmobiliario"
          onNewLeadClick={() => setIsNewLeadModalOpen(true)}
        />

        <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top Header Row with Action */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', margin: 0 }}>Gestión de Inventario</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem', margin: 0 }}>
                Control privado de propiedades, características, direcciones internas y disponibilidad comercial.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => setIsPropertyModalOpen(true)}
              icon={<Plus size={16} />}
            >
              Registrar Inmueble
            </Button>
          </div>

          {/* Inventory Quick KPI Bar */}
          {inventoryStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.6rem', backgroundColor: 'rgba(56, 189, 248, 0.15)', borderRadius: 'var(--radius-md)', color: '#38bdf8' }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Inmuebles</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{inventoryStats.totalProperties}</div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.6rem', backgroundColor: 'rgba(52, 211, 153, 0.15)', borderRadius: 'var(--radius-md)', color: '#34d399' }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Disponibles</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>{inventoryStats.availableCount}</div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.6rem', backgroundColor: 'rgba(251, 191, 36, 0.15)', borderRadius: 'var(--radius-md)', color: '#fbbf24' }}>
                  <Home size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reservados / Negociación</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}>{inventoryStats.reservedCount}</div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.6rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', borderRadius: 'var(--radius-md)', color: '#10b981' }}>
                  <DollarSign size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Valor Inventario Activo</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>{formattedTotalValue}</div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <PropertyFiltersBar
            filters={filters}
            onChange={handleFilterChange}
            totalResults={properties.length}
          />

          {/* Table */}
          <PropertyTable
            properties={properties}
            onSelectProperty={(prop) => setSelectedProperty(prop)}
            onEditProperty={(prop) => setEditingProperty(prop)}
            onDeleteProperty={handleDeleteProperty}
            onStatusChange={handleStatusChange}
          />
        </div>
      </main>

      {/* Property Create Modal */}
      <PropertyModal
        isOpen={isPropertyModalOpen}
        onClose={() => setIsPropertyModalOpen(false)}
        onSubmit={handleCreateProperty}
        mode="create"
      />

      {/* Property Edit Modal */}
      <PropertyModal
        isOpen={!!editingProperty}
        initialProperty={editingProperty}
        onClose={() => setEditingProperty(null)}
        onSubmit={handleEditProperty}
        mode="edit"
      />

      {/* Property Detail Admin Modal */}
      <PropertyDetailModal
        isOpen={!!selectedProperty}
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
        onEdit={(prop) => setEditingProperty(prop)}
        onDelete={handleDeleteProperty}
        onUpdateStatus={handleStatusChange}
      />

      {/* Quick Lead Modal */}
      <LeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        onSubmit={handleCreateLead}
        mode="create"
      />
    </div>
  );
}
