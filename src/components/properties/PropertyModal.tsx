'use client';

import React, { useState, useEffect } from 'react';
import { Property, PropertyStatus, PropertyType, OperationType } from '@/core/types/property';
import { PROPERTY_TYPES, COLOMBIAN_CITIES, AVAILABLE_FEATURES, PROPERTY_STATUS_CONFIG } from '@/core/config/constants';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Building, DollarSign, MapPin, Hash, Layers, Image as ImageIcon, ShieldAlert, Sparkles, Check } from 'lucide-react';

interface PropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (propertyData: any) => Promise<void>;
  initialProperty?: Property | null;
  mode?: 'create' | 'edit';
}

export const PropertyModal: React.FC<PropertyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialProperty,
  mode = 'create',
}) => {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PropertyType>('apartamento');
  const [operation, setOperation] = useState<OperationType>('compra');
  const [municipality, setMunicipality] = useState('Medellín');
  const [zone, setZone] = useState('');
  const [internalAddress, setInternalAddress] = useState('');
  const [priceCOP, setPriceCOP] = useState<string>('');
  const [adminFeeCOP, setAdminFeeCOP] = useState<string>('');
  const [areaM2, setAreaM2] = useState<string>('');
  const [bedrooms, setBedrooms] = useState<string>('3');
  const [bathrooms, setBathrooms] = useState<string>('2');
  const [parkingSpots, setParkingSpots] = useState<string>('1');
  const [stratum, setStratum] = useState<string>('5');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<PropertyStatus>('disponible');
  const [assignedAgent, setAssignedAgent] = useState('Laura Gómez');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialProperty && mode === 'edit') {
      setCode(initialProperty.code);
      setTitle(initialProperty.title);
      setDescription(initialProperty.description);
      setType(initialProperty.type);
      setOperation(initialProperty.operation);
      setMunicipality(initialProperty.municipality);
      setZone(initialProperty.zone);
      setInternalAddress(initialProperty.internalAddress || '');
      setPriceCOP(initialProperty.priceCOP.toString());
      setAdminFeeCOP(initialProperty.adminFeeCOP ? initialProperty.adminFeeCOP.toString() : '');
      setAreaM2(initialProperty.areaM2.toString());
      setBedrooms(initialProperty.bedrooms.toString());
      setBathrooms(initialProperty.bathrooms.toString());
      setParkingSpots(initialProperty.parkingSpots.toString());
      setStratum(initialProperty.stratum ? initialProperty.stratum.toString() : '5');
      setSelectedFeatures(initialProperty.features || []);
      setImageUrl(initialProperty.images[0] || '');
      setStatus(initialProperty.status);
      setAssignedAgent(initialProperty.assignedAgent || 'Laura Gómez');
    } else {
      // Auto-generate code preset for new property
      const randomNum = Math.floor(100 + Math.random() * 900);
      setCode(`INM-${randomNum}`);
      setTitle('');
      setDescription('');
      setType('apartamento');
      setOperation('compra');
      setMunicipality('Medellín');
      setZone('');
      setInternalAddress('');
      setPriceCOP('');
      setAdminFeeCOP('');
      setAreaM2('');
      setBedrooms('3');
      setBathrooms('2');
      setParkingSpots('1');
      setStratum('5');
      setSelectedFeatures(['Balcón Panorámico', 'Seguridad 24/7']);
      setImageUrl('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80');
      setStatus('disponible');
      setAssignedAgent('Laura Gómez');
    }
    setErrors({});
  }, [initialProperty, mode, isOpen]);

  const toggleFeature = (feat: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    );
  };

  const validate = () => {
    const err: Record<string, string> = {};
    if (!code.trim()) err.code = 'El código es obligatorio (ej. APT-101).';
    if (!title.trim()) err.title = 'El título del inmueble es obligatorio.';
    if (!zone.trim()) err.zone = 'El barrio o zona es obligatorio.';
    if (!priceCOP || Number(priceCOP) <= 0) err.priceCOP = 'Ingrese un precio válido en COP.';
    if (!areaM2 || Number(areaM2) <= 0) err.areaM2 = 'Ingrese el área en m2.';
    if (!internalAddress.trim()) err.internalAddress = 'La dirección interna (privada CRM) es obligatoria.';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      await onSubmit({
        code: code.trim().toUpperCase(),
        title: title.trim(),
        description: description.trim(),
        type,
        operation,
        municipality,
        zone: zone.trim(),
        internalAddress: internalAddress.trim(),
        priceCOP: Number(priceCOP),
        adminFeeCOP: adminFeeCOP ? Number(adminFeeCOP) : 0,
        areaM2: Number(areaM2),
        bedrooms: Number(bedrooms) || 0,
        bathrooms: Number(bathrooms) || 0,
        parkingSpots: Number(parkingSpots) || 0,
        stratum: Number(stratum) || 4,
        features: selectedFeatures,
        images: imageUrl ? [imageUrl] : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'],
        status,
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
      title={mode === 'create' ? 'Registrar Nuevo Inmueble' : `Editar Inmueble ${code}`}
      subtitle="Ingrese los datos del inventario para comercialización y control privado del CRM."
      maxWidth="840px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Section 1: Basic Identity */}
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            1. Identificación y Ubicación
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginTop: '0.6rem' }}>
            <Input
              label="Código Interno"
              placeholder="Ej. APT-101"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              error={errors.code}
              icon={<Hash size={16} />}
              required
            />
            <Input
              label="Título Comercial"
              placeholder="Ej. Apartamento Moderno en Castropol con Vista"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={errors.title}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
            <Select
              label="Tipo de Inmueble"
              value={type}
              onChange={(e) => setType(e.target.value as PropertyType)}
              options={PROPERTY_TYPES}
              required
            />
            <Select
              label="Tipo de Operación"
              value={operation}
              onChange={(e) => setOperation(e.target.value as OperationType)}
              options={[
                { value: 'compra', label: 'Venta / Compra' },
                { value: 'arriendo', label: 'Arrendamiento' },
              ]}
              required
            />
            <Select
              label="Municipio / Ciudad"
              value={municipality}
              onChange={(e) => setMunicipality(e.target.value)}
              options={COLOMBIAN_CITIES.map((c) => ({ value: c, label: c }))}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginTop: '0.75rem' }}>
            <Input
              label="Barrio o Sector"
              placeholder="Ej. El Poblado, Laureles, Chapinero"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              error={errors.zone}
              icon={<MapPin size={16} />}
              required
            />
            <div>
              <Input
                label="Dirección Interna y Datos del Propietario (Privado CRM)"
                placeholder="Ej. Cra 32 # 10-45, Torre 1 Apto 1402 (Propietario: Dr. Valencia - Cel 3105559988)"
                value={internalAddress}
                onChange={(e) => setInternalAddress(e.target.value)}
                error={errors.internalAddress}
                icon={<ShieldAlert size={16} color="var(--accent-amber)" />}
                required
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                🔒 Este dato es confidencial y nunca se muestra en el catálogo público ni al Asistente IA.
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Pricing and Dimensions */}
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            2. Valores Económicos y Dimensiones
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginTop: '0.6rem' }}>
            <div>
              <Input
                label={`Precio COP (${operation === 'compra' ? 'Venta' : 'Canon'})`}
                type="number"
                placeholder={operation === 'compra' ? '980000000' : '3500000'}
                value={priceCOP}
                onChange={(e) => setPriceCOP(e.target.value)}
                error={errors.priceCOP}
                icon={<DollarSign size={16} />}
                required
              />
              {Number(priceCOP) > 0 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', marginTop: '0.2rem', display: 'block' }}>
                  ≈ {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(priceCOP))}
                </span>
              )}
            </div>

            <Input
              label="Administración COP"
              type="number"
              placeholder="650000"
              value={adminFeeCOP}
              onChange={(e) => setAdminFeeCOP(e.target.value)}
            />

            <Input
              label="Área (m²)"
              type="number"
              placeholder="120"
              value={areaM2}
              onChange={(e) => setAreaM2(e.target.value)}
              error={errors.areaM2}
              required
            />

            <Input
              label="Habitaciones"
              type="number"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
            />

            <Input
              label="Baños"
              type="number"
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
            />

            <Input
              label="Parqueaderos"
              type="number"
              value={parkingSpots}
              onChange={(e) => setParkingSpots(e.target.value)}
            />

            <Select
              label="Estrato"
              value={stratum}
              onChange={(e) => setStratum(e.target.value)}
              options={[
                { value: '1', label: 'Estrato 1' },
                { value: '2', label: 'Estrato 2' },
                { value: '3', label: 'Estrato 3' },
                { value: '4', label: 'Estrato 4' },
                { value: '5', label: 'Estrato 5' },
                { value: '6', label: 'Estrato 6' },
              ]}
            />
          </div>
        </div>

        {/* Section 3: Features & Amenities Selector */}
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            3. Características y Amenidades
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.6rem' }}>
            {AVAILABLE_FEATURES.map((feat) => {
              const isSelected = selectedFeatures.includes(feat);
              return (
                <button
                  key={feat}
                  type="button"
                  onClick={() => toggleFeature(feat)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    border: `1px solid ${isSelected ? 'var(--secondary)' : 'var(--border-subtle)'}`,
                    backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    color: isSelected ? '#38bdf8' : 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {isSelected && <Check size={12} />}
                  <span>{feat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Description, Image URL & Status */}
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            4. Descripción, Fotografía y Disponibilidad
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.6rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                Descripción Comercial
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalla iluminación, acabados, vistas, cercanía a vías principales, amenidades..."
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Input
                label="URL de Fotografía Principal"
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                icon={<ImageIcon size={16} />}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Select
                  label="Estado de Disponibilidad"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PropertyStatus)}
                  options={[
                    { value: 'disponible', label: 'Disponible' },
                    { value: 'reservado', label: 'Reservado' },
                    { value: 'vendido', label: 'Vendido' },
                    { value: 'arrendado', label: 'Arrendado' },
                  ]}
                  required
                />
                <Select
                  label="Asesor Responsable"
                  value={assignedAgent}
                  onChange={(e) => setAssignedAgent(e.target.value)}
                  options={[
                    { value: 'Laura Gómez', label: 'Laura Gómez' },
                    { value: 'David Ramírez', label: 'David Ramírez' },
                  ]}
                />
              </div>
            </div>
          </div>
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
            {mode === 'create' ? 'Registrar Inmueble' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
