import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Property, PropertyFilters, PropertyPublicView, CreatePropertyInput } from '../types/property';
import { Lead, LeadFilters, LeadStats, CreateLeadInput } from '../types/lead';
import { Organization, DEFAULT_ORGANIZATION } from '../types/organization';
import { ServerStore } from './server-store';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key && url.startsWith('http')) {
    try {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
        },
      });
      return supabaseClient;
    } catch (e) {
      console.error('[SupabaseAdapter] Failed to initialize Supabase client', e);
      return null;
    }
  }

  return null;
}

export function isSupabaseConnected(): boolean {
  return !!getSupabaseClient();
}

/**
 * Unified Repository Layer:
 * Uses Supabase PostgreSQL when credentials exist, and ServerStore when in local/demo mode.
 */
export class UnifiedDataService {
  // PROPERTIES
  static async getProperties(filters?: Partial<PropertyFilters>, organizationId: string = DEFAULT_ORGANIZATION.id): Promise<Property[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let query = supabase
          .from('properties')
          .select('*')
          .eq('organization_id', organizationId);

        if (filters?.operation && filters.operation !== 'todos') {
          query = query.eq('operation', filters.operation);
        }
        if (filters?.type && filters.type !== 'todos') {
          query = query.eq('type', filters.type);
        }
        if (filters?.status && filters.status !== 'todos') {
          query = query.eq('status', filters.status);
        }
        if (filters?.minPrice) {
          query = query.gte('price_cop', filters.minPrice);
        }
        if (filters?.maxPrice) {
          query = query.lte('price_cop', filters.maxPrice);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (data && data.length > 0) {
          return data.map(this.mapSupabasePropertyToDomain);
        }
      } catch (err) {
        console.error('[SupabaseAdapter] Fallback to ServerStore on properties error', err);
      }
    }

