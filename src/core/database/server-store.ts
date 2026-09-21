import fs from 'fs';
import path from 'path';
import { Property, PropertyFilters, PropertyPublicView, CreatePropertyInput } from '../types/property';
import { Lead, LeadFilters, LeadStats, CreateLeadInput } from '../types/lead';
import { Organization, DEFAULT_ORGANIZATION } from '../types/organization';
import { INITIAL_PROPERTIES } from '../repositories/mock-properties';
import { INITIAL_LEADS } from '../repositories/mock-data';

interface DatabaseSchema {
  organizations: Organization[];
  properties: Property[];
  leads: Lead[];
}

let inMemoryDb: DatabaseSchema | null = null;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDatabaseFile(): DatabaseSchema {
  const initialDb: DatabaseSchema = {
    organizations: [DEFAULT_ORGANIZATION],
    properties: INITIAL_PROPERTIES,
    leads: INITIAL_LEADS,
  };

  try {
    if (process.env.VERCEL) {
      if (!inMemoryDb) inMemoryDb = initialDb;
      return inMemoryDb;
    }

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      inMemoryDb = initialDb;
      return inMemoryDb;
    }

    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(content);

    if (!parsed.properties || parsed.properties.length === 0) {
      parsed.properties = INITIAL_PROPERTIES;
    } else {
      for (const initProp of INITIAL_PROPERTIES) {
        if (!parsed.properties.some((p: Property) => p.code === initProp.code)) {
          parsed.properties.push(initProp);
        }
      }
    }
    if (!parsed.leads || parsed.leads.length === 0) {
      parsed.leads = INITIAL_LEADS;
    }
    if (!parsed.organizations || parsed.organizations.length === 0) {
      parsed.organizations = [DEFAULT_ORGANIZATION];
    }

    inMemoryDb = parsed;
    return parsed;
  } catch (error) {
    if (!inMemoryDb) inMemoryDb = initialDb;
    return inMemoryDb;
  }
}

function saveDatabaseFile(data: DatabaseSchema): void {
  inMemoryDb = data;
  if (process.env.VERCEL) {
    return;
  }
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    // Read-only filesystem
  }
}

export class ServerStore {
  // PROPERTIES
  static getProperties(filters?: Partial<PropertyFilters>, organizationId: string = DEFAULT_ORGANIZATION.id): Property[] {
    const db = ensureDatabaseFile();
    let list = db.properties.filter((p) => {
      if (!organizationId) return true;
      if (p.organizationId === organizationId) return true;
      if (organizationId === 'inmo-piloto-default' || organizationId === 'inmo-piloto' || organizationId === 'org_inmo_premier_001') {
        return true;
      }
      return false;
    });

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

  static getPublicProperties(filters?: Partial<PropertyFilters>, organizationId: string = DEFAULT_ORGANIZATION.id): PropertyPublicView[] {
    const raw = this.getProperties({ ...filters, status: 'disponible' }, organizationId);
    // Sanitize private address and agent phone
    return raw.map((p) => ({
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

  static getPropertyById(id: string): Property | null {
    const db = ensureDatabaseFile();
    const found = db.properties.find((p) => p.id === id);
    return found ? { ...found } : null;
  }

  static getPropertyByCode(code: string, organizationId: string = DEFAULT_ORGANIZATION.id): Property | null {
    const db = ensureDatabaseFile();
    const found = db.properties.find(
      (p) => p.code.toLowerCase() === code.toLowerCase().trim() && p.organizationId === organizationId
    );
    return found ? { ...found } : null;
  }

  static createProperty(propertyData: CreatePropertyInput): Property {
    const db = ensureDatabaseFile();
    const now = new Date().toISOString();
    const newId = `prop-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newProp: Property = {
      id: newId,
      organizationId: propertyData.organizationId || DEFAULT_ORGANIZATION.id,
      code: propertyData.code,
      title: propertyData.title,
      description: propertyData.description || '',
      type: propertyData.type,
      operation: propertyData.operation,
      municipality: propertyData.municipality,
      zone: propertyData.zone,
      internalAddress: propertyData.internalAddress || 'Sin dirección interna especificada',
      priceCOP: propertyData.priceCOP,
      adminFeeCOP: propertyData.adminFeeCOP || 0,
      areaM2: propertyData.areaM2,
      bedrooms: propertyData.bedrooms,
      bathrooms: propertyData.bathrooms,
      parkingSpots: propertyData.parkingSpots || 0,
      stratum: propertyData.stratum || 4,
      features: propertyData.features || [],
      images: propertyData.images && propertyData.images.length > 0 ? propertyData.images : [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
      ],
      status: propertyData.status || 'disponible',
      assignedAgent: propertyData.assignedAgent || 'Laura Gómez',
      featured: propertyData.featured || false,
      createdAt: now,
      updatedAt: now,
    };

    db.properties.unshift(newProp);
    saveDatabaseFile(db);
    return newProp;
  }

  static updateProperty(id: string, updates: Partial<Property>): Property {
    const db = ensureDatabaseFile();
    const index = db.properties.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Inmueble con ID ${id} no encontrado.`);
    }

    const current = db.properties[index];
    const updated: Property = {
      ...current,
      ...updates,
      id: current.id,
      organizationId: current.organizationId,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };

    db.properties[index] = updated;
    saveDatabaseFile(db);
    return updated;
  }

  static deleteProperty(id: string): boolean {
    const db = ensureDatabaseFile();
    const originalLen = db.properties.length;
    db.properties = db.properties.filter((p) => p.id !== id);
    if (db.properties.length !== originalLen) {
      saveDatabaseFile(db);
      return true;
    }
    return false;
  }

  // LEADS
  static getLeads(filters?: Partial<LeadFilters>, organizationId: string = DEFAULT_ORGANIZATION.id): Lead[] {
    const db = ensureDatabaseFile();
    let list = db.leads.filter((l) => !organizationId || l.organizationId === organizationId);

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
        const priorityOrder: Record<string, number> = { alto: 3, medio: 2, bajo: 1 };
        return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
      }
      return 0;
    });

    return list;
  }

