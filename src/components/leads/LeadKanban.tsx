'use client';

import React from 'react';
import { Lead, LeadStatus } from '@/core/types/lead';
import { STATUS_CONFIG } from '@/core/config/constants';
import { PriorityBadge, OperationBadge } from '../ui/Badge';
import { MessageSquare, MapPin, DollarSign, ArrowRight, ArrowLeft } from 'lucide-react';
import { whatsappService } from '@/integrations/whatsapp/whatsapp.service';

interface LeadKanbanProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onStatusChange: (id: string, newStatus: LeadStatus) => void;
}

const KANBAN_STATUSES: LeadStatus[] = [
  'nuevo',
  'contactado',
  'interesado',
  'negociacion',
  'cerrado',
  'no_interesado',
];

export const LeadKanban: React.FC<LeadKanbanProps> = ({
  leads,
  onSelectLead,
  onStatusChange,
}) => {
  const getNextStatus = (current: LeadStatus): LeadStatus | null => {
    const idx = KANBAN_STATUSES.indexOf(current);
    if (idx < KANBAN_STATUSES.length - 2) return KANBAN_STATUSES[idx + 1];
    if (current === 'negociacion') return 'cerrado';
    return null;
  };

  const getPrevStatus = (current: LeadStatus): LeadStatus | null => {
    const idx = KANBAN_STATUSES.indexOf(current);
    if (idx > 0 && current !== 'no_interesado') return KANBAN_STATUSES[idx - 1];
    return null;
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, minmax(280px, 1fr))',
        gap: '1rem',
        overflowX: 'auto',
        paddingBottom: '1.5rem',
        minHeight: '600px',
      }}
    >
      {KANBAN_STATUSES.map((statusKey) => {
        const config = STATUS_CONFIG[statusKey];
        const columnLeads = leads.filter((l) => l.status === statusKey);
        const columnValue = columnLeads.reduce((acc, l) => acc + (l.budget || 0), 0);
        const formattedTotal = new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          maximumFractionDigits: 0,
        }).format(columnValue);

        return (
          <div
            key={statusKey}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(10px)',
              borderRadius: 'var(--radius-lg)',
              border: `1px solid ${config.border}`,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '780px',
            }}
          >
            {/* Column Header */}
            <div
              style={{
                padding: '1rem',
                borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: config.bg,
                borderTopLeftRadius: 'var(--radius-lg)',
                borderTopRightRadius: 'var(--radius-lg)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: config.color, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: config.color }} />
                  {config.label}
                </span>
                <span
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#ffffff',
                  }}
                >
                  {columnLeads.length}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Volumen: <strong style={{ color: 'var(--text-secondary)' }}>{formattedTotal}</strong>
              </div>
            </div>

            {/* Cards List */}
            <div
              style={{
                padding: '0.75rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                flex: 1,
              }}
            >
              {columnLeads.length === 0 ? (
                <div
                  style={{
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                  }}
                >
                  Sin prospectos en esta etapa
                </div>
              ) : (
                columnLeads.map((lead) => {
                  const formattedBudget = new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: lead.currency || 'COP',
                    maximumFractionDigits: 0,
                  }).format(lead.budget);

                  const nextSt = getNextStatus(lead.status);
                  const prevSt = getPrevStatus(lead.status);

                  const waMsg = `Hola ${lead.name}, te contacto desde Inmobiliaria Premier acerca de tu consulta de ${lead.propertyType}.`;
                  const waLink = whatsappService.getWhatsAppDirectLink(lead.phone, waMsg);

                  return (
                    <div
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-card)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.9rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.6rem',
                        cursor: 'pointer',
                        transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.borderColor = 'var(--primary-light)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'var(--border-card)';
                      }}
                    >
                      {/* Card Top: Operation & Priority */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <OperationBadge operation={lead.operationType} size="sm" />
                        <PriorityBadge priority={lead.priority} size="sm" />
                      </div>

                      {/* Lead Name */}
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                        {lead.name}
                      </h4>

                      {/* Details: Zone and Budget */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', textTransform: 'capitalize' }}>
                          <MapPin size={12} color="var(--text-muted)" />
                          {lead.propertyType} • {lead.zone}
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <DollarSign size={12} />
                          {formattedBudget}
                        </span>
                      </div>

                      {/* Card Footer: Quick Actions & Stage Movers */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '0.5rem',
                          borderTop: '1px solid var(--border-subtle)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="WhatsApp rápido"
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'rgba(37, 211, 102, 0.12)',
                            color: '#25D366',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            textDecoration: 'none',
                          }}
                        >
                          <MessageSquare size={12} /> WhatsApp
                        </a>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          {prevSt && (
                            <button
                              onClick={() => onStatusChange(lead.id, prevSt)}
                              title={`Mover a ${STATUS_CONFIG[prevSt].label}`}
                              style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-muted)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.2rem 0.35rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <ArrowLeft size={13} />
                            </button>
                          )}
                          {nextSt && (
                            <button
                              onClick={() => onStatusChange(lead.id, nextSt)}
                              title={`Avanzar a ${STATUS_CONFIG[nextSt].label}`}
                              style={{
                                background: 'rgba(79, 70, 229, 0.15)',
                                border: '1px solid rgba(79, 70, 229, 0.3)',
                                color: 'var(--primary-light)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.2rem 0.35rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <ArrowRight size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
