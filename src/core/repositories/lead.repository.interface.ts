import { Lead, LeadFilters, LeadStats } from '../types/lead';

export interface ILeadRepository {
  getAll(filters?: Partial<LeadFilters>): Promise<Lead[]>;
  getById(id: string): Promise<Lead | null>;
  create(leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'activities'>): Promise<Lead>;
  update(id: string, leadData: Partial<Lead>): Promise<Lead>;
  delete(id: string): Promise<boolean>;
  getStats(): Promise<LeadStats>;
  addActivity(leadId: string, activityDescription: string, type?: Lead['activities'][0]['type']): Promise<Lead>;
  resetToDefaultSeed(): Promise<Lead[]>;
}
