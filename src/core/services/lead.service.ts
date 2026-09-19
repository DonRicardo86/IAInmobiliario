import { Lead, LeadFilters, LeadPriority, LeadStats, LeadStatus } from '../types/lead';
import { DEFAULT_ORGANIZATION } from '../types/organization';

export class LeadService {
  async getLeads(filters?: Partial<LeadFilters>, organizationId: string = DEFAULT_ORGANIZATION.id): Promise<Lead[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.status && filters.status !== 'todos') queryParams.set('status', filters.status);
      if (filters?.priority && filters.priority !== 'todos') queryParams.set('priority', filters.priority);
      if (filters?.operationType && filters.operationType !== 'todos') queryParams.set('operationType', filters.operationType);
      if (filters?.propertyType && filters.propertyType !== 'todos') queryParams.set('propertyType', filters.propertyType);
      if (filters?.municipality && filters.municipality !== 'todas') queryParams.set('municipality', filters.municipality);
      if (filters?.zone && filters.zone !== 'todas') queryParams.set('zone', filters.zone);
      if (filters?.search) queryParams.set('search', filters.search);

      const res = await fetch(`/api/leads?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) return data.leads;
      return [];
    } catch (e) {
      console.error('Error fetching leads from API:', e);
      return [];
    }
  }

  async getLeadById(id: string): Promise<Lead | null> {
    try {
      const res = await fetch(`/api/leads/${id}`);
      const data = await res.json();
      if (data.success) return data.lead;
      return null;
    } catch (e) {
      console.error(`Error fetching lead ${id} from API:`, e);
      return null;
    }
  }

  async createLead(data: {
    organizationId?: string;
    name: string;
    phone: string;
    email: string;
    operationType: 'compra' | 'arriendo';
    propertyType: any;
    municipality?: string;
    zone: string;
    budget: number;
    minBudget?: number;
    maxBudget?: number;
    currency?: string;
    desiredFeatures?: string[];
    interestedPropertyIds?: string[];
    notes?: string;
    status?: LeadStatus;
    priority?: LeadPriority;
    source?: Lead['source'];
    assignedAgent?: string;
    consentHabeasData?: boolean;
    allowDuplicate?: boolean;
  }): Promise<Lead> {
    const orgId = data.organizationId || DEFAULT_ORGANIZATION.id;

    // Strict validation
    if (!data.name?.trim()) throw new Error('El nombre completo es obligatorio.');
    if (!data.phone?.trim()) throw new Error('El teléfono de contacto es obligatorio.');
    if (!data.email?.trim()) throw new Error('El correo electrónico es obligatorio.');
    if (!data.zone?.trim()) throw new Error('La zona o barrio de interés es obligatorio.');
    if (!data.budget || data.budget <= 0) throw new Error('El presupuesto debe ser mayor a cero.');

    // Heuristic auto-scoring
    const calculatedPriority = data.priority || this.calculateInitialPriority(data);

    const payload = {
      organizationId: orgId,
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email.trim().toLowerCase(),
      operationType: data.operationType,
      propertyType: data.propertyType,
      municipality: data.municipality?.trim() || 'Medellín',
      zone: data.zone.trim(),
      budget: Number(data.budget) || 0,
      minBudget: data.minBudget ? Number(data.minBudget) : undefined,
      maxBudget: data.maxBudget ? Number(data.maxBudget) : undefined,
      currency: data.currency || 'COP',
      desiredFeatures: data.desiredFeatures || [],
      interestedPropertyIds: data.interestedPropertyIds || [],
      notes: data.notes?.trim() || '',
      status: data.status || 'nuevo',
      priority: calculatedPriority,
      source: data.source || 'manual',
      assignedAgent: data.assignedAgent || 'Laura Gómez',
      consentHabeasData: data.consentHabeasData !== false,
    };

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const resData = await res.json();
    if (!resData.success) throw new Error(resData.error || 'Error al crear prospecto');
    return resData.lead;
  }

  async updateLead(id: string, updates: Partial<Lead>, authorName = 'Asesor'): Promise<Lead> {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const resData = await res.json();
    if (!resData.success) throw new Error(resData.error || 'Error al actualizar prospecto');
    return resData.lead;
  }

  async addNote(id: string, noteContent: string, author = 'Asesor'): Promise<Lead> {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity: {
          type: 'note_added',
          description: noteContent,
          author,
        },
      }),
    });
    const resData = await res.json();
    if (!resData.success) throw new Error(resData.error || 'Error al agregar nota');
    return resData.lead;
  }

  async deleteLead(id: string): Promise<boolean> {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'DELETE',
    });
    const resData = await res.json();
    return !!resData.success;
  }

  async resetData(): Promise<void> {
    await fetch('/api/demo/reset', { method: 'POST' });
  }

  async getDashboardStats(organizationId: string = DEFAULT_ORGANIZATION.id): Promise<LeadStats> {
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      if (data.success && data.stats) return data.stats;
    } catch (e) {
      console.error('Error fetching dashboard stats from API:', e);
    }
    return {
      total: 0,
      byStatus: { nuevo: 0, contactado: 0, interesado: 0, visita_agendada: 0, negociacion: 0, cerrado: 0, no_interesado: 0 },
      byPriority: { alto: 0, medio: 0, bajo: 0 },
      byOperation: { compra: 0, arriendo: 0 },
      conversionRate: 0,
      totalPipelineValue: 0,
      highPriorityCount: 0,
      newLeadsCount: 0,
      scheduledVisitsCount: 0,
      closedDealsCount: 0,
      pendingOpportunitiesCount: 0,
    };
  }

  /**
   * Business heuristic for lead scoring
   */
  private calculateInitialPriority(data: {
    budget: number;
    operationType: 'compra' | 'arriendo';
    notes?: string;
  }): LeadPriority {
    const notesLower = (data.notes || '').toLowerCase();
    const isUrgent =
      notesLower.includes('urgente') ||
      notesLower.includes('inmediato') ||
      notesLower.includes('preaprobado') ||
      notesLower.includes('visita');

    if (data.operationType === 'compra' && data.budget >= 800000000) return 'alto';
    if (data.operationType === 'arriendo' && data.budget >= 5000000) return 'alto';
    if (isUrgent) return 'alto';

    if (data.operationType === 'compra' && data.budget >= 300000000) return 'medio';
    if (data.operationType === 'arriendo' && data.budget >= 2000000) return 'medio';

    return 'bajo';
  }
}

export const leadService = new LeadService();
