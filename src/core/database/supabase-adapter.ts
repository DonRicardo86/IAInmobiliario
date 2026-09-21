import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Property, PropertyFilters, PropertyPublicView, CreatePropertyInput } from '../types/property';
import { Lead, LeadFilters, LeadStats, CreateLeadInput } from '../types/lead';
import { Organization, DEFAULT_ORGANIZATION } from '../types/organization';
import { ServerStore } from './server-store';

let supabaseAnonClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

export function getSupabaseAnonClient(): SupabaseClient | null {
  if (supabaseAnonClient) return supabaseAnonClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey && url.startsWith('http')) {
    try {
      supabaseAnonClient = createClient(url, anonKey, {
        auth: { persistSession: false },
      });
      return supabaseAnonClient;
    } catch (e) {
      console.error('[SupabaseAdapter] Failed to initialize anonymous Supabase client', e);
      return null;
    }
  }
  return null;
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (supabaseAdminClient) return supabaseAdminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && serviceKey && url.startsWith('http')) {
    try {
      supabaseAdminClient = createClient(url, serviceKey, {
        auth: { persistSession: false },
      });
      return supabaseAdminClient;
    } catch (e) {
      console.error('[SupabaseAdapter] Failed to initialize admin Supabase client', e);
      return null;
    }
  }
  return null;
}

export function getSupabaseUserClient(authToken?: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || !url.startsWith('http')) return null;

  if (authToken) {
    const cleanToken = authToken.replace(/^Bearer\s+/i, '').trim();
    try {
      return createClient(url, anonKey, {
        auth: { persistSession: false },
        global: {
          headers: {
            Authorization: `Bearer ${cleanToken}`,
          },
        },
      });
    } catch (e) {
      console.error('[SupabaseAdapter] Failed to initialize authenticated user client', e);
    }
  }

  return getSupabaseAnonClient();
}

