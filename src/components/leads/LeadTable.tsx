'use client';

import React from 'react';
import { Lead, LeadPriority, LeadStatus } from '@/core/types/lead';
import { StatusBadge, PriorityBadge, OperationBadge } from '../ui/Badge';
import { MessageSquare, Eye, Edit2, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { whatsappService } from '@/integrations/whatsapp/whatsapp.service';

interface LeadTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
  onStatusChange: (id: string, status: LeadStatus) => void;
}

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  onSelectLead,
  onEditLead,
  onDeleteLead,
  onStatusChange,
}) => {
  if (leads.length === 0) {
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
          No se encontraron prospectos con los filtros seleccionados.
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
          Intente ajustar la búsqueda o cree un nuevo prospecto.
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
              Prospecto / Contacto
            </th>
            <th style={{ padding: '0.9rem 1rem', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Requerimiento
            </th>
            <th style={{ padding: '0.9rem 1rem', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Zona
            </th>
            <th style={{ padding: '0.9rem 1rem', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Presupuesto
            </th>
            <th style={{ padding: '0.9rem 1rem', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Prioridad
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
          {leads.map((lead) => {
            const formattedBudget = new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: lead.currency || 'COP',
              maximumFractionDigits: 0,
            }).format(lead.budget);

            const msg = `Hola ${lead.name}, me pongo en contacto desde Inmobiliaria Premier respecto a tu interés en ${lead.propertyType} en ${lead.zone}.`;
            const waLink = whatsappService.getWhatsAppDirectLink(lead.phone, msg);

            return (
              <tr
                key={lead.id}
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
                onClick={() => onSelectLead(lead)}
              >
                {/* Name & Contact */}
                <td style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                      {lead.name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Phone size={12} /> {lead.phone}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Requirement & Operation */}
                <td style={{ padding: '1rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <OperationBadge operation={lead.operationType} size="sm" />
                    <span style={{ fontSize: '0.86rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                      {lead.propertyType}
                    </span>
                  </div>
                </td>

                {/* Zone */}
                <td style={{ padding: '1rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                    <MapPin size={14} color="var(--text-muted)" />
                    <span>{lead.zone}</span>
                  </div>
                </td>

                {/* Budget */}
                <td style={{ padding: '1rem 1rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '0.9rem' }}>
                    {formattedBudget}
                  </span>
                </td>

                {/* Priority */}
                <td style={{ padding: '1rem 1rem' }}>
                  <PriorityBadge priority={lead.priority} size="sm" />
                </td>

                {/* Status */}
                <td style={{ padding: '1rem 1rem' }}>
                  <StatusBadge status={lead.status} size="sm" />
                </td>

                {/* Actions */}
                <td
                  style={{ padding: '1rem 1.25rem', textAlign: 'right' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Contactar por WhatsApp"
                      style={{
                        padding: '0.35rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(37, 211, 102, 0.12)',
                        color: '#25D366',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#25D366';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(37, 211, 102, 0.12)';
                        e.currentTarget.style.color = '#25D366';
                      }}
                    >
                      <MessageSquare size={15} />
                    </a>

                    <button
                      onClick={() => onSelectLead(lead)}
                      title="Ver detalles"
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
                      onClick={() => onEditLead(lead)}
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
                        if (confirm(`¿Eliminar prospecto "${lead.name}"?`)) {
                          onDeleteLead(lead.id);
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
