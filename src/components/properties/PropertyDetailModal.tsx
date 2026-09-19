'use client';

import React from 'react';
import { Property, PropertyStatus } from '@/core/types/property';
import { PROPERTY_STATUS_CONFIG, OPERATION_CONFIG } from '@/core/config/constants';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  Building,
  DollarSign,
  MapPin,
  Bed,
  Bath,
  Car,
  Maximize2,
  ShieldAlert,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

interface PropertyDetailModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (property: Property) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: PropertyStatus) => Promise<void>;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onUpdateStatus,
}) => {
  if (!property) return null;

  const statusCfg = PROPERTY_STATUS_CONFIG[property.status] || PROPERTY_STATUS_CONFIG.disponible;
  const opCfg = OPERATION_CONFIG[property.operation] || OPERATION_CONFIG.compra;

  const formattedPrice = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(property.priceCOP);

  const formattedAdmin = property.adminFeeCOP
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(property.adminFeeCOP)
    : 'Incluida / $0';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${property.code} — ${property.title}`}
      subtitle={`${property.municipality} • ${property.zone}`}
      maxWidth="860px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header Badges & Actions */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '1rem 1.25rem',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span
              className="badge"
              style={{
                backgroundColor: opCfg.bg,
                color: opCfg.color,
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {opCfg.label}
            </span>
            <span
              className="badge"
              style={{
                backgroundColor: statusCfg.bg,
                color: statusCfg.color,
                borderColor: statusCfg.border,
                fontWeight: 700,
              }}
            >
              ● {statusCfg.label}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Asesor: <strong style={{ color: 'var(--text-primary)' }}>{property.assignedAgent}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link
              href={`/propiedades/${property.id}`}
              target="_blank"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(14, 165, 233, 0.15)',
                color: '#38bdf8',
                fontSize: '0.82rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={14} />
              <span>Ver Ficha Pública</span>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(property);
              }}
              icon={<Edit2 size={14} />}
            >
              Editar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm(`¿Estás seguro de eliminar el inmueble ${property.code}?`)) {
                  onDelete(property.id);
                  onClose();
                }
              }}
              icon={<Trash2 size={14} />}
            >
              Eliminar
            </Button>
          </div>
        </div>

        {/* Photo and Key Specs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem' }}>
          {/* Main Photo */}
          <div
            style={{
              position: 'relative',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              height: '240px',
              backgroundColor: '#0f172a',
            }}
          >
            {property.images && property.images.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={property.images[0]}
                alt={property.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                Sin Fotografía
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                bottom: '0.75rem',
                left: '0.75rem',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: '#ffffff',
                fontWeight: 600,
              }}
            >
              {property.type.toUpperCase()}
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'center' }}>
            <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Precio Comercial</span>
              <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)', margin: 0 }}>
                {formattedPrice}
              </p>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Administración: {formattedAdmin}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ padding: '0.65rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Maximize2 size={16} color="var(--primary-light)" />
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Área</span>
                  <strong style={{ fontSize: '0.86rem', color: '#fff' }}>{property.areaM2} m²</strong>
                </div>
              </div>

              <div style={{ padding: '0.65rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Bed size={16} color="var(--primary-light)" />
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Alcobas</span>
                  <strong style={{ fontSize: '0.86rem', color: '#fff' }}>{property.bedrooms}</strong>
                </div>
              </div>

              <div style={{ padding: '0.65rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Bath size={16} color="var(--primary-light)" />
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Baños</span>
                  <strong style={{ fontSize: '0.86rem', color: '#fff' }}>{property.bathrooms}</strong>
                </div>
              </div>

              <div style={{ padding: '0.65rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Car size={16} color="var(--primary-light)" />
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Parqueaderos</span>
                  <strong style={{ fontSize: '0.86rem', color: '#fff' }}>{property.parkingSpots}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Private Confidential Section (CRM Only) */}
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--accent-amber)', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <ShieldAlert size={16} />
            <span>Datos Confidenciales de Administración (Privado CRM)</span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '0.35rem', margin: 0, fontWeight: 500 }}>
            {property.internalAddress || 'Sin dirección interna especificada'}
          </p>
        </div>

        {/* Description & Features */}
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Descripción
          </span>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '0.35rem', margin: 0 }}>
            {property.description}
          </p>
        </div>

        {/* Features badges */}
        {property.features && property.features.length > 0 && (
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Amenidades y Características
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.45rem' }}>
              {property.features.map((f) => (
                <span
                  key={f}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.2rem 0.6rem',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  ✓ {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quick Status Changers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Cambiar Disponibilidad
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(['disponible', 'reservado', 'vendido', 'arrendado'] as PropertyStatus[]).map((st) => {
              const cfg = PROPERTY_STATUS_CONFIG[st];
              const isCurrent = property.status === st;

              return (
                <button
                  key={st}
                  onClick={() => onUpdateStatus(property.id, st)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isCurrent ? cfg.color : 'var(--border-subtle)'}`,
                    backgroundColor: isCurrent ? cfg.bg : 'rgba(255, 255, 255, 0.02)',
                    color: isCurrent ? cfg.color : 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: isCurrent ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};