export function getSupabaseClient(authToken?: string): SupabaseClient | null {
  if (authToken) {
    return getSupabaseUserClient(authToken);
  }
  return getSupabaseAdminClient() || getSupabaseAnonClient();
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
  static async getProperties(
    filters?: Partial<PropertyFilters>,
    organizationId: string = DEFAULT_ORGANIZATION.id,
    authToken?: string
  ): Promise<Property[]> {
    const supabase = getSupabaseClient(authToken);
    const isProduction = process.env.NODE_ENV === 'production' && !process.env.TEST_MODE && !process.env.DEMO_MODE;
    if (supabase) {
      try {
        let query = supabase
          .from('properties')
          .select('*, property_private_details(*)')
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
        if (!error && Array.isArray(data)) {
          return data.map(this.mapSupabasePropertyToDomain);
        }
        if (error) {
          console.error('[SupabaseAdapter] Properties query error:', error);
          if (isProduction) {
            throw new Error(`Error al consultar inventario en Supabase: ${error.message}`);
          }
        }
      } catch (err) {
        if (isProduction) throw err;
        console.error('[SupabaseAdapter] Fallback to ServerStore on properties error', err);
      }
    }

    if (isProduction) {
      return [];
    }

    return ServerStore.getProperties(filters, organizationId);
  }

  static async getPublicProperties(
    filters?: Partial<PropertyFilters>,
    organizationId: string = DEFAULT_ORGANIZATION.id
  ): Promise<PropertyPublicView[]> {
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
        if (!error && Array.isArray(data)) {
          return data.map(this.mapSupabasePublicPropertyToDomain);
        }
        if (error) throw error;
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

  static async getPropertyById(id: string, authToken?: string): Promise<Property | null> {
    const supabase = getSupabaseClient(authToken);
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*, property_private_details(*)')
          .eq('id', id)
          .maybeSingle();
        if (!error && data) {
          return this.mapSupabasePropertyToDomain(data);
        }
        if (!error && !data) {
          return null;
        }
      } catch (e) {
        // Fallback
      }
    }
    return ServerStore.getPropertyById(id);
  }

  static async createProperty(propertyData: CreatePropertyInput, authToken?: string): Promise<Property> {
    const supabase = getSupabaseClient(authToken);
    const isProduction = process.env.NODE_ENV === 'production' && !process.env.TEST_MODE && !process.env.DEMO_MODE;
    const targetOrgId = propertyData.organizationId || DEFAULT_ORGANIZATION.id;
    const payloadWithOrg = {
      ...propertyData,
      organizationId: targetOrgId,
    };

    if (supabase) {
      const payload = this.mapDomainPropertyToSupabase(payloadWithOrg);
      const { internal_address, assigned_agent, ...propertyPayload } = payload;

      const { data, error } = await supabase
        .from('properties')
        .insert(propertyPayload)
        .select()
        .single();

      if (error) {
        console.error('[SupabaseAdapter] Create property error in Supabase:', error);
        throw new Error(`Error en Supabase al registrar inmueble: ${error.message || error.details || JSON.stringify(error)}`);
      }

      if (data) {
        const privateData = {
          property_id: data.id,
          organization_id: data.organization_id,
          internal_address: internal_address || propertyData.internalAddress || 'Sin dirección registrada',
          assigned_agent: assigned_agent || propertyData.assignedAgent || 'Sin Asignar',
        };

        const { data: privResp, error: privError } = await supabase
          .from('property_private_details')
          .insert(privateData)
          .select()
          .single();

        if (privError) {
          console.error('[SupabaseAdapter] Error inserting property_private_details:', privError);
          await supabase.from('properties').delete().eq('id', data.id);
          throw new Error(`Error al registrar detalles privados del inmueble: ${privError.message}`);
        }

        return this.mapSupabasePropertyToDomain({
          ...data,
          property_private_details: privResp ? [privResp] : [{
            internal_address: privateData.internal_address,
            assigned_agent: privateData.assigned_agent,
          }],
        });
      }
    }

    if (isProduction) {
      throw new Error('Supabase no está configurado en el servidor para persistir propiedades.');
    }

    return ServerStore.createProperty(payloadWithOrg);
  }

  static async updateProperty(id: string, updates: Partial<Property>, authToken?: string): Promise<Property> {
    const supabase = getSupabaseClient(authToken);
    const isProduction = process.env.NODE_ENV === 'production' && !process.env.TEST_MODE && !process.env.DEMO_MODE;

    if (supabase) {
      const payload = this.mapDomainPropertyToSupabase(updates);
      const { internal_address, assigned_agent, ...propertyPayload } = payload;

      if (Object.keys(propertyPayload).length > 0) {
        const { error } = await supabase
          .from('properties')
          .update(propertyPayload)
          .eq('id', id);
        if (error) {
          console.error('[SupabaseAdapter] Update property error in Supabase:', error);
          throw new Error(`Error al actualizar inmueble en Supabase: ${error.message}`);
        }
      }

      if (internal_address !== undefined || assigned_agent !== undefined) {
        const privUpdates: any = {};
        if (internal_address !== undefined) privUpdates.internal_address = internal_address;
        if (assigned_agent !== undefined) privUpdates.assigned_agent = assigned_agent;

        const { error: privError } = await supabase
          .from('property_private_details')
          .update(privUpdates)
          .eq('property_id', id);

        if (privError) {
          console.error('[SupabaseAdapter] Update property_private_details error:', privError);
          throw new Error(`Error al actualizar detalles privados: ${privError.message}`);
        }
      }

      const fresh = await this.getPropertyById(id, authToken);
      if (fresh) return fresh;
    }

    if (isProduction) {
      throw new Error('Supabase no está configurado en el servidor.');
    }

    return ServerStore.updateProperty(id, updates);
  }

  static async deleteProperty(id: string, authToken?: string): Promise<boolean> {
    const supabase = getSupabaseClient(authToken);
    const isProduction = process.env.NODE_ENV === 'production' && !process.env.TEST_MODE && !process.env.DEMO_MODE;

    if (supabase) {
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) {
        console.error('[SupabaseAdapter] Delete property error in Supabase:', error);
        throw new Error(`Error al eliminar inmueble en Supabase: ${error.message}`);
      }
      return true;
    }

    if (isProduction) {
      throw new Error('Supabase no está configurado en el servidor.');
    }

    return ServerStore.deleteProperty(id);
  }

  // LEADS
  static async getLeads(
    filters?: Partial<LeadFilters>,
    organizationId: string = DEFAULT_ORGANIZATION.id,
    authToken?: string
  ): Promise<Lead[]> {
    const supabase = getSupabaseClient(authToken);
    const isProduction = process.env.NODE_ENV === 'production' && !process.env.TEST_MODE && !process.env.DEMO_MODE;

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
        if (!error && Array.isArray(data)) {
          return data.map(this.mapSupabaseLeadToDomain);
        }
        if (error) {
          console.error('[SupabaseAdapter] Leads query error:', error);
          if (isProduction) {
            throw new Error(`Error al consultar prospectos en Supabase: ${error.message}`);
          }
        }
      } catch (e) {
        if (isProduction) throw e;
        console.error('[SupabaseAdapter] Leads query fallback to ServerStore', e);
      }
    }

    if (isProduction) {
      return [];
    }

    return ServerStore.getLeads(filters, organizationId);
  }

  static async getLeadById(id: string, authToken?: string): Promise<Lead | null> {
    const supabase = getSupabaseClient(authToken);
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*, lead_activities(*)')
          .eq('id', id)
          .maybeSingle();
        if (!error && data) {
          return this.mapSupabaseLeadToDomain(data);
        }
        if (!error && !data) {
          return null;
        }
      } catch (e) {
        // Fallback
      }
    }
    return ServerStore.getLeadById(id);
  }

  static async findDuplicateLead(
    email: string,
    phone: string,
    organizationId: string = DEFAULT_ORGANIZATION.id,
    authToken?: string
  ): Promise<Lead | null> {
    const supabase = getSupabaseClient(authToken);
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*, lead_activities(*)')
          .eq('organization_id', organizationId)
          .or(`email.eq.${email},phone.eq.${phone}`)
          .limit(1)
          .maybeSingle();
        if (!error && data) {
          return this.mapSupabaseLeadToDomain(data);
        }
      } catch (e) {
        // Fallback
      }
    }
    return ServerStore.findDuplicateLead(email, phone, organizationId);
  }

  static async createLead(leadData: CreateLeadInput, authToken?: string): Promise<Lead> {
    const supabase = getSupabaseClient(authToken);
    const isProduction = process.env.NODE_ENV === 'production' && !process.env.TEST_MODE && !process.env.DEMO_MODE;
    const targetOrgId = leadData.organizationId || DEFAULT_ORGANIZATION.id;
    const payloadWithDefaults = {
      ...leadData,
      organizationId: targetOrgId,
      currency: leadData.currency || 'COP',
    };

    if (supabase) {
      const payload = this.mapDomainLeadToSupabase(payloadWithDefaults);
      const { data, error } = await supabase
        .from('leads')
        .insert(payload)
        .select()
        .single();
      if (error) {
        console.error('[SupabaseAdapter] Create lead error in Supabase:', error);
        throw new Error(`Error al registrar prospecto en Supabase: ${error.message}`);
      }
      if (data) {
        if (leadData.notes) {
          await supabase.from('lead_activities').insert({
            lead_id: data.id,
            description: `Prospecto registrado: ${leadData.notes}`,
            type: 'created',
            author: leadData.assignedAgent || 'Sistema',
          });
        }
        return this.mapSupabaseLeadToDomain({ ...data, lead_activities: [] });
      }
    }

    if (isProduction) {
      throw new Error('Supabase no está configurado en el servidor para registrar prospectos.');
    }

    return ServerStore.createLead(payloadWithDefaults);
  }

  static async updateLead(id: string, updates: Partial<Lead>, authToken?: string): Promise<Lead> {
    const supabase = getSupabaseClient(authToken);
    const isProduction = process.env.NODE_ENV === 'production' && !process.env.TEST_MODE && !process.env.DEMO_MODE;

    if (supabase) {
      const payload = this.mapDomainLeadToSupabase(updates);
      const { data, error } = await supabase
        .from('leads')
        .update(payload)
        .eq('id', id)
        .select('*, lead_activities(*)')
        .single();
      if (error) {
        console.error('[SupabaseAdapter] Update lead error in Supabase:', error);
        throw new Error(`Error al actualizar prospecto en Supabase: ${error.message}`);
      }
      if (data) {
        return this.mapSupabaseLeadToDomain(data);
      }
    }

    if (isProduction) {
      throw new Error('Supabase no está configurado en el servidor.');
    }

    return ServerStore.updateLead(id, updates);
  }

  static async addLeadActivity(
    leadId: string,
    description: string,
    type: any = 'note_added',
    author = 'Asesor',
    authToken?: string
  ): Promise<Lead> {
    const supabase = getSupabaseClient(authToken);
    const isProduction = process.env.NODE_ENV === 'production' && !process.env.TEST_MODE && !process.env.DEMO_MODE;

    if (supabase) {
      const { error } = await supabase.from('lead_activities').insert({
        lead_id: leadId,
        description,
        type,
        author,
      });
      if (error) {
        console.error('[SupabaseAdapter] Add lead activity error:', error);
        if (isProduction) throw new Error(`Error al registrar actividad: ${error.message}`);
      }
      const updated = await this.getLeadById(leadId, authToken);
      if (updated) return updated;
    }

    if (isProduction) {
      throw new Error('Supabase no está configurado en el servidor.');
    }

    return ServerStore.addLeadActivity(leadId, description, type, author);
  }

  static async deleteLead(id: string, authToken?: string): Promise<boolean> {
    const supabase = getSupabaseClient(authToken);
    const isProduction = process.env.NODE_ENV === 'production' && !process.env.TEST_MODE && !process.env.DEMO_MODE;

    if (supabase) {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) {
        console.error('[SupabaseAdapter] Delete lead error in Supabase:', error);
        throw new Error(`Error al eliminar prospecto en Supabase: ${error.message}`);
      }
      return true;
    }

    if (isProduction) {
      throw new Error('Supabase no está configurado en el servidor.');
    }

    return ServerStore.deleteLead(id);
  }

  static async getStats(
    organizationId: string = DEFAULT_ORGANIZATION.id,
    authToken?: string
  ): Promise<LeadStats> {
    const leads = await this.getLeads({}, organizationId, authToken);

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
    const privateDetails = Array.isArray(row.property_private_details)
      ? row.property_private_details[0]
      : row.property_private_details;

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
      internalAddress: privateDetails?.internal_address || row.internal_address || 'Dirección no registrada',
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
      assignedAgent: privateDetails?.assigned_agent || row.assigned_agent || 'Sin Asignar',
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
    res.description = p.description && p.description.trim() ? p.description.trim() : (p.title || 'Inmueble registrado');
    if (p.type) res.type = p.type;
    if (p.operation) res.operation = p.operation;
    if (p.municipality) res.municipality = p.municipality;
    if (p.zone) res.zone = p.zone;
    if (p.internalAddress) res.internal_address = p.internalAddress;
    if (p.priceCOP !== undefined && p.priceCOP !== null && p.priceCOP !== '') {
      res.price_cop = Number(p.priceCOP);
    }
    if (p.adminFeeCOP !== undefined && p.adminFeeCOP !== null && p.adminFeeCOP !== '') {
      res.admin_fee_cop = Number(p.adminFeeCOP);
    } else {
      res.admin_fee_cop = 0;
    }
    if (p.areaM2 !== undefined && p.areaM2 !== null && p.areaM2 !== '') {
      res.area_m2 = Number(p.areaM2);
    }
    if (p.bedrooms !== undefined && p.bedrooms !== null && p.bedrooms !== '') {
      res.bedrooms = Number(p.bedrooms);
    }
    if (p.bathrooms !== undefined && p.bathrooms !== null && p.bathrooms !== '') {
      res.bathrooms = Number(p.bathrooms);
    }
    if (p.parkingSpots !== undefined && p.parkingSpots !== null && p.parkingSpots !== '') {
      res.parking_spots = Number(p.parkingSpots);
    }
    if (p.stratum !== undefined && p.stratum !== null && p.stratum !== '') {
      res.stratum = Number(p.stratum);
    }
    if (p.features) res.features = Array.isArray(p.features) ? p.features : [];
    if (p.images) res.images = Array.isArray(p.images) ? p.images : [];
    if (p.status) res.status = p.status;
    if (p.featured !== undefined) res.featured = Boolean(p.featured);
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
