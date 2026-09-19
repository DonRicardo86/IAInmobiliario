'use client';

import React from 'react';
import { PropertyFilters, PropertyStatus, PropertyType, OperationType } from '@/core/types/property';
import { PROPERTY_TYPES, COLOMBIAN_CITIES } from '@/core/config/constants';
import { Search, X, Building, ArrowUpDown } from 'lucide-react';

interface PropertyFiltersBarProps {
  filters: PropertyFilters;
  onChange: (updated: Partial<PropertyFilters>) => void;
  totalResults: number;
}

export const PropertyFiltersBar: React.FC<PropertyFiltersBarProps> = ({
  filters,
  onChange,
  totalResults,
}) => {
  const hasActiveFilters =
    filters.search !== '' ||
    filters.operation !== 'todos' ||
    filters.type !== 'todos' ||
    (filters.municipality && filters.municipality !== 'todos') ||
    filters.status !== 'todos';

  const clearFilters = () => {
    onChange({
      search: '',
      operation: 'todos',
      type: 'todos',
      municipality: 'todos',
      status: 'todos',
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
      {/* Top row: Search & Operation Type Tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '440px' }}>
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
            placeholder="Buscar por código, título, barrio, amenidades..."
            value={filters.search || ''}
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
              { value: 'compra', label: 'Venta / Compra' },
              { value: 'arriendo', label: 'Arrendamiento' },
            ] as const
          ).map((op) => {
            const isActive = filters.operation === op.value || (!filters.operation && op.value === 'todos');
            return (
              <button
                key={op.value}
                onClick={() => onChange({ operation: op.value })}
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
      </div>

      {/* Second row: Dropdown filters */}
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
        {/* Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tipo:</span>
          <select
            value={filters.type || 'todos'}
            onChange={(e) => onChange({ type: e.target.value as any })}
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
            <option value="todos">Todos los Tipos</option>
            {PROPERTY_TYPES.map((pt) => (
              <option key={pt.value} value={pt.value}>
                {pt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Municipality Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Ciudad:</span>
          <select
            value={filters.municipality || 'todos'}
            onChange={(e) => onChange({ municipality: e.target.value })}
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
            <option value="todos">Todas las Ciudades</option>
            {COLOMBIAN_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Disponibilidad:</span>
          <select
            value={filters.status || 'todos'}
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
            <option value="disponible">Disponible</option>
            <option value="reservado">Reservado</option>
            <option value="vendido">Vendido</option>
            <option value="arrendado">Arrendado</option>
          </select>
        </div>

        {/* Sort by */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
          <ArrowUpDown size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Ordenar:</span>
          <select
            value={filters.sortBy || 'date_desc'}
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
            <option value="date_desc">Más recientes</option>
            <option value="price_asc">Menor precio</option>
            <option value="price_desc">Mayor precio</option>
            <option value="area_desc">Mayor área (m²)</option>
          </select>
        </div>

        {/* Clear */}
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
            <span>Limpiar ({totalResults} inmuebles)</span>
          </button>
        )}
      </div>
    </div>
  );
};
