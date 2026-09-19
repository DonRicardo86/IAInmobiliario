import { Property, PropertyFilters, PropertyPublicView } from '../types/property';

export interface IPropertyRepository {
  getAll(filters?: Partial<PropertyFilters>, organizationId?: string): Promise<Property[]>;
  getPublicCatalog(filters?: Partial<PropertyFilters>, organizationId?: string): Promise<PropertyPublicView[]>;
  getById(id: string): Promise<Property | null>;
  getByCode(code: string, organizationId?: string): Promise<Property | null>;
  create(propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Promise<Property>;
  update(id: string, propertyData: Partial<Property>): Promise<Property>;
  delete(id: string): Promise<boolean>;
  resetToDefaultSeed(): Promise<Property[]>;
}