    return ServerStore.getProperties(filters, organizationId);
  }

  static async getPublicProperties(filters?: Partial<PropertyFilters>, organizationId: string = DEFAULT_ORGANIZATION.id): Promise<PropertyPublicView[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let query = supabase
          .from('public_properties')
          .select('*')
          .eq('organization_id', organizationId);

        if (filters?.operation && filters.operation !== 'todos') {
          query = query.eq('operation', filters.operation);
        }
        if (filters?.type && filters.type !== 'todos') {
          query = query.eq('type', filters.type);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (data && data.length > 0) {
          return data.map(this.mapSupabasePublicPropertyToDomain);
        }
      } catch (err) {
        console.error('[SupabaseAdapter] Fallback to ServerStore on public properties error', err);
      }
    }

    return ServerStore.getPublicProperties(filters, organizationId);
  }

  static async matchPropertiesForAssistant(
    criteria: {
      operation?: 'compra' | 'arriendo';
      propertyType?: string;
      municipality?: string;
      zone?: string;
      maxBudget?: number;
      minBedrooms?: number;
      requiredFeatures?: string[];
    },
    organizationId: string = DEFAULT_ORGANIZATION.id
  ): Promise<PropertyPublicView[]> {
    const catalog = await this.getPublicProperties({}, organizationId);

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

  static async getPropertyById(id: string): Promise<Property | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('id', id)
          .single();
        if (!error && data) {
          return this.mapSupabasePropertyToDomain(data);
        }
      } catch (e) {
        // Fallback
      }
    }
    return ServerStore.getPropertyById(id);
  }

  static async createProperty(propertyData: CreatePropertyInput): Promise<Property> {
    const supabase = getSupabaseClient();
    const payloadWithOrg = {
      ...propertyData,
      organizationId: propertyData.organizationId || DEFAULT_ORGANIZATION.id,
    };
    if (supabase) {
      try {
        const payload = this.mapDomainPropertyToSupabase(payloadWithOrg);
        const { data, error } = await supabase
          .from('properties')
          .insert(payload)
          .select()
          .single();
        if (!error && data) {
          return this.mapSupabasePropertyToDomain(data);
        }
      } catch (e) {
        console.error('[SupabaseAdapter] Create property error in Supabase, using ServerStore', e);
      }
    }

    return ServerStore.createProperty(payloadWithOrg);
  }

  static async updateProperty(id: string, updates: Partial<Property>): Promise<Property> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const payload = this.mapDomainPropertyToSupabase(updates);
        const { data, error } = await supabase
          .from('properties')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          return this.mapSupabasePropertyToDomain(data);
        }
      } catch (e) {
        console.error('[SupabaseAdapter] Update property error in Supabase', e);
      }
    }

    return ServerStore.updateProperty(id, updates);
  }

  static async deleteProperty(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('properties').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {
        // Fallback
      }
    }
    return ServerStore.deleteProperty(id);
  }

  // LEADS
  static async getLeads(filters?: Partial<LeadFilters>, organizationId: string = DEFAULT_ORGANIZATION.id): Promise<Lead[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let query = supabase
          .from('leads')
          .select('*, lead_activities(*)')
          .eq('organization_id', organizationId);

        if (filters?.status && filters.status !== 'todos') {
          query = query.eq('status', filters.status);
        }
        if (filters?.priority && filters.priority !== 'todos') {
          query = query.eq('priority', filters.priority);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map(this.mapSupabaseLeadToDomain);
        }
      } catch (e) {
        console.error('[SupabaseAdapter] Leads query fallback to ServerStore', e);
      }
    }

    return ServerStore.getLeads(filters, organizationId);
  }

  static async getLeadById(id: string): Promise<Lead | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*, lead_activities(*)')
          .eq('id', id)
          .single();
        if (!error && data) {
          return this.mapSupabaseLeadToDomain(data);
        }
      } catch (e) {
        // Fallback
      }
    }
    return ServerStore.getLeadById(id);
  }

  static async findDuplicateLead(email: string, phone: string, organizationId: string = DEFAULT_ORGANIZATION.id): Promise<Lead | null> {
    return ServerStore.findDuplicateLead(email, phone, organizationId);
  }

  static async createLead(leadData: CreateLeadInput): Promise<Lead> {
    const supabase = getSupabaseClient();
    const payloadWithDefaults = {
      ...leadData,
      organizationId: leadData.organizationId || DEFAULT_ORGANIZATION.id,
      currency: leadData.currency || 'COP',
    };
    if (supabase) {
      try {
        const payload = this.mapDomainLeadToSupabase(payloadWithDefaults);
        const { data, error } = await supabase
          .from('leads')
          .insert(payload)
          .select()
          .single();
        if (!error && data) {
          return this.mapSupabaseLeadToDomain(data);
        }
      } catch (e) {
        console.error('[SupabaseAdapter] Create lead error in Supabase, using ServerStore', e);
      }
    }

    return ServerStore.createLead(payloadWithDefaults);
  }

  static async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const payload = this.mapDomainLeadToSupabase(updates);
        const { data, error } = await supabase
          .from('leads')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          return this.mapSupabaseLeadToDomain(data);
        }
      } catch (e) {
        console.error('[SupabaseAdapter] Update lead error in Supabase', e);
      }
    }

    return ServerStore.updateLead(id, updates);
  }

  static async addLeadActivity(leadId: string, description: string, type: any = 'note_added', author = 'Asesor'): Promise<Lead> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('lead_activities').insert({
          lead_id: leadId,
          description,
          type,
          author,
        });
      } catch (e) {
        // Fallback
      }
    }

    return ServerStore.addLeadActivity(leadId, description, type, author);
  }

  static async deleteLead(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('leads').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {
        // Fallback
      }
    }
    return ServerStore.deleteLead(id);
  }

  static async getStats(organizationId: string = DEFAULT_ORGANIZATION.id): Promise<LeadStats> {
    const leads = await this.getLeads({}, organizationId);

    const byStatus: Record<string, number> = {
      nuevo: 0,
      contactado: 0,
      interesado: 0,
      visita_agendada: 0,
      negociacion: 0,
      cerrado: 0,
      no_interesado: 0,
    };

    const byPriority: Record<string, number> = {
      alto: 0,
      medio: 0,
      bajo: 0,
    };

    const byOperation: Record<string, number> = {
      compra: 0,
      arriendo: 0,
    };

    let totalPipelineValue = 0;

    for (const lead of leads) {
      if (byStatus[lead.status] !== undefined) byStatus[lead.status]++;
      if (byPriority[lead.priority] !== undefined) byPriority[lead.priority]++;
      if (byOperation[lead.operationType] !== undefined) byOperation[lead.operationType]++;

      if (lead.status !== 'cerrado' && lead.status !== 'no_interesado') {
        totalPipelineValue += lead.budget || 0;
      }
    }

    const closedCount = byStatus.cerrado || 0;
    const totalCount = leads.length;
    const conversionRate = totalCount > 0 ? (closedCount / totalCount) * 100 : 0;
    const pendingOpportunities =
      (byStatus.nuevo || 0) +
      (byStatus.contactado || 0) +
      (byStatus.interesado || 0) +
      (byStatus.negociacion || 0) +
      (byStatus.visita_agendada || 0);

    return {
      total: totalCount,
      byStatus: byStatus as any,
      byPriority: byPriority as any,
      byOperation: byOperation as any,
      conversionRate: Math.round(conversionRate * 10) / 10,
      totalPipelineValue,
      highPriorityCount: byPriority.alto || 0,
      newLeadsCount: byStatus.nuevo || 0,
      scheduledVisitsCount: byStatus.visita_agendada || 0,
      closedDealsCount: closedCount,
      pendingOpportunitiesCount: pendingOpportunities,
    };
  }

  static resetDatabase(): void {
    ServerStore.resetDatabase();
  }

  // MAPPERS
  private static mapSupabasePropertyToDomain(row: any): Property {
    return {
      id: row.id,
      organizationId: row.organization_id,
      code: row.code,
      title: row.title,
      description: row.description,
      type: row.type,
      operation: row.operation,
      municipality: row.municipality,
      zone: row.zone,
      internalAddress: row.internal_address,
      priceCOP: Number(row.price_cop),
      adminFeeCOP: Number(row.admin_fee_cop || 0),
      areaM2: Number(row.area_m2),
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      parkingSpots: row.parking_spots,
      stratum: row.stratum,
      features: row.features || [],
      images: row.images || [],
      status: row.status,
      assignedAgent: row.assigned_agent,
      featured: row.featured,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapSupabasePublicPropertyToDomain(row: any): PropertyPublicView {
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      description: row.description,
      type: row.type,
      operation: row.operation,
      municipality: row.municipality,
      zone: row.zone,
      priceCOP: Number(row.price_cop),
      adminFeeCOP: Number(row.admin_fee_cop || 0),
      areaM2: Number(row.area_m2),
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      parkingSpots: row.parking_spots,
      stratum: row.stratum,
      features: row.features || [],
      images: row.images || [],
      status: row.status,
      featured: row.featured,
    };
  }

  private static mapDomainPropertyToSupabase(p: any): any {
    const res: any = {};
    if (p.organizationId) res.organization_id = p.organizationId;
    if (p.code) res.code = p.code;
    if (p.title) res.title = p.title;
    if (p.description) res.description = p.description;
    if (p.type) res.type = p.type;
    if (p.operation) res.operation = p.operation;
    if (p.municipality) res.municipality = p.municipality;
    if (p.zone) res.zone = p.zone;
    if (p.internalAddress) res.internal_address = p.internalAddress;
    if (p.priceCOP !== undefined) res.price_cop = p.priceCOP;
    if (p.adminFeeCOP !== undefined) res.admin_fee_cop = p.adminFeeCOP;
    if (p.areaM2 !== undefined) res.area_m2 = p.areaM2;
    if (p.bedrooms !== undefined) res.bedrooms = p.bedrooms;
    if (p.bathrooms !== undefined) res.bathrooms = p.bathrooms;
    if (p.parkingSpots !== undefined) res.parking_spots = p.parkingSpots;
    if (p.stratum !== undefined) res.stratum = p.stratum;
    if (p.features) res.features = p.features;
    if (p.images) res.images = p.images;
    if (p.status) res.status = p.status;
    if (p.assignedAgent) res.assigned_agent = p.assignedAgent;
    return res;
  }

  private static mapSupabaseLeadToDomain(row: any): Lead {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      operationType: row.operation_type,
      propertyType: row.property_type,
      municipality: row.municipality,
      zone: row.zone,
      budget: Number(row.budget),
      minBudget: row.min_budget ? Number(row.min_budget) : undefined,
      maxBudget: row.max_budget ? Number(row.max_budget) : undefined,
      currency: row.currency || 'COP',
      desiredFeatures: row.desired_features || [],
      interestedPropertyIds: row.interested_property_ids || [],
      notes: row.notes || '',
      status: row.status,
      priority: row.priority,
      source: row.source,
      assignedAgent: row.assigned_agent,
      consentHabeasData: row.consent_habeas_data,
      activities: (row.lead_activities || []).map((a: any) => ({
        id: a.id,
        type: a.type,
        description: a.description,
        createdAt: a.created_at,
        author: a.author,
      })),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapDomainLeadToSupabase(l: any): any {
    const res: any = {};
    if (l.organizationId) res.organization_id = l.organizationId;
    if (l.name) res.name = l.name;
    if (l.phone) res.phone = l.phone;
    if (l.email) res.email = l.email;
    if (l.operationType) res.operation_type = l.operationType;
    if (l.propertyType) res.property_type = l.propertyType;
    if (l.municipality) res.municipality = l.municipality;
    if (l.zone) res.zone = l.zone;
    if (l.budget !== undefined) res.budget = l.budget;
    if (l.minBudget !== undefined) res.min_budget = l.minBudget;
    if (l.maxBudget !== undefined) res.max_budget = l.maxBudget;
    if (l.currency) res.currency = l.currency;
    if (l.desiredFeatures) res.desired_features = l.desiredFeatures;
    if (l.interestedPropertyIds) res.interested_property_ids = l.interestedPropertyIds;
    if (l.notes !== undefined) res.notes = l.notes;
    if (l.status) res.status = l.status;
    if (l.priority) res.priority = l.priority;
    if (l.source) res.source = l.source;
    if (l.assignedAgent) res.assigned_agent = l.assignedAgent;
    if (l.consentHabeasData !== undefined) res.consent_habeas_data = l.consentHabeasData;
    return res;
  }
}
