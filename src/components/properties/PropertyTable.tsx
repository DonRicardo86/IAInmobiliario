'use client';

import React from 'react';
import { Property, PropertyStatus } from '@/core/types/property';
import { PROPERTY_STATUS_CONFIG, OPERATION_CONFIG } from '@/core/config/constants';
import { Eye, Edit2, Trash2, ExternalLink, MapPin, Maximize2, Bed, Bath } from 'lucide-react';
import Link from 'next/link';

interface PropertyTableProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  onEditProperty: (property: Property) => void;
  onDeleteProperty: (id: string) => void;
  onStatusChange: (id: string, status: PropertyStatus) => void;
}

export const PropertyTable: React.FC<PropertyTableProps> = ({
  properties,
  onSelectProperty,
  onEditProperty,
  onDeleteProperty,
  onStatusChange,
}) => {
  if (properties.length === 0) {
    return (
      <div
        style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          backgroundColor: 'var(--bg-card-glass)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-card)',
        }}
      >
        <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          No se encontraron inmuebles con los filtros aplicados.
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
          Intenta ajustar los criterios de búsqueda o registra un nuevo inmueble en el inventario.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        overflowX: 'auto',
        backgroundColor: 'var(--bg-card-glass)',
        backdropFilter: 'blur(12px)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-card)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr
            style={{
              borderBottom: '1px solid var(--border-subtle)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Código / Inmueble
            </th>
            <th style={{ padding: '0.9rem 1rem', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tipo / Operación
            </th>
            <th style={{ padding: '0.9rem 1rem', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ubicación
            </th>
            <th style={{ padding: '0.9rem 1rem', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Precio Comercial
            </th>
            <th style={{ padding: '0.9rem 1rem', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Especificaciones
            </th>
            <th style={{ padding: '0.9rem 1rem', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Estado
            </th>
            <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {properties.map((prop) => {
            const statusCfg = PROPERTY_STATUS_CONFIG[prop.status] || PROPERTY_STATUS_CONFIG.disponible;
            const opCfg = OPERATION_CONFIG[prop.operation] || OPERATION_CONFIG.compra;

            const formattedPrice = new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP',
              maximumFractionDigits: 0,
            }).format(prop.priceCOP);

            return (
              <tr
                key={prop.id}
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  transition: 'background-color var(--transition-fast)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onClick={() => onSelectProperty(prop)}
              >
                {/* Image & Title */}
                <td style={{ padding: '0.85rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        backgroundColor: '#0f172a',
                        flexShrink: 0,
                      }}
                    >
                      {prop.images && prop.images.length > 0 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={prop.images[0]} alt={prop.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#64748b' }}>
                          N/A
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--primary-light)', letterSpacing: '0.04em' }}>
                        {prop.code}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', maxWidth: '260px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {prop.title}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Type & Operation */}
                <td style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: opCfg.bg,
                        color: opCfg.color,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      {opCfg.label}
                    </span>
                    <span style={{ fontSize: '0.84rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                      {prop.type}
                    </span>
                  </div>
                </td>

                {/* Location */}
                <td style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    <MapPin size={13} color="var(--text-muted)" />
                    <span>{prop.municipality} • {prop.zone}</span>
                  </div>
                </td>

                {/* Price */}
                <td style={{ padding: '0.85rem 1rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '0.92rem' }}>
                    {formattedPrice}
                  </span>
                </td>

                {/* Specs */}
                <td style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <span>{prop.areaM2} m²</span>
                    <span>•</span>
                    <span>{prop.bedrooms} alc.</span>
                    <span>•</span>
                    <span>{prop.bathrooms} bñ.</span>
                  </div>
                </td>

                {/* Availability Status */}
                <td style={{ padding: '0.85rem 1rem' }}>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: statusCfg.bg,
                      color: statusCfg.color,
                      borderColor: statusCfg.border,
                      fontSize: '0.76rem',
                    }}
                  >
                    ● {statusCfg.label}
                  </span>
                </td>

                {/* Actions */}
                <td
                  style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                    <Link
                      href={`/propiedades/${prop.id}`}
                      target="_blank"
                      title="Ver ficha pública"
                      style={{
                        padding: '0.35rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(14, 165, 233, 0.1)',
                        color: '#38bdf8',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <ExternalLink size={15} />
                    </Link>

                    <button
                      onClick={() => onSelectProperty(prop)}
                      title="Ver detalles completos"
                      style={{
                        padding: '0.35rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Eye size={15} />
                    </button>

                    <button
                      onClick={() => onEditProperty(prop)}
                      title="Editar"
                      style={{
                        padding: '0.35rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Edit2 size={15} />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar inmueble ${prop.code}?`)) {
                          onDeleteProperty(prop.id);
                        }
                      }}
                      title="Eliminar"
                      style={{
                        padding: '0.35rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(244, 63, 94, 0.1)',
                        border: '1px solid rgba(244, 63, 94, 0.25)',
                        color: '#fb7185',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
