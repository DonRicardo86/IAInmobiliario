import { LeadPriority, LeadStatus } from '../types/lead';
import { OperationType, PropertyStatus, PropertyType } from '../types/property';

export const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; color: string; bg: string; border: string; description: string }
> = {
  nuevo: {
    label: 'Nuevo',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.25)',
    description: 'Prospecto recién captado sin contacto previo.',
  },
  contactado: {
    label: 'Contactado',
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.12)',
    border: 'rgba(167, 139, 250, 0.25)',
    description: 'Se realizó el primer acercamiento telefónico o por mensaje.',
  },
  interesado: {
    label: 'Interesado',
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.12)',
    border: 'rgba(251, 191, 36, 0.25)',
    description: 'El cliente confirmó interés en propiedades de la inmobiliaria.',
  },
  visita_agendada: {
    label: 'Visita Agendada',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.18)',
    border: 'rgba(56, 189, 248, 0.4)',
    description: 'Tiene cita confirmada para conocer inmuebles con un asesor.',
  },
  negociacion: {
    label: 'Negociación',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.12)',
    border: 'rgba(249, 115, 22, 0.25)',
    description: 'En proceso de oferta, documentación o estudio de póliza/crédito.',
  },
  cerrado: {
    label: 'Cerrado',
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.12)',
    border: 'rgba(52, 211, 153, 0.25)',
    description: 'Negocio formalizado exitosamente.',
  },
  no_interesado: {
    label: 'No Interesado',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.25)',
    description: 'Descartado o sin intención de continuar.',
  },
};

export const PROPERTY_STATUS_CONFIG: Record<
  PropertyStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  disponible: {
    label: 'Disponible',
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.12)',
    border: 'rgba(52, 211, 153, 0.3)',
  },
  reservado: {
    label: 'Reservado',
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.12)',
    border: 'rgba(251, 191, 36, 0.3)',
  },
  vendido: {
    label: 'Vendido',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.3)',
  },
  arrendado: {
    label: 'Arrendado',
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.12)',
    border: 'rgba(167, 139, 250, 0.3)',
  },
};

export const PRIORITY_CONFIG: Record<
  LeadPriority,
  { label: string; color: string; bg: string; border: string; iconLabel: string }
> = {
  alto: {
    label: 'Alto (Caliente)',
    color: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.12)',
    border: 'rgba(244, 63, 94, 0.3)',
    iconLabel: '🔥',
  },
  medio: {
    label: 'Medio (Tibio)',
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.12)',
    border: 'rgba(234, 179, 8, 0.3)',
    iconLabel: '⚡',
  },
  bajo: {
    label: 'Bajo (Frío)',
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.12)',
    border: 'rgba(100, 116, 139, 0.3)',
    iconLabel: '❄️',
  },
};

export const OPERATION_CONFIG: Record<
  OperationType,
  { label: string; color: string; bg: string }
> = {
  compra: {
    label: 'Compra',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
  },
  arriendo: {
    label: 'Arriendo',
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.12)',
  },
};

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'casa', label: 'Casa' },
  { value: 'penthouse', label: 'Penthouse' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'local', label: 'Local Comercial' },
  { value: 'lote', label: 'Lote / Terreno' },
  { value: 'bodega', label: 'Bodega' },
  { value: 'finca', label: 'Finca Campestre' },
  { value: 'otro', label: 'Otro' },
];

export const COLOMBIAN_CITIES = [
  'Medellín',
  'Bogotá',
  'Envigado',
  'Sabaneta',
  'Itagüí',
  'Rionegro',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Bucaramanga',
  'Pereira',
  'Manizales',
];

export const POPULAR_ZONES = [
  'El Poblado',
  'Laureles',
  'Envigado',
  'Sabaneta',
  'Loma de las Brujas',
  'Belen',
  'Chapinero',
  'Rosales',
  'Usaquén',
  'Chicó',
  'Cabrera',
  'Cedritos',
  'Castillogrande',
  'Pance',
];

export const AVAILABLE_FEATURES = [
  'Piscina Climatizada',
  'Gimnasio Dotado',
  'Balcón Panorámico',
  'Ascensor Privado',
  'Seguridad 24/7',
  'Parqueadero Visitantes',
  'Zona BBQ',
  'Jardín Privado',
  'Jacuzzi',
  'Turco/Sauna',
  'Cancha Múltiple',
  'Coworking',
  'Pet Friendly',
  'Aire Acondicionado',
  'Planta Eléctrica',
  'Amoblado',
];
