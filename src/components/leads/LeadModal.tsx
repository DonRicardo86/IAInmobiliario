'use client';

import React, { useState, useEffect } from 'react';
import { Lead, LeadPriority, LeadStatus, OperationType, PropertyType } from '@/core/types/lead';
import { PROPERTY_TYPES, POPULAR_ZONES, STATUS_CONFIG, PRIORITY_CONFIG } from '@/core/config/constants';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { User, Phone, Mail, DollarSign, MapPin, Building, FileText, Sparkles } from 'lucide-react';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (leadData: any) => Promise<void>;
  initialLead?: Lead | null;
  mode?: 'create' | 'edit';
}

export const LeadModal: React.FC<LeadModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialLead,
  mode = 'create',
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [operationType, setOperationType] = useState<OperationType>('compra');
  const [propertyType, setPropertyType] = useState<PropertyType>('apartamento');
  const [zone, setZone] = useState('');
  const [budget, setBudget] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<LeadStatus>('nuevo');
  const [priority, setPriority] = useState<LeadPriority>('medio');
  const [municipality, setMunicipality] = useState('Medellín');
  const [minBudget, setMinBudget] = useState<string>('');
  const [maxBudget, setMaxBudget] = useState<string>('');
  const [assignedAgent, setAssignedAgent] = useState('Laura Gómez');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialLead && mode === 'edit') {
      setName(initialLead.name);
      setPhone(initialLead.phone);
      setEmail(initialLead.email);
      setOperationType(initialLead.operationType);
      setPropertyType(initialLead.propertyType);
      setMunicipality(initialLead.municipality || 'Medellín');
      setZone(initialLead.zone);
      setBudget(initialLead.budget ? initialLead.budget.toString() : '');
      setMinBudget(initialLead.minBudget ? initialLead.minBudget.toString() : '');
      setMaxBudget(initialLead.maxBudget ? initialLead.maxBudget.toString() : '');
      setNotes(initialLead.notes || '');
      setStatus(initialLead.status);
      setPriority(initialLead.priority);
      setAssignedAgent(initialLead.assignedAgent || 'Laura Gómez');
    } else {
      // Reset form
      setName('');
      setPhone('');
      setEmail('');
      setOperationType('compra');
      setPropertyType('apartamento');
      setMunicipality('Medellín');
      setZone('');
      setBudget('');
      setMinBudget('');
      setMaxBudget('');
      setNotes('');
      setStatus('nuevo');
      setPriority('medio');
      setAssignedAgent('Laura Gómez');
    }
    setErrors({});
  }, [initialLead, mode, isOpen]);

  // Dynamic automatic priority suggestion based on budget and urgency in notes
  const getSuggestedPriority = (): LeadPriority => {
    const numBudget = Number(budget) || Number(maxBudget) || 0;
    const notesLower = notes.toLowerCase();
    const hasUrgency = notesLower.includes('urgente') || notesLower.includes('inmediato') || notesLower.includes('preaprobado');

    if (operationType === 'compra' && numBudget >= 800000000) return 'alto';
    if (operationType === 'arriendo' && numBudget >= 5000000) return 'alto';
    if (hasUrgency) return 'alto';

    if (operationType === 'compra' && numBudget >= 300000000) return 'medio';
    if (operationType === 'arriendo' && numBudget >= 2000000) return 'medio';

    return 'bajo';
  };

  const validate = () => {
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = 'El nombre del prospecto es obligatorio.';
    if (!phone.trim()) err.phone = 'El teléfono de contacto es obligatorio.';
    if (!email.trim()) {
      err.email = 'El correo electrónico es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      err.email = 'Ingrese un correo electrónico válido.';
    }
    if (!zone.trim()) err.zone = 'La zona o sector es obligatoria.';
    if (!budget || Number(budget) <= 0) err.budget = 'Ingrese un presupuesto estimado válido.';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      await onSubmit({
        name,
        phone,
        email,
        operationType,
        propertyType,
        municipality,
        zone,
        budget: Number(budget),
        minBudget: minBudget ? Number(minBudget) : undefined,
        maxBudget: maxBudget ? Number(maxBudget) : undefined,
        currency: 'COP',
        notes,
        status,
        priority,
        assignedAgent,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Registrar Nuevo Prospecto' : 'Editar Prospecto'}
      subtitle="Complete los datos comerciales y de requerimiento del cliente."
      maxWidth="720px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Section 1: Contact Info */}
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            1. Datos de Contacto
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.6rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <Input
                label="Nombre Completo"
                placeholder="Ej. Juan Manuel Pérez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                icon={<User size={16} />}
                required
              />
            </div>
            <Input
              label="Teléfono / WhatsApp"
              placeholder="+57 300 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={errors.phone}
              icon={<Phone size={16} />}
              required
            />
            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="juan.perez@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              icon={<Mail size={16} />}
              required
            />
          </div>
        </div>

        {/* Section 2: Property Requirements */}
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            2. Requerimiento Inmobiliario
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.6rem' }}>
            <Select
              label="Tipo de Operación"
              value={operationType}
              onChange={(e) => setOperationType(e.target.value as OperationType)}
              options={[
                { value: 'compra', label: 'Compra de Inmueble' },
                { value: 'arriendo', label: 'Arrendamiento' },
              ]}
              required
            />
            <Select
              label="Tipo de Inmueble"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value as PropertyType)}
              options={PROPERTY_TYPES}
              required
            />
            <div>
              <Input
                label="Zona / Sector Preferido"
                placeholder="Ej. El Poblado, Laureles, Chapinero"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                error={errors.zone}
                icon={<MapPin size={16} />}
                required
              />
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                {POPULAR_ZONES.slice(0, 4).map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setZone(z)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.15rem 0.45rem',
                      fontSize: '0.72rem',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    + {z}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Input
                label={`Presupuesto Estimado (${operationType === 'compra' ? 'Precio Total COP' : 'Canon Mensual COP'})`}
                type="number"
                placeholder={operationType === 'compra' ? '850000000' : '4500000'}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                error={errors.budget}
                icon={<DollarSign size={16} />}
                required
              />
              {Number(budget) > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: '0.2rem', display: 'block' }}>
                  ≈ {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(budget))}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Status & Priority Classification */}
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            3. Clasificación Comercial & Estado
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.6rem' }}>
            <Select
              label="Estado del Prospecto"
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              options={Object.entries(STATUS_CONFIG).map(([key, item]) => ({
                value: key,
                label: item.label,
              }))}
              required
            />
            <div>
              <Select
                label="Clasificación / Prioridad"
                value={priority}
                onChange={(e) => setPriority(e.target.value as LeadPriority)}
                options={[
                  { value: 'alto', label: '🔥 Alto (Prioridad Caliente)' },
                  { value: 'medio', label: '⚡ Medio (Prioridad Tibia)' },
                  { value: 'bajo', label: '❄️ Bajo (Prioridad Fría)' },
                ]}
                required
              />
              <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                <Sparkles size={12} color="var(--primary-light)" />
                <span>Sugerido por regla: </span>
                <button
                  type="button"
                  onClick={() => setPriority(getSuggestedPriority())}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--secondary)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Aplicar {getSuggestedPriority().toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Notes */}
        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
            Observaciones y Detalles del Requerimiento
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Especificaciones adicionales: número de alcobas, amenidades, si requiere parqueadero, urgencia de compra o arriendo..."
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Modal Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            {mode === 'create' ? 'Crear Prospecto' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
