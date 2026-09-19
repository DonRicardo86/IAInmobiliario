'use client';

import React from 'react';
import { Lead } from '@/core/types/lead';
import { PriorityBadge, OperationBadge, StatusBadge } from '../ui/Badge';
import { MessageSquare, ArrowRight, Flame, MapPin, DollarSign, Eye } from 'lucide-react';
import { whatsappService } from '@/integrations/whatsapp/whatsapp.service';
import Link from 'next/link';

interface HighPriorityLeadsProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export const HighPriorityLeads: React.FC<HighPriorityLeadsProps> = ({ leads, onSelectLead }) => {
  const hotLeads = leads
    .filter((l) => l.priority === 'alto' && l.status !== 'cerrado' && l.status !== 'no_interesado')
    .slice(0, 5);

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Flame size={20} color="#f43f5e" />
          <h3 style={{ fontSize: '1.05rem', margin: 0 }}>
            Prospectos Calientes (Atención Inmediata)
          </h3>
        </div>
        <Link
          href="/leads"
          style={{
            fontSize: '0.82rem',
            color: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontWeight: 600,
          }}
        >
          <span>Ver todos</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {hotLeads.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>
          No hay prospectos de alta prioridad pendientes en este momento.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {hotLeads.map((lead) => {
            const formattedBudget = new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: lead.currency || 'COP',
              maximumFractionDigits: 0,
            }).format(lead.budget);

            const msg = `Hola ${lead.name}, te contacto con prioridad de Inmobiliaria Premier respecto a tu requerimiento de ${lead.propertyType} en ${lead.zone}.`;
            const waLink = whatsappService.getWhatsAppDirectLink(lead.phone, msg);

            return (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                  e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              >
                {/* Left info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: '220px' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', display: 'block' }}>
                      {lead.name}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', textTransform: 'capitalize' }}>
                      <MapPin size={12} />
                      {lead.propertyType} • {lead.zone}
                    </span>
                  </div>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <OperationBadge operation={lead.operationType} size="sm" />
                  <StatusBadge status={lead.status} size="sm" />
                  <span style={{ fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '0.86rem' }}>
                    {formattedBudget}
                  </span>
                </div>

                {/* Quick actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={(e) => e.stopPropagation()}>
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="WhatsApp"
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(37, 211, 102, 0.12)',
                      color: '#25D366',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      textDecoration: 'none',
                    }}
                  >
                    <MessageSquare size={13} />
                    <span>WhatsApp</span>
                  </a>
                  <button
                    onClick={() => onSelectLead(lead)}
                    title="Ver ficha"
                    style={{
                      padding: '0.35rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
