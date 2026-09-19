export type OperationType = 'compra' | 'arriendo';

export type PropertyType =
  | 'apartamento'
  | 'casa'
  | 'penthouse'
  | 'oficina'
  | 'local'
  | 'lote'
  | 'bodega'
  | 'finca'
  | 'otro';

export type PropertyStatus = 'disponible' | 'reservado' | 'vendido' | 'arrendado';

export interface CreatePropertyInput {
  organizationId?: string;
  code: string;
  title: string;
  description?: string;
  type: PropertyType;
  operation: OperationType;
  municipality: string;
  zone: string;
  internalAddress?: string;
  priceCOP: number;
  adminFeeCOP?: number;
  areaM2: number;
  bedrooms: number;
  bathrooms: number;
  parkingSpots?: number;
  stratum?: number;
  features?: string[];
  images?: string[];
  status?: PropertyStatus;
  assignedAgent?: string;
  featured?: boolean;
}

export interface Property {
  id: string;
  organizationId: string;
  code: string; // e.g. "INM-001"
  title: string;
  description: string;
  type: PropertyType;
  operation: OperationType;
  municipality: string; // e.g. "Medellín", "Bogotá", "Envigado"
  zone: string; // e.g. "El Poblado", "Chapinero", "Laureles"
  internalAddress: string; // Private internal address for CRM only
  priceCOP: number;
  adminFeeCOP?: number;
  areaM2: number;
  bedrooms: number;
  bathrooms: number;
  parkingSpots: number;
  stratum?: number; // Estrato 1-6
  features: string[]; // e.g. ["Piscina", "Gimnasio", "Balcón", "Ascensor", "Seguridad 24/7", "Vista panorámica"]
  images: string[];
  status: PropertyStatus;
  assignedAgent: string;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyPublicView {
  id: string;
  code: string;
  title: string;
  description: string;
  type: PropertyType;
  operation: OperationType;
  municipality: string;
  zone: string;
  priceCOP: number;
  adminFeeCOP?: number;
  areaM2: number;
  bedrooms: number;
  bathrooms: number;
  parkingSpots: number;
  stratum?: number;
  features: string[];
  images: string[];
  status: PropertyStatus;
  featured?: boolean;
}

export interface PropertyFilters {
  search?: string;
  operation?: OperationType | 'todos';
  type?: PropertyType | 'todos';
  municipality?: string;
  zone?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  minArea?: number;
  status?: PropertyStatus | 'todos';
  features?: string[];
  sortBy?: 'price_asc' | 'price_desc' | 'date_desc' | 'area_desc';
}
