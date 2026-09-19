import { Property, PropertyFilters, PropertyPublicView } from '../types/property';
import { IPropertyRepository } from './property.repository.interface';
import { INITIAL_PROPERTIES } from './mock-properties';
import { DEFAULT_ORGANIZATION } from '../types/organization';

const PROPERTIES_STORAGE_KEY = 'ia_inmobiliaria_properties_v1';

export class LocalStoragePropertyRepository implements IPropertyRepository {
  private memoryCache: Property[] | null = null;

  private getStorageData(): Property[] {
    if (typeof window === 'undefined') {
      return this.memoryCache || INITIAL_PROPERTIES;
    }

    try {
      const data = localStorage.getItem(PROPERTIES_STORAGE_KEY);
      if (!data) {
        localStorage.setItem(PROPERTIES_STORAGE_KEY, JSON.stringify(INITIAL_PROPERTIES));
        this.memoryCache = INITIAL_PROPERTIES;
        return INITIAL_PROPERTIES;
      }
      const parsed = JSON.parse(data);
      this.memoryCache = parsed;
      return parsed;
    } catch (e) {
      console.error('Error reading localStorage properties', e);
      return this.memoryCache || INITIAL_PROPERTIES;
    }
  }

  private saveStorageData(properties: Property[]): void {
    this.memoryCache = properties;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PROPERTIES_STORAGE_KEY, JSON.stringify(properties));
      } catch (e) {
        console.error('Error saving properties to localStorage', e);
      }
    }
  }

  async getAll(filters?: Partial<PropertyFilters>, organizationId: string = DEFAULT_ORGANIZATION.id): Promise<Property[]> {
    let list = this.getStorageData().filter((p) => !organizationId || p.organizationId === organizationId);

    if (!filters) return list;

    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.zone.toLowerCase().includes(q) ||
          p.municipality.toLowerCase().includes(q) ||
          p.features.some((f) => f.toLowerCase().includes(q))
      );
    }

    if (filters.operation && filters.operation !== 'todos') {
      list = list.filter((p) => p.operation === filters.operation);
    }

    if (filters.type && filters.type !== 'todos') {
      list = list.filter((p) => p.type === filters.type);
    }

    if (filters.municipality && filters.municipality.trim() !== '' && filters.municipality !== 'todos') {
      list = list.filter((p) =>
        p.municipality.toLowerCase().includes(filters.municipality!.toLowerCase().trim())
      );
    }

    if (filters.zone && filters.zone.trim() !== '' && filters.zone !== 'todas') {
      list = list.filter((p) =>
        p.zone.toLowerCase().includes(filters.zone!.toLowerCase().trim())
      );
    }

    if (filters.minPrice !== undefined && filters.minPrice > 0) {
      list = list.filter((p) => p.priceCOP >= filters.minPrice!);
    }

    if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
      list = list.filter((p) => p.priceCOP <= filters.maxPrice!);
    }

    if (filters.minBedrooms !== undefined && filters.minBedrooms > 0) {
      list = list.filter((p) => p.bedrooms >= filters.minBedrooms!);
    }

    if (filters.minBathrooms !== undefined && filters.minBathrooms > 0) {
      list = list.filter((p) => p.bathrooms >= filters.minBathrooms!);
    }

    if (filters.minArea !== undefined && filters.minArea > 0) {
      list = list.filter((p) => p.areaM2 >= filters.minArea!);
    }

    if (filters.status && filters.status !== 'todos') {
      list = list.filter((p) => p.status === filters.status);
    }

    const sortBy = filters.sortBy || 'date_desc';
    list.sort((a, b) => {
      if (sortBy === 'price_asc') return a.priceCOP - b.priceCOP;
      if (sortBy === 'price_desc') return b.priceCOP - a.priceCOP;
      if (sortBy === 'area_desc') return b.areaM2 - a.areaM2;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }

  async getPublicCatalog(filters?: Partial<PropertyFilters>, organizationId: string = DEFAULT_ORGANIZATION.id): Promise<PropertyPublicView[]> {
    const rawProperties = await this.getAll(
      { ...filters, status: 'disponible' },
      organizationId
    );

    // Sanitize: hide internalAddress and assignedAgent private contact
    return rawProperties.map((p) => ({
      id: p.id,
      code: p.code,
      title: p.title,
      description: p.description,
      type: p.type,
      operation: p.operation,
      municipality: p.municipality,
      zone: p.zone,
      priceCOP: p.priceCOP,
      adminFeeCOP: p.adminFeeCOP,
      areaM2: p.areaM2,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      parkingSpots: p.parkingSpots,
      stratum: p.stratum,
      features: p.features,
      images: p.images,
      status: p.status,
      featured: p.featured,
    }));
  }

  async getById(id: string): Promise<Property | null> {
    const list = this.getStorageData();
    const found = list.find((p) => p.id === id);
    return found ? { ...found } : null;
  }

  async getByCode(code: string, organizationId: string = DEFAULT_ORGANIZATION.id): Promise<Property | null> {
    const list = this.getStorageData();
    const found = list.find(
      (p) => p.code.toLowerCase() === code.toLowerCase().trim() && p.organizationId === organizationId
    );
    return found ? { ...found } : null;
  }

  async create(propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Promise<Property> {
    const list = this.getStorageData();
    const now = new Date().toISOString();
    const newId = `prop-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newProperty: Property = {
      ...propertyData,
      id: newId,
      createdAt: now,
      updatedAt: now,
    };

    const updatedList = [newProperty, ...list];
    this.saveStorageData(updatedList);
    return newProperty;
  }

  async update(id: string, propertyData: Partial<Property>): Promise<Property> {
    const list = this.getStorageData();
    const index = list.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Inmueble con ID ${id} no encontrado.`);
    }

    const current = list[index];
    const updated: Property = {
      ...current,
      ...propertyData,
      id: current.id,
      organizationId: current.organizationId,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };

    list[index] = updated;
    this.saveStorageData(list);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const list = this.getStorageData();
    const filtered = list.filter((p) => p.id !== id);
    if (filtered.length === list.length) return false;
    this.saveStorageData(filtered);
    return true;
  }

  async resetToDefaultSeed(): Promise<Property[]> {
    this.saveStorageData(INITIAL_PROPERTIES);
    return INITIAL_PROPERTIES;
  }
}

export const propertyRepository = new LocalStoragePropertyRepository();
