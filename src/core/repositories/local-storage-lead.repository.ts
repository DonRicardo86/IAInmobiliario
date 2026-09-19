import { Lead, LeadActivity, LeadFilters, LeadPriority, LeadStats, LeadStatus, OperationType } from '../types/lead';
import { ILeadRepository } from './lead.repository.interface';
import { INITIAL_LEADS } from './mock-data';
import { DEFAULT_ORGANIZATION } from '../types/organization';

const LEADS_STORAGE_KEY = 'ia_inmobiliaria_leads_v2';

export class LocalStorageLeadRepository implements ILeadRepository {
  private memoryCache: Lead[] | null = null;

  private getStorageData(): Lead[] {
    if (typeof window === 'undefined') {
      return this.memoryCache || INITIAL_LEADS;
    }

    try {
      const data = localStorage.getItem(LEADS_STORAGE_KEY);
      if (!data) {
        localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(INITIAL_LEADS));
        this.memoryCache = INITIAL_LEADS;
        return INITIAL_LEADS;
      }
      const parsed = JSON.parse(data);
      this.memoryCache = parsed;
      return parsed;
    } catch (e) {
      console.error('Error reading localStorage leads', e);
      return this.memoryCache || INITIAL_LEADS;
    }
  }

  private saveStorageData(leads: Lead[]): void {
    this.memoryCache = leads;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
      } catch (e) {
        console.error('Error saving leads to localStorage', e);
      }
    }
  }

  async getAll(filters?: Partial<LeadFilters>, organizationId: string = DEFAULT_ORGANIZATION.id): Promise<Lead[]> {
    let list = this.getStorageData().filter((lead) => !organizationId || lead.organizationId === organizationId);

    if (!filters) return list;

    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (lead) =>
          lead.name.toLowerCase().includes(q) ||
          lead.email.toLowerCase().includes(q) ||
          lead.phone.toLowerCase().includes(q) ||
          lead.zone.toLowerCase().includes(q) ||
          (lead.municipality && lead.municipality.toLowerCase().includes(q)) ||
          lead.propertyType.toLowerCase().includes(q) ||
          lead.notes.toLowerCase().includes(q)
      );
    }

    if (filters.status && filters.status !== 'todos') {
      list = list.filter((lead) => lead.status === filters.status);
    }

    if (filters.priority && filters.priority !== 'todos') {
      list = list.filter((lead) => lead.priority === filters.priority);
    }

    if (filters.operationType && filters.operationType !== 'todos') {
      list = list.filter((lead) => lead.operationType === filters.operationType);
    }

    if (filters.propertyType && filters.propertyType !== 'todos') {
      list = list.filter((lead) => lead.propertyType === filters.propertyType);
    }

    if (filters.municipality && filters.municipality.trim() !== '' && filters.municipality !== 'todas') {
      list = list.filter((lead) =>
        lead.municipality?.toLowerCase().includes(filters.municipality!.toLowerCase())
      );
    }

    if (filters.zone && filters.zone.trim() !== '' && filters.zone !== 'todas') {
      list = list.filter((lead) =>
        lead.zone.toLowerCase().includes(filters.zone!.toLowerCase())
      );
    }

    if (filters.minBudget !== undefined && filters.minBudget > 0) {
      list = list.filter((lead) => lead.budget >= filters.minBudget!);
    }
    if (filters.maxBudget !== undefined && filters.maxBudget > 0) {
      list = list.filter((lead) => lead.budget <= filters.maxBudget!);
    }

    const sortBy = filters.sortBy || 'date_desc';
    list.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'date_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'budget_desc') return b.budget - a.budget;
      if (sortBy === 'budget_asc') return a.budget - b.budget;
      if (sortBy === 'priority') {
        const priorityOrder: Record<LeadPriority, number> = { alto: 3, medio: 2, bajo: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return 0;
    });

    return list;
  }

  async getById(id: string): Promise<Lead | null> {
    const list = this.getStorageData();
    const found = list.find((lead) => lead.id === id);
    return found ? { ...found } : null;
  }

  async findDuplicate(email: string, phone: string, organizationId: string = DEFAULT_ORGANIZATION.id): Promise<Lead | null> {
    const list = this.getStorageData();
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const cleanEmail = email.toLowerCase().trim();

    const duplicate = list.find((l) => {
      if (l.organizationId !== organizationId) return false;
      const lPhone = l.phone.replace(/[^0-9]/g, '');
      const lEmail = l.email.toLowerCase().trim();
      return (cleanEmail && lEmail === cleanEmail) || (cleanPhone && cleanPhone.length > 7 && lPhone.includes(cleanPhone));
    });

    return duplicate || null;
  }

  async create(leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'activities'>): Promise<Lead> {
    const list = this.getStorageData();
    const now = new Date().toISOString();
    const newId = `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const initialActivity: LeadActivity = {
      id: `act-${Date.now()}`,
      type: 'created',
      description: leadData.source === 'asistente_ia'
        ? 'Prospecto captado automáticamente por el Asistente Web IA con autorización de datos.'
        : 'Prospecto registrado exitosamente en el CRM.',
      createdAt: now,
      author: leadData.source === 'asistente_ia' ? 'SofIA Asistente' : 'Sistema',
    };

    const newLead: Lead = {
      ...leadData,
      id: newId,
      activities: [initialActivity],
      createdAt: now,
      updatedAt: now,
    };

    const updatedList = [newLead, ...list];
    this.saveStorageData(updatedList);
    return newLead;
  }

  async update(id: string, leadData: Partial<Lead>): Promise<Lead> {
    const list = this.getStorageData();
    const index = list.findIndex((lead) => lead.id === id);
    if (index === -1) {
      throw new Error(`Prospecto con ID ${id} no encontrado.`);
    }

    const currentLead = list[index];
    const now = new Date().toISOString();

    const updatedLead: Lead = {
      ...currentLead,
      ...leadData,
      id: currentLead.id,
      createdAt: currentLead.createdAt,
      updatedAt: now,
    };

    list[index] = updatedLead;
    this.saveStorageData(list);
    return updatedLead;
  }

  async delete(id: string): Promise<boolean> {
    const list = this.getStorageData();
    const filtered = list.filter((lead) => lead.id !== id);
    if (filtered.length === list.length) return false;
    this.saveStorageData(filtered);
    return true;
  }

  async addActivity(
    leadId: string,
    activityDescription: string,
    type: LeadActivity['type'] = 'note_added',
    author: string = 'Asesor'
  ): Promise<Lead> {
    const list = this.getStorageData();
    const index = list.findIndex((lead) => lead.id === leadId);
    if (index === -1) {
      throw new Error(`Prospecto con ID ${leadId} no encontrado.`);
    }

    const currentLead = list[index];
    const newActivity: LeadActivity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      type,
      description: activityDescription,
      createdAt: new Date().toISOString(),
      author,
    };

    const updatedLead: Lead = {
      ...currentLead,
      activities: [newActivity, ...(currentLead.activities || [])],
      updatedAt: new Date().toISOString(),
    };

    list[index] = updatedLead;
    this.saveStorageData(list);
    return updatedLead;
  }

  async getStats(organizationId: string = DEFAULT_ORGANIZATION.id): Promise<LeadStats> {
    const list = this.getStorageData().filter((l) => !organizationId || l.organizationId === organizationId);

    const byStatus: Record<LeadStatus, number> = {
      nuevo: 0,
      contactado: 0,
      interesado: 0,
      visita_agendada: 0,
      negociacion: 0,
      cerrado: 0,
      no_interesado: 0,
    };

    const byPriority: Record<LeadPriority, number> = {
      alto: 0,
      medio: 0,
      bajo: 0,
    };

    const byOperation: Record<OperationType, number> = {
      compra: 0,
      arriendo: 0,
    };

    let totalPipelineValue = 0;

    for (const lead of list) {
      if (byStatus[lead.status] !== undefined) byStatus[lead.status]++;
      if (byPriority[lead.priority] !== undefined) byPriority[lead.priority]++;
      if (byOperation[lead.operationType] !== undefined) byOperation[lead.operationType]++;

      // Calculate active pipeline value
      if (lead.status !== 'cerrado' && lead.status !== 'no_interesado') {
        totalPipelineValue += lead.budget || 0;
      }
    }

    const closedCount = byStatus.cerrado;
    const totalCount = list.length;
    const conversionRate = totalCount > 0 ? (closedCount / totalCount) * 100 : 0;
    const pendingOpportunities = byStatus.nuevo + byStatus.contactado + byStatus.interesado + byStatus.negociacion + byStatus.visita_agendada;

    return {
      total: totalCount,
      byStatus,
      byPriority,
      byOperation,
      conversionRate: Math.round(conversionRate * 10) / 10,
      totalPipelineValue,
      highPriorityCount: byPriority.alto,
      newLeadsCount: byStatus.nuevo,
      scheduledVisitsCount: byStatus.visita_agendada,
      closedDealsCount: closedCount,
      pendingOpportunitiesCount: pendingOpportunities,
    };
  }

  async resetToDefaultSeed(): Promise<Lead[]> {
    this.saveStorageData(INITIAL_LEADS);
    return INITIAL_LEADS;
  }
}

export const leadRepository = new LocalStorageLeadRepository();