  static getLeadById(id: string): Lead | null {
    const db = ensureDatabaseFile();
    const found = db.leads.find((l) => l.id === id);
    return found ? { ...found } : null;
  }

  static findDuplicateLead(email: string, phone: string, organizationId: string = DEFAULT_ORGANIZATION.id): Lead | null {
    const db = ensureDatabaseFile();
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const cleanEmail = email.toLowerCase().trim();

    const duplicate = db.leads.find((l) => {
      if (l.organizationId !== organizationId) return false;
      const lPhone = l.phone.replace(/[^0-9]/g, '');
      const lEmail = l.email.toLowerCase().trim();
      return (cleanEmail && lEmail === cleanEmail) || (cleanPhone && cleanPhone.length > 7 && lPhone.includes(cleanPhone));
    });

    return duplicate || null;
  }

  static createLead(leadData: CreateLeadInput): Lead {
    const db = ensureDatabaseFile();
    const now = new Date().toISOString();
    const newId = `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const initialActivity = {
      id: `act-${Date.now()}`,
      type: 'created' as const,
      description: leadData.source === 'asistente_ia'
        ? 'Prospecto captado automáticamente por el Asistente Web IA con autorización de datos.'
        : leadData.source === 'landing_demo'
        ? 'Solicitud de demostración comercial desde la Landing Page.'
        : 'Prospecto registrado exitosamente en el CRM.',
      createdAt: now,
      author: leadData.source === 'asistente_ia' ? 'SofIA Asistente' : 'Sistema',
    };

    const newLead: Lead = {
      id: newId,
      organizationId: leadData.organizationId || DEFAULT_ORGANIZATION.id,
      name: leadData.name,
      phone: leadData.phone,
      email: leadData.email,
      operationType: leadData.operationType,
      propertyType: leadData.propertyType,
      municipality: leadData.municipality || 'Medellín',
      zone: leadData.zone,
      budget: leadData.budget,
      minBudget: leadData.minBudget,
      maxBudget: leadData.maxBudget,
      currency: leadData.currency || 'COP',
      desiredFeatures: leadData.desiredFeatures || [],
      interestedPropertyIds: leadData.interestedPropertyIds || [],
      notes: leadData.notes || '',
      status: leadData.status || 'nuevo',
      priority: leadData.priority || 'medio',
      source: leadData.source || 'manual',
      assignedAgent: leadData.assignedAgent || 'Laura Gómez',
      consentHabeasData: leadData.consentHabeasData !== false,
      activities: [initialActivity],
      createdAt: now,
      updatedAt: now,
    };

    db.leads.unshift(newLead);
    saveDatabaseFile(db);
    return newLead;
  }

  static updateLead(id: string, updates: Partial<Lead>): Lead {
    const db = ensureDatabaseFile();
    const index = db.leads.findIndex((l) => l.id === id);
    if (index === -1) {
      throw new Error(`Prospecto con ID ${id} no encontrado.`);
    }

    const current = db.leads[index];
    const updated: Lead = {
      ...current,
      ...updates,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };

    db.leads[index] = updated;
    saveDatabaseFile(db);
    return updated;
  }

  static addLeadActivity(leadId: string, description: string, type: any = 'note_added', author = 'Asesor'): Lead {
    const db = ensureDatabaseFile();
    const index = db.leads.findIndex((l) => l.id === leadId);
    if (index === -1) {
      throw new Error(`Prospecto con ID ${leadId} no encontrado.`);
    }

    const current = db.leads[index];
    const newAct = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      type,
      description,
      createdAt: new Date().toISOString(),
      author,
    };

    const updated: Lead = {
      ...current,
      activities: [newAct, ...(current.activities || [])],
      updatedAt: new Date().toISOString(),
    };

    db.leads[index] = updated;
    saveDatabaseFile(db);
    return updated;
  }

  static deleteLead(id: string): boolean {
    const db = ensureDatabaseFile();
    const originalLen = db.leads.length;
    db.leads = db.leads.filter((l) => l.id !== id);
    if (db.leads.length !== originalLen) {
      saveDatabaseFile(db);
      return true;
    }
    return false;
  }

  static getStats(organizationId: string = DEFAULT_ORGANIZATION.id): LeadStats {
    const leads = this.getLeads({}, organizationId);

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
    const initialDb: DatabaseSchema = {
      organizations: [DEFAULT_ORGANIZATION],
      properties: INITIAL_PROPERTIES,
      leads: INITIAL_LEADS,
    };
    saveDatabaseFile(initialDb);
  }
}
