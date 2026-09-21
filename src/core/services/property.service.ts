import { Property, PropertyFilters, PropertyPublicView, PropertyStatus } from '../types/property';
import { DEFAULT_ORGANIZATION } from '../types/organization';
import { getAuthHeader } from '../auth/supabase-browser';

export class PropertyService {
  async getProperties(filters?: Partial<PropertyFilters>, organizationId: string = DEFAULT_ORGANIZATION.id): Promise<Property[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.operation && filters.operation !== 'todos') queryParams.set('operation', filters.operation);
      if (filters?.type && filters.type !== 'todos') queryParams.set('type', filters.type);
      if (filters?.status && filters.status !== 'todos') queryParams.set('status', filters.status);
      if (filters?.municipality && filters.municipality !== 'todos') queryParams.set('municipality', filters.municipality);
      if (filters?.zone && filters.zone !== 'todas') queryParams.set('zone', filters.zone);
      if (filters?.search) queryParams.set('search', filters.search);
      if (filters?.minPrice) queryParams.set('minPrice', String(filters.minPrice));
      if (filters?.maxPrice) queryParams.set('maxPrice', String(filters.maxPrice));
      if (organizationId) queryParams.set('organizationId', organizationId);

      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/properties?${queryParams.toString()}`, {
        headers: {
          ...authHeaders,
        },
      });
      const data = await res.json();
      if (data.success) return data.properties;
      return [];
    } catch (e) {
      console.error('Error fetching properties from API:', e);
      return [];
    }
  }

  async getPublicCatalog(filters?: Partial<PropertyFilters>, organizationId: string = DEFAULT_ORGANIZATION.id): Promise<PropertyPublicView[]> {
    try {
      const queryParams = new URLSearchParams({ view: 'public' });
      if (filters?.operation && filters.operation !== 'todos') queryParams.set('operation', filters.operation);
      if (filters?.type && filters.type !== 'todos') queryParams.set('type', filters.type);
      if (filters?.municipality && filters.municipality !== 'todos') queryParams.set('municipality', filters.municipality);
      if (filters?.zone && filters.zone !== 'todas') queryParams.set('zone', filters.zone);
      if (filters?.search) queryParams.set('search', filters.search);
      if (organizationId) queryParams.set('organizationId', organizationId);

      const res = await fetch(`/api/properties?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) return data.properties;
      return [];
    } catch (e) {
      console.error('Error fetching public properties from API:', e);
      return [];
    }
  }

  async getPropertyById(id: string): Promise<Property | null> {
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/properties/${id}`, {
        headers: {
          ...authHeaders,
        },
      });
      const data = await res.json();
      if (data.success) return data.property;
      return null;
    } catch (e) {
      console.error(`Error fetching property ${id} from API:`, e);
      return null;
    }
  }

  async createProperty(
    data: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'organizationId'> & { organizationId?: string }
  ): Promise<Property> {
    if (!data.title?.trim()) throw new Error('El título del inmueble es obligatorio.');
    if (!data.code?.trim()) throw new Error('El código de referencia es obligatorio.');
    if (!data.municipality?.trim()) throw new Error('El municipio es obligatorio.');
    if (!data.zone?.trim()) throw new Error('El barrio o zona es obligatorio.');
    if (!data.priceCOP || data.priceCOP <= 0) throw new Error('El precio debe ser mayor a cero.');
    if (!data.areaM2 || data.areaM2 <= 0) throw new Error('El área debe ser mayor a cero.');

    const payload = {
      ...data,
      organizationId: data.organizationId || DEFAULT_ORGANIZATION.id,
      title: data.title.trim(),
      code: data.code.trim().toUpperCase(),
      description: data.description?.trim() || '',
      internalAddress: data.internalAddress?.trim() || 'Sin dirección interna especificada',
      features: data.features || [],
      images: data.images && data.images.length > 0 ? data.images : [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
      ],
      status: data.status || 'disponible',
      assignedAgent: data.assignedAgent || 'Laura Gómez',
    };

    const authHeaders = await getAuthHeader();
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(payload),
    });
    const resData = await res.json();
    if (!res.ok || !resData.success) {
      throw new Error(resData.error || `Error del servidor (${res.status}): No se pudo guardar el inmueble.`);
    }
    return resData.property;
  }

  async updateProperty(id: string, updates: Partial<Property>): Promise<Property> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`/api/properties/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(updates),
    });
    const resData = await res.json();
    if (!res.ok || !resData.success) {
      throw new Error(resData.error || `Error del servidor (${res.status}): No se pudo actualizar el inmueble.`);
    }
    return resData.property;
  }

  async updateStatus(id: string, status: PropertyStatus): Promise<Property> {
    return this.updateProperty(id, { status });
  }

  async deleteProperty(id: string): Promise<boolean> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`/api/properties/${id}`, {
      method: 'DELETE',
      headers: {
        ...authHeaders,
      },
    });
    const resData = await res.json();
    if (!res.ok || !resData.success) {
      throw new Error(resData.error || `Error del servidor (${res.status}): No se pudo eliminar el inmueble.`);
    }
    return !!resData.success;
  }

  async getInventoryStats(organizationId: string = DEFAULT_ORGANIZATION.id): Promise<{
    totalProperties: number;
    availableCount: number;
    reservedCount: number;
    closedCount: number;
    totalInventoryValueCOP: number;
  }> {
    const all = await this.getProperties({}, organizationId);
    let totalValue = 0;
    let available = 0;
    let reserved = 0;
    let closed = 0;

    for (const p of all) {
      if (p.status === 'disponible') {
        available++;
        totalValue += p.priceCOP;
      } else if (p.status === 'reservado') {
        reserved++;
      } else if (p.status === 'vendido' || p.status === 'arrendado') {
        closed++;
      }
    }

    return {
      totalProperties: all.length,
      availableCount: available,
      reservedCount: reserved,
      closedCount: closed,
      totalInventoryValueCOP: totalValue,
    };
  }

  async matchForAssistant(
    criteria: {
      operation?: 'compra' | 'arriendo';
      propertyType?: string;
      municipality?: string;
      zone?: string;
      maxBudget?: number;
      minBedrooms?: number;
    },
    organizationId: string = DEFAULT_ORGANIZATION.id
  ): Promise<PropertyPublicView[]> {
    const catalog = await this.getPublicCatalog({}, organizationId);

    return catalog.filter((p) => {
      if (criteria.operation && p.operation !== criteria.operation) return false;

      if (criteria.propertyType && criteria.propertyType !== 'todos') {
        if (!p.type.toLowerCase().includes(criteria.propertyType.toLowerCase()) &&
            !criteria.propertyType.toLowerCase().includes(p.type.toLowerCase())) {
          return false;
        }
      }

      if (criteria.municipality && criteria.municipality.trim() !== '') {
        const munMatch = p.municipality.toLowerCase().includes(criteria.municipality.toLowerCase());
        const zoneMatch = p.zone.toLowerCase().includes(criteria.municipality.toLowerCase());
        if (!munMatch && !zoneMatch) return false;
      }

      if (criteria.zone && criteria.zone.trim() !== '') {
        const zoneMatch = p.zone.toLowerCase().includes(criteria.zone.toLowerCase());
        if (!zoneMatch) return false;
      }

      if (criteria.maxBudget && criteria.maxBudget > 0) {
        const budgetLimit = criteria.maxBudget * 1.15;
        if (p.priceCOP > budgetLimit) return false;
      }

      if (criteria.minBedrooms && criteria.minBedrooms > 0) {
        if (p.bedrooms < criteria.minBedrooms) return false;
      }

      return true;
    }).slice(0, 3);
  }

  async resetData(): Promise<void> {
    const authHeaders = await getAuthHeader();
    await fetch('/api/demo/reset', {
      method: 'POST',
      headers: {
        ...authHeaders,
      },
    });
  }
}

export const propertyService = new PropertyService();
