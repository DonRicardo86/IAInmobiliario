'use client';

import React, { useState } from 'react';
import { Lead, LeadPriority, LeadStatus } from '@/core/types/lead';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/core/config/constants';
import { Modal } from '../ui/Modal';
import { StatusBadge, PriorityBadge, OperationBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  Phone,
  Mail,
  MapPin,
  Building,
  DollarSign,
  Calendar,
  MessageSquare,
  Send,
  PlusCircle,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { whatsappService } from '@/integrations/whatsapp/whatsapp.service';

interface LeadDetailModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: LeadStatus) => Promise<void>;
  onUpdatePriority: (id: string, newPriority: LeadPriority) => Promise<void>;
  onAddNote: (id: string, note: string) => Promise<void>;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  isOpen,
  onClose,
  onUpdateStatus,
  onUpdatePriority,
  onAddNote,
  onEdit,
  onDelete,
}) => {
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  if (!lead) return null;

  const formattedBudget = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: lead.currency || 'COP',
    maximumFractionDigits: 0,
  }).format(lead.budget);

  const formattedDate = new Date(lead.createdAt).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      setAddingNote(true);
      await onAddNote(lead.id, newNote.trim());
      setNewNote('');
    } catch (e) {
      console.error(e);
    } finally {
      setAddingNote(false);
    }
  };

  const whatsAppDirectMessage = `Hola ${lead.name}, te saludo de Inmobiliaria Premier. Me pongo en contacto respecto a tu interés en opciones de ${lead.propertyType} para ${lead.operationType} en la zona de ${lead.zone}. ¿Cuándo tendrías 5 minutos para conversar?`;
  const whatsAppLink = whatsappService.getWhatsAppDirectLink(lead.phone, whatsAppDirectMessage);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lead.name}
      subtitle={`Registrado el ${formattedDate}`}
      maxWidth="820px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Top Control Bar: Badges & Quick Action */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <OperationBadge operation={lead.operationType} />
            <StatusBadge status={lead.status} />
            <PriorityBadge priority={lead.priority} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <a
              href={whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: '#25D366',
                color: '#ffffff',
                padding: '0.45rem 0.9rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.84rem',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)',
              }}
            >
              <MessageSquare size={16} />
              <span>Contactar WhatsApp</span>
            </a>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(lead);
              }}
              icon={<Edit2 size={14} />}
            >
              Editar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm(`¿Estás seguro de eliminar el prospecto "${lead.name}"?`)) {
                  onDelete(lead.id);
                  onClose();
                }
              }}
              icon={<Trash2 size={14} />}
            >
              Eliminar
            </Button>
          </div>
        </div>

        {/* Lead Key Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {/* Phone */}
          <div
            style={{
              padding: '0.9rem',
              backgroundColor: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Phone size={13} /> Teléfono
            </span>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem', margin: 0 }}>
              {lead.phone}
            </p>
          </div>

          {/* Email */}
          <div
            style={{
              padding: '0.9rem',
              backgroundColor: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Mail size={13} /> Correo
            </span>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {lead.email}
            </p>
          </div>

          {/* Budget */}
          <div
            style={{
              padding: '0.9rem',
              backgroundColor: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <DollarSign size={13} /> Presupuesto Estimado
            </span>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-emerald)', marginTop: '0.25rem', margin: 0 }}>
              {formattedBudget}
            </p>
          </div>

          {/* Zone & Property */}
          <div
            style={{
              padding: '0.9rem',
              backgroundColor: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MapPin size={13} /> Inmueble y Zona
            </span>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem', margin: 0, textTransform: 'capitalize' }}>
              {lead.propertyType} en {lead.zone}
            </p>
          </div>
        </div>

        {/* Requirements & Observations */}
        {lead.notes && (
          <div
            style={{
              padding: '1.1rem',
              backgroundColor: 'rgba(79, 70, 229, 0.05)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(79, 70, 229, 0.15)',
            }}
          >
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase' }}>
              Observaciones del Requerimiento
            </span>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '0.4rem', lineHeight: 1.5, margin: 0 }}>
              {lead.notes}
            </p>
          </div>
        )}

        {/* Quick Transition Pipeline Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Cambiar Etapa del Embudo
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '0.5rem' }}>
            {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((st) => {
              const cfg = STATUS_CONFIG[st];
              const isCurrent = lead.status === st;

              return (
                <button
                  key={st}
                  onClick={() => onUpdateStatus(lead.id, st)}
                  style={{
                    padding: '0.55rem 0.65rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isCurrent ? cfg.color : 'var(--border-subtle)'}`,
                    backgroundColor: isCurrent ? cfg.bg : 'rgba(255,255,255,0.02)',
                    color: isCurrent ? cfg.color : 'var(--text-secondary)',
                    fontWeight: isCurrent ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    textAlign: 'center',
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Activity Timeline & Follow-up Notes */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} color="var(--secondary)" /> Bitácora de Seguimiento y Actividades
          </h3>

          {/* Add note box */}
          <form onSubmit={handleAddNoteSubmit} style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.25rem' }}>
            <input
              type="text"
              placeholder="Agregar nota de llamada, visita o seguimiento..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              style={{
                flex: 1,
                padding: '0.65rem 1rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={addingNote}
              disabled={!newNote.trim()}
              icon={<Send size={14} />}
            >
              Guardar Nota
            </Button>
          </form>

          {/* Activities list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '220px', overflowY: 'auto' }}>
            {lead.activities && lead.activities.length > 0 ? (
              lead.activities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: act.type === 'status_change' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                      color: act.type === 'status_change' ? '#38bdf8' : '#818cf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle2 size={14} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {act.author || 'Asesor'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(act.createdAt).toLocaleDateString('es-CO', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.2rem', margin: 0 }}>
                      {act.description}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Sin actividades adicionales registradas aún.
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
