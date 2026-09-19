'use client';

import React from 'react';
import { LeadFilters, LeadPriority, LeadStatus, OperationType, PropertyType } from '@/core/types/lead';
import { PROPERTY_TYPES } from '@/core/config/constants';
import { Search, Table, Kanban, ArrowUpDown, Filter, X } from 'lucide-react';

interface LeadFiltersBarProps {
  filters: LeadFilters;
  onChange: (updated: Partial<LeadFilters>) => void;
  activeView: 'table' | 'kanban';
  onViewChange: (view: 'table' | 'kanban') => void;
  totalResults: number;
}

export const LeadFiltersBar: React.FC<LeadFiltersBarProps> = ({
  filters,
  onChange,
  activeView,
  onViewChange,
  totalResults,
}) => {
  const hasActiveFilters =
    filters.search !== '' ||
    filters.status !== 'todos' ||
    filters.priority !== 'todos' ||
    filters.operationType !== 'todos' ||
    filters.propertyType !== 'todos' ||
    filters.zone !== '';

  const clearFilters = () => {
    onChange({
      search: '',
      status: 'todos',
      priority: 'todos',
      operationType: 'todos',
      propertyType: 'todos',
      zone: '',
      sortBy: 'date_desc',
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '1.25rem',
        backgroundColor: 'var(--bg-card-glass)',
        backdropFilter: 'blur(12px)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-card)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Top row: Search, Operation toggle & View Switcher */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Search input */}
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '420px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Buscar por cliente, zona, teléfono o notas..."
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem 0.6rem 2.4rem',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Operation Type Switcher */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-input)',
            padding: '3px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {(
            [
              { value: 'todos', label: 'Todos' },
              { value: 'compra', label: 'Compra' },
              { value: 'arriendo', label: 'Arriendo' },
            ] as const
          ).map((op) => {
            const isActive = filters.operationType === op.value;
            return (
              <button
                key={op.value}
                onClick={() => onChange({ operationType: op.value })}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {op.label}
              </button>
            );
          })}
        </div>

        {/* View Switcher: Table vs Kanban */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-input)',
            padding: '3px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            onClick={() => onViewChange('table')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeView === 'table' ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: activeView === 'table' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            <Table size={15} />
            <span>Tabla</span>
          </button>
          <button
            onClick={() => onViewChange('kanban')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeView === 'kanban' ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: activeView === 'kanban' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            <Kanban size={15} />
            <span>Kanban</span>
          </button>
        </div>
      </div>

      {/* Second row: Dropdown filters & Sorting */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        {/* Status filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Estado:</span>
          <select
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value as any })}
            style={{
              padding: '0.35rem 0.65rem',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          >
            <option value="todos">Todos los Estados</option>
            <option value="nuevo">Nuevo</option>
            <option value="contactado">Contactado</option>
            <option value="interesado">Interesado</option>
            <option value="negociacion">Negociación</option>
            <option value="cerrado">Cerrado</option>
            <option value="no_interesado">No Interesado</option>
          </select>
        </div>

        {/* Priority filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Prioridad:</span>
          <select
            value={filters.priority}
            onChange={(e) => onChange({ priority: e.target.value as any })}
            style={{
              padding: '0.35rem 0.65rem',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          >
            <option value="todos">Todas</option>
            <option value="alto">🔥 Alta (Caliente)</option>
            <option value="medio">⚡ Media (Tibia)</option>
            <option value="bajo">❄️ Baja (Fría)</option>
          </select>
        </div>

        {/* Property type filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Inmueble:</span>
          <select
            value={filters.propertyType}
            onChange={(e) => onChange({ propertyType: e.target.value as any })}
            style={{
              padding: '0.35rem 0.65rem',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          >
            <option value="todos">Cualquier tipo</option>
            {PROPERTY_TYPES.map((pt) => (
              <option key={pt.value} value={pt.value}>
                {pt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort by */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
          <ArrowUpDown size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Ordenar:</span>
          <select
            value={filters.sortBy}
            onChange={(e) => onChange({ sortBy: e.target.value as any })}
            style={{
              padding: '0.35rem 0.65rem',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          >
            <option value="date_desc">Más recientes primero</option>
            <option value="date_asc">Más antiguos primero</option>
            <option value="priority">Mayor prioridad</option>
            <option value="budget_desc">Mayor presupuesto</option>
            <option value="budget_asc">Menor presupuesto</option>
          </select>
        </div>

        {/* Clear active filters button */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.6rem',
              color: '#fb7185',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <X size={13} />
            <span>Limpiar ({totalResults} encontrados)</span>
          </button>
        )}
      </div>
    </div>
  );
};
