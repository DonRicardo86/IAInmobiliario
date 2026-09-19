'use client';

import React from 'react';
import { Search, Plus, RotateCcw, Sparkles, PhoneCall } from 'lucide-react';
import { Button } from '../ui/Button';

interface HeaderProps {
  onNewLeadClick: () => void;
  onResetDataClick?: () => void;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onNewLeadClick,
  onResetDataClick,
  searchTerm,
  onSearchChange,
  title,
}) => {
  return (
    <header
      style={{
        height: '70px',
        backgroundColor: 'rgba(9, 13, 22, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 90,
      }}
    >
      {/* Title / Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              {title || 'Panel Comercial Inmobiliario'}
            </h1>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-full)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Sparkles size={11} />
              Demostración Guiada
            </span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Inmobiliaria Premier (Entorno Demo) — Datos aislados de muestra
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {onSearchChange && (
          <div
            style={{
              position: 'relative',
              width: '280px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Buscar prospecto, zona, teléfono..."
              value={searchTerm || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text-primary)',
                fontSize: '0.84rem',
                outline: 'none',
              }}
            />
          </div>
        )}

        {onResetDataClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetDataClick}
            title="Restablecer datos iniciales de prueba"
            style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}
          >
            <RotateCcw size={15} />
            <span>Reiniciar Demo</span>
          </Button>
        )}

        <Button
          variant="primary"
          size="md"
          onClick={onNewLeadClick}
          icon={<Plus size={16} />}
        >
          Nuevo Prospecto
        </Button>
      </div>
    </header>
  );
};
