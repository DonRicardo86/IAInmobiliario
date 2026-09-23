import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Property, PropertyFilters, PropertyPublicView, CreatePropertyInput } from '../types/property';
import type { Lead, LeadFilters, LeadStats, CreateLeadInput } from '../types/lead';
import { DEFAULT_ORGANIZATION, KNOWN_ORGANIZATIONS, type Organization } from '../types/organization';
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

export interface AdminKeyInspection {
  isConfigured: boolean;
  role?: string;
  projectRef?: string;
  isValidJwt: boolean;
  isServiceRole: boolean;
  isMatchingAnon: boolean;
  urlProjectRef?: string;
  isProjectMatching: boolean;
}

export function inspectAdminKey(): AdminKeyInspection {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  let urlProjectRef: string | undefined;
  if (url) {
    const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/i);
    if (match && match[1]) {
      urlProjectRef = match[1];
    }
  }

  if (!serviceKey) {
    return {
      isConfigured: false,
      isValidJwt: false,
      isServiceRole: false,
      isMatchingAnon: false,
      urlProjectRef,
      isProjectMatching: true,
    };
  }

  const cleanKey = serviceKey
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^Bearer\s+/i, '')
    .trim();

  const cleanAnonKey = anonKey
    ? anonKey.trim().replace(/^["']|["']$/g, '').replace(/^Bearer\s+/i, '').trim()
    : undefined;

  const isMatchingAnon = !!(cleanAnonKey && cleanKey === cleanAnonKey);

  try {
    const parts = cleanKey.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      const role = typeof payload.role === 'string' ? payload.role : undefined;
      const projectRef = typeof payload.ref === 'string' ? payload.ref : undefined;
      const isProjectMatching = !urlProjectRef || !projectRef || urlProjectRef === projectRef;

      return {
        isConfigured: true,
        role,
        projectRef,
        isValidJwt: true,
        isServiceRole: role === 'service_role',
        isMatchingAnon: isMatchingAnon || role === 'anon',
        urlProjectRef,
        isProjectMatching,
      };
    }
  } catch {
    // Non-standard or opaque token
  }

  return {
    isConfigured: true,
    isValidJwt: false,
    isServiceRole: false,
    isMatchingAnon,
    urlProjectRef,
    isProjectMatching: true,
  };
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (supabaseAdminClient) return supabaseAdminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && rawServiceKey && url.startsWith('http')) {
    const cleanKey = rawServiceKey
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/^Bearer\s+/i, '')
      .trim();

    if (!cleanKey) return null;

    const keyMeta = inspectAdminKey();

    if (keyMeta.isMatchingAnon || keyMeta.role === 'anon') {
      console.error(
        '[SupabaseAdapter] ERROR CRÍTICO DE AUTORIZACIÓN: SUPABASE_SERVICE_ROLE_KEY tiene el rol "anon" o es idéntica a NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Debes copiar la clave secreta "service_role" desde Supabase Dashboard -> Project Settings -> API.'
      );
    }

    if (!keyMeta.isProjectMatching && keyMeta.projectRef && keyMeta.urlProjectRef) {
      console.error(
        `[SupabaseAdapter] ERROR CRÍTICO DE PROYECTO: SUPABASE_SERVICE_ROLE_KEY pertenece al proyecto "${keyMeta.projectRef}", pero NEXT_PUBLIC_SUPABASE_URL es para "${keyMeta.urlProjectRef}".`
      );
    }

    try {
      supabaseAdminClient = createClient(url, cleanKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: 'sb-admin-auth-token-isolated',
        },
        global: {
          headers: {
            apikey: cleanKey,
            Authorization: `Bearer ${cleanKey}`,
          },
        },
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

export interface PersistenceDiagnostic {
  stage: 'INITIALIZATION' | 'VALIDATION' | 'ORG_RESOLUTION' | 'PROPERTY_RESOLUTION' | 'RPC_EXECUTION' | 'ADMIN_INSERT' | 'CONFIG_CHECK';
  code: string;
  rpcAttempted?: boolean;
  rpcErrorCode?: string;
  rpcErrorMessage?: string;
  dbErrorCode?: string;
  dbErrorMessage?: string;
  adminClientConfigured?: boolean;
  resolvedOrgId?: string;
}

export class LeadPersistenceError extends Error {
  diagnostic: PersistenceDiagnostic;

  constructor(message: string, diagnostic: PersistenceDiagnostic) {
    super(message);
    this.name = 'LeadPersistenceError';
    this.diagnostic = diagnostic;
  }
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

  // ORGANIZATIONS
  static async getPublicOrganizationBySlugOrId(identifier?: string): Promise<Organization | null> {
    const targetSlugOrId = identifier || DEFAULT_ORGANIZATION.slug;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetSlugOrId);
    const supabase = getSupabaseClient();
    const adminSupabase = getSupabaseAdminClient();
    const isProduction = process.env.NODE_ENV === 'production' && !process.env.TEST_MODE && !process.env.DEMO_MODE;

    // 1. Intentar resolver mediante vista public_organizations o cliente general
    if (supabase) {
      try {
        let query = supabase.from('public_organizations').select('*');
        if (isUuid) {
          query = query.or(`id.eq.${targetSlugOrId},slug.eq.${targetSlugOrId}`);
        } else {
          query = query.eq('slug', targetSlugOrId);
        }

        const { data, error } = await query.maybeSingle();
        if (!error && data) {
          return this.mapSupabasePublicOrgToDomain(data);
        }
        if (error) {
          console.warn('[SupabaseAdapter] Query public_organizations warning:', error.message);
        }
      } catch (err) {
        console.warn('[SupabaseAdapter] Exception querying public_organizations:', err);
      }
    }

    // 2. Intentar resolver directamente en tabla organizations con cliente administrativo si está disponible
    if (adminSupabase) {
      try {
        let adminQuery = adminSupabase.from('organizations').select('*');
        if (isUuid) {
          adminQuery = adminQuery.or(`id.eq.${targetSlugOrId},slug.eq.${targetSlugOrId}`);
        } else {
          adminQuery = adminQuery.eq('slug', targetSlugOrId);
        }

        const { data: adminOrg, error: adminError } = await adminQuery.maybeSingle();
        if (!adminError && adminOrg) {
          return this.mapSupabasePublicOrgToDomain(adminOrg);
        }
      } catch (err) {
        console.warn('[SupabaseAdapter] Exception querying admin organizations:', err);
      }
    }

    // 3. Fallback a organizaciones conocidas locales
    if (KNOWN_ORGANIZATIONS[targetSlugOrId]) {
      return KNOWN_ORGANIZATIONS[targetSlugOrId];
    }

    if (isProduction) {
      return null;
    }

    return DEFAULT_ORGANIZATION;
  }

  static async getPublicProperties(
    filters?: Partial<PropertyFilters>,
    organizationId: string = DEFAULT_ORGANIZATION.id
  ): Promise<PropertyPublicView[]> {
    const supabase = getSupabaseClient();
    const isProduction = process.env.NODE_ENV === 'production' && !process.env.TEST_MODE && !process.env.DEMO_MODE;

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
        if (filters?.municipality && filters.municipality !== 'todos') {
          query = query.ilike('municipality', `%${filters.municipality}%`);
        }
        if (filters?.zone && filters.zone !== 'todas') {
          query = query.ilike('zone', `%${filters.zone}%`);
        }
        if (filters?.search) {
          query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,code.ilike.%${filters.search}%,zone.ilike.%${filters.search}%,municipality.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          return data.map(this.mapSupabasePublicPropertyToDomain);
        }
        if (error) {
          console.error('[SupabaseAdapter] Public properties query error:', error);
          if (isProduction) {
            throw new Error(`Error al consultar catálogo público en Supabase: ${error.message}`);
          }
        }
      } catch (err) {
        if (isProduction) throw err;
        console.error('[SupabaseAdapter] Fallback to ServerStore on public properties error', err);
      }
    }

    if (isProduction) {
      return [];
    }

    return ServerStore.getPublicProperties(filters, organizationId);
  }

  static async matchPropertiesForAssistant(
    criteria: {
      searchQuery?: string;
      code?: string;
      operation?: 'compra' | 'arriendo';
      propertyType?: string;
      municipality?: string;
      zone?: string;
      maxBudget?: number;
      minBedrooms?: number;
      minBathrooms?: number;
      requiredFeatures?: string[];
    },
    organizationId: string = DEFAULT_ORGANIZATION.id
  ): Promise<PropertyPublicView[]> {
    const catalog = await this.getPublicProperties({}, organizationId);
    if (!catalog || catalog.length === 0) {
      return [];
    }

    return catalog.filter((p) => {
      // 1. Direct code search (e.g. INM-585, 585)
      if (criteria.code) {
        const cleanReq = criteria.code.toUpperCase().replace(/\s+/g, '');
        const cleanProp = p.code.toUpperCase().replace(/\s+/g, '');
        if (cleanProp.includes(cleanReq) || cleanReq.includes(cleanProp)) {
          return true;
        }
      }

      // 2. Query search string matching title, code or description
      if (criteria.searchQuery) {
        const qLower = criteria.searchQuery.toLowerCase();
        if (
          p.code.toLowerCase().includes(qLower) ||
          p.title.toLowerCase().includes(qLower) ||
          p.zone.toLowerCase().includes(qLower) ||
          p.municipality.toLowerCase().includes(qLower)
        ) {
          return true;
        }
      }

      // 3. Operation match
      if (criteria.operation && p.operation !== criteria.operation) return false;

      // 4. Property type match
      if (criteria.propertyType && criteria.propertyType !== 'todos') {
        const propType = p.type.toLowerCase();
        const reqType = criteria.propertyType.toLowerCase();
        if (!propType.includes(reqType) && !reqType.includes(propType)) {
          return false;
        }
      }

      // 5. Municipality & Zone match
      if (criteria.municipality && criteria.municipality.trim() !== '') {
        const reqMun = criteria.municipality.toLowerCase();
        const munMatch = p.municipality.toLowerCase().includes(reqMun) || reqMun.includes(p.municipality.toLowerCase());
        const zoneMatch = p.zone.toLowerCase().includes(reqMun) || reqMun.includes(p.zone.toLowerCase());
        const titleMatch = p.title.toLowerCase().includes(reqMun);
        if (!munMatch && !zoneMatch && !titleMatch) return false;
      }

      if (criteria.zone && criteria.zone.trim() !== '') {
        const reqZone = criteria.zone.toLowerCase();
        const zoneMatch = p.zone.toLowerCase().includes(reqZone) ||
                          reqZone.includes(p.zone.toLowerCase()) ||
                          p.title.toLowerCase().includes(reqZone) ||
                          (p.description && p.description.toLowerCase().includes(reqZone));
        if (!zoneMatch) return false;
      }

      // 6. Budget match with 15% tolerance
      if (criteria.maxBudget && criteria.maxBudget > 0) {
        const budgetLimit = criteria.maxBudget * 1.15;
        if (p.priceCOP > budgetLimit) return false;
      }

      // 7. Bedrooms match
      if (criteria.minBedrooms && criteria.minBedrooms > 0) {
        if (p.bedrooms < criteria.minBedrooms) return false;
      }

      // 8. Bathrooms match
      if (criteria.minBathrooms && criteria.minBathrooms > 0) {
        if (p.bathrooms < criteria.minBathrooms) return false;
      }

      return true;
    }).slice(0, 5);
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

  static async createPublicLead(
    leadData: {
      organizationId: string;
      name: string;
      phone: string;
      email: string;
      operationType?: 'compra' | 'arriendo';
      propertyType?: string;
      municipality?: string;
      zone?: string;
      budget?: number;
      interestedPropertyIds?: string[];
      notes?: string;
      consentHabeasData?: boolean;
      source?: string;
    },
    clientIp = 'web'
  ): Promise<{ success: boolean; leadId?: string; isDuplicate?: boolean; message: string }> {
    const isProduction = process.env.NODE_ENV === 'production' && !process.env.TEST_MODE && !process.env.DEMO_MODE;
    const adminSupabase = getSupabaseAdminClient();

    // 1. Validaciones obligatorias de servidor
    if (!leadData.name?.trim() || !leadData.phone?.trim() || !leadData.email?.trim()) {
      throw new LeadPersistenceError(
        'Los datos de contacto (nombre, teléfono y correo electrónico) son obligatorios.',
        {
          stage: 'VALIDATION',
          code: 'ERR_REQUIRED_CONTACT_FIELDS',
          adminClientConfigured: !!adminSupabase,
        }
      );
    }
    if (leadData.consentHabeasData === false) {
      throw new LeadPersistenceError(
        'Se requiere la autorización expresa de tratamiento de datos personales (Habeas Data Ley 1581 de 2012).',
        {
          stage: 'VALIDATION',
          code: 'ERR_HABEAS_DATA_REQUIRED',
          adminClientConfigured: !!adminSupabase,
        }
      );
    }

    const cleanEmail = leadData.email.trim().toLowerCase();
    const cleanPhone = leadData.phone.trim();
    const cleanName = leadData.name.trim();

    // 2. Control estricto de producción: Rechazar si no está configurada la clave administrativa
    if (isProduction && !adminSupabase) {
      console.error('[SupabaseAdapter] ERROR CRÍTICO: SUPABASE_SERVICE_ROLE_KEY no está configurada en producción.');
      throw new LeadPersistenceError(
        'Error de configuración del servidor: Se requiere SUPABASE_SERVICE_ROLE_KEY para registrar prospectos en Supabase.',
        {
          stage: 'CONFIG_CHECK',
          code: 'CONFIG_ERROR_MISSING_SERVICE_KEY',
          adminClientConfigured: false,
        }
      );
    }

    // 3. Ejecución exclusiva de servidor con clave administrativa (SUPABASE_SERVICE_ROLE_KEY)
    if (adminSupabase) {
      // 3.1 Resolución de UUID de organización
      let resolvedOrgId = leadData.organizationId;
      const isInitialUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedOrgId);

      if (!isInitialUuid) {
        try {
          const { data: orgLookup } = await adminSupabase
            .from('organizations')
            .select('id')
            .or(`slug.eq.${resolvedOrgId},id.eq.${resolvedOrgId}`)
            .limit(1)
            .maybeSingle();

          if (orgLookup?.id) {
            resolvedOrgId = orgLookup.id;
          } else {
            const pubOrg = await this.getPublicOrganizationBySlugOrId(resolvedOrgId);
            if (pubOrg && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pubOrg.id)) {
              resolvedOrgId = pubOrg.id;
            }
          }
        } catch (orgErr) {
          console.warn('[SupabaseAdapter] Error resolving organization UUID:', orgErr);
        }
      }

      const isResolvedUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedOrgId);
      if (!isResolvedUuid && isProduction) {
        throw new LeadPersistenceError(
          `La organización receptora "${leadData.organizationId}" no pudo ser validada como UUID en Supabase.`,
          {
            stage: 'ORG_RESOLUTION',
            code: 'ERR_INVALID_ORG_UUID',
            adminClientConfigured: true,
            resolvedOrgId,
          }
        );
      }

      // 3.2 Resolución y verificación de inmuebles de interés (mapeo código -> UUID)
      const rawPropertyRefs = Array.isArray(leadData.interestedPropertyIds) ? leadData.interestedPropertyIds : [];
      const resolvedPropertyUuids: string[] = [];
      const verifiedPropertyCodes: string[] = [];

      for (const ref of rawPropertyRefs) {
        const cleanRef = String(ref).trim();
        if (!cleanRef) continue;

        const isRefUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanRef);
        if (isRefUuid) {
          resolvedPropertyUuids.push(cleanRef);
          verifiedPropertyCodes.push(cleanRef);
        } else {
          try {
            const { data: propData } = await adminSupabase
              .from('properties')
              .select('id, code')
              .eq('organization_id', resolvedOrgId)
              .or(`code.ilike.${cleanRef},code.eq.${cleanRef}`)
              .limit(1)
              .maybeSingle();

            if (propData) {
              resolvedPropertyUuids.push(propData.id);
              verifiedPropertyCodes.push(propData.code);
            } else {
              verifiedPropertyCodes.push(cleanRef);
            }
          } catch (propErr) {
            verifiedPropertyCodes.push(cleanRef);
          }
        }
      }

      // Ejecución exclusiva transaccional mediante capture_public_lead con privilegios de service_role
      const { data: rpcData, error: rpcError } = await adminSupabase.rpc('capture_public_lead', {
        p_organization_id: resolvedOrgId,
        p_name: cleanName,
        p_phone: cleanPhone,
        p_email: cleanEmail,
        p_operation_type: leadData.operationType || 'compra',
        p_property_type: leadData.propertyType || 'apartamento',
        p_municipality: leadData.municipality || 'Medellín',
        p_zone: leadData.zone || 'El Poblado',
        p_budget: Number(leadData.budget) || 0,
        p_interested_property_ids: verifiedPropertyCodes.length > 0 ? verifiedPropertyCodes : rawPropertyRefs,
        p_notes: leadData.notes || '',
        p_consent_habeas_data: true,
        p_source: leadData.source || 'asistente_ia',
        p_client_ip: clientIp,
      });

      if (!rpcError && rpcData && typeof rpcData === 'object') {
        return {
          success: rpcData.success ?? true,
          leadId: rpcData.lead_id,
          isDuplicate: rpcData.is_duplicate,
          message: rpcData.message || 'Prospecto registrado exitosamente en Supabase.',
        };
      }

      if (rpcError) {
        console.error(`[SupabaseAdapter] RPC capture_public_lead failed [${rpcError.code}]:`, rpcError.message);
        throw new LeadPersistenceError(
          `Error en Supabase al registrar prospecto: ${rpcError.message}`,
          {
            stage: 'RPC_EXECUTION',
            code: rpcError.code ? `PG_${rpcError.code}` : 'ERR_RPC_EXECUTION',
            dbErrorCode: rpcError.code,
            dbErrorMessage: rpcError.message,
            rpcAttempted: true,
            rpcErrorCode: rpcError.code,
            rpcErrorMessage: rpcError.message,
            adminClientConfigured: true,
            resolvedOrgId,
          }
        );
      }
    }

    // 4. Modo desarrollo local / demostración en memoria explícita (NO PRODUCCIÓN)
    const existingMemoryLead = await ServerStore.findDuplicateLead(cleanEmail, cleanPhone, leadData.organizationId);
    if (existingMemoryLead) {
      await ServerStore.addLeadActivity(
        existingMemoryLead.id,
        `Nueva solicitud registrada desde ${leadData.source || 'asistente_ia'}. Inmuebles: ${(leadData.interestedPropertyIds || []).join(', ') || 'Búsqueda general'}. Notas: ${leadData.notes || 'Consulta web recurrente'}`,
        'contact_attempt',
        'Asistente SofIA'
      );
      return {
        success: true,
        leadId: existingMemoryLead.id,
        isDuplicate: true,
        message: 'Solicitud actualizada para el prospecto existente en memoria local (Modo Demo).',
      };
    }

    const memoryLead = await ServerStore.createLead({
      organizationId: leadData.organizationId,
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      operationType: leadData.operationType || 'compra',
      propertyType: (leadData.propertyType as any) || 'apartamento',
      municipality: leadData.municipality || 'Medellín',
      zone: leadData.zone || 'El Poblado',
      budget: Number(leadData.budget) || 0,
      currency: 'COP',
      desiredFeatures: [],
      interestedPropertyIds: leadData.interestedPropertyIds || [],
      notes: leadData.notes || '',
      status: 'nuevo',
      priority: 'alto',
      source: (leadData.source as any) || 'asistente_ia',
      consentHabeasData: true,
    });

    return {
      success: true,
      leadId: memoryLead.id,
      isDuplicate: false,
      message: 'Prospecto registrado exitosamente en memoria local (Modo Demo).',
    };
  }

  static async createLead(leadData: CreateLeadInput, authToken?: string): Promise<Lead> {
    const isProduction = process.env.NODE_ENV === 'production' && !process.env.TEST_MODE && !process.env.DEMO_MODE;
    const targetOrgId = leadData.organizationId || DEFAULT_ORGANIZATION.id;
    const payloadWithDefaults = {
      ...leadData,
      organizationId: targetOrgId,
      currency: leadData.currency || 'COP',
    };

    // If authenticated: use authenticated user client with JWT
    if (authToken) {
      const userSupabase = getSupabaseUserClient(authToken);
      if (userSupabase) {
        const payload = this.mapDomainLeadToSupabase(payloadWithDefaults);
        const { data, error } = await userSupabase
          .from('leads')
          .insert(payload)
          .select()
          .single();
        if (error) {
          console.error('[SupabaseAdapter] Create lead error for authenticated user:', error);
          throw new Error(`Error al registrar prospecto en Supabase: ${error.message}`);
        }
        if (data) {
          if (leadData.notes) {
            await userSupabase.from('lead_activities').insert({
              lead_id: data.id,
              description: `Prospecto registrado: ${leadData.notes}`,
              type: 'created',
              author: leadData.assignedAgent || 'Asesor',
            });
          }
          return this.mapSupabaseLeadToDomain({ ...data, lead_activities: [] });
        }
      }
    }

    // If admin key available: use admin client
    const adminSupabase = getSupabaseAdminClient();
    if (adminSupabase) {
      const payload = this.mapDomainLeadToSupabase(payloadWithDefaults);
      const { data, error } = await adminSupabase
        .from('leads')
        .insert(payload)
        .select()
        .single();
      if (error) {
        console.error('[SupabaseAdapter] Create lead error with admin client:', error);
        throw new Error(`Error al registrar prospecto en Supabase: ${error.message}`);
      }
      if (data) {
        if (leadData.notes) {
          await adminSupabase.from('lead_activities').insert({
            lead_id: data.id,
            description: `Prospecto registrado: ${leadData.notes}`,
            type: 'created',
            author: leadData.assignedAgent || 'Sistema',
          });
        }
        return this.mapSupabaseLeadToDomain({ ...data, lead_activities: [] });
      }
    }

    // If unauthenticated public request: route through secure createPublicLead
    if (!authToken) {
      const publicResult = await this.createPublicLead({
        organizationId: targetOrgId,
        name: leadData.name,
        phone: leadData.phone,
        email: leadData.email,
        operationType: leadData.operationType,
        propertyType: leadData.propertyType,
        municipality: leadData.municipality,
        zone: leadData.zone,
        budget: leadData.budget,
        interestedPropertyIds: leadData.interestedPropertyIds,
        notes: leadData.notes,
        consentHabeasData: leadData.consentHabeasData,
        source: leadData.source,
      });

      return {
        id: publicResult.leadId || `lead-${Date.now()}`,
        organizationId: targetOrgId,
        name: leadData.name,
        phone: leadData.phone,
        email: leadData.email,
        operationType: leadData.operationType || 'compra',
        propertyType: leadData.propertyType || 'apartamento',
        municipality: leadData.municipality || 'Medellín',
        zone: leadData.zone || 'El Poblado',
        budget: leadData.budget || 0,
        currency: 'COP',
        desiredFeatures: [],
        interestedPropertyIds: leadData.interestedPropertyIds || [],
        notes: leadData.notes || '',
        status: 'nuevo',
        priority: 'alto',
        activities: [],
        source: (leadData.source as any) || 'asistente_ia',
        consentHabeasData: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
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

  private static mapSupabasePublicOrgToDomain(row: any): Organization {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      phone: row.phone || '+57 304 360 5155',
      email: row.email || 'contacto@inmobiliaria.com',
      city: row.city || 'Medellín',
      logoUrl: row.logo_url || undefined,
      currency: row.currency || 'COP',
      aiAssistantName: row.ai_assistant_name || 'SofIA Inmobiliaria',
      aiAssistantWelcomeMessage: row.ai_assistant_welcome_message || `¡Hola! Soy SofIA, tu asesora inmobiliaria virtual de ${row.name}. 👋\n\n¿Estás buscando comprar o arrendar una propiedad? Cuéntame qué tipo de inmueble buscas, la zona de tu preferencia y tu presupuesto aproximado.`,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }
}
