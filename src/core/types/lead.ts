export type { OperationType, PropertyType } from './property';
import type { OperationType, PropertyType } from './property';

export type LeadStatus =
  | 'nuevo'
  | 'contactado'
  | 'interesado'
  | 'visita_agendada'
  | 'negociacion'
  | 'cerrado'
  | 'no_interesado';

export type LeadPriority = 'alto' | 'medio' | 'bajo';

export interface LeadActivity {
  id: string;
  type: 'status_change' | 'note_added' | 'priority_change' | 'contact_attempt' | 'visit_scheduled' | 'created';
  description: string;
  createdAt: string;
  author: string;
}

export interface CreateLeadInput {
  organizationId?: string;
  name: string;
  phone: string;
  email: string;
  operationType: OperationType;
  propertyType: PropertyType;
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
}

export interface Lead {
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  email: string;
  operationType: OperationType;
  propertyType: PropertyType;
  municipality: string; // e.g. "Medellín", "Bogotá", "Envigado"
  zone: string;
  budget: number; // Principal / Max budget COP
  minBudget?: number;
  maxBudget?: number;
  currency: string;
  desiredFeatures?: string[];
  interestedPropertyIds?: string[];
  notes: string;
  status: LeadStatus;
  priority: LeadPriority;
  activities: LeadActivity[];
  source: 'web_form' | 'asistente_ia' | 'whatsapp' | 'portal_inmobiliario' | 'landing_demo' | 'manual' | 'referido';
  assignedAgent?: string;
  consentHabeasData: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadFilters {
  search: string;
  status: LeadStatus | 'todos';
  priority: LeadPriority | 'todos';
  operationType: OperationType | 'todos';
  propertyType: PropertyType | 'todos';
  municipality?: string;
  zone: string;
  minBudget?: number;
  maxBudget?: number;
  assignedAgent?: string;
  sortBy: 'date_desc' | 'date_asc' | 'budget_desc' | 'budget_asc' | 'priority';
}

export interface LeadStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  byPriority: Record<LeadPriority, number>;
  byOperation: Record<OperationType, number>;
  conversionRate: number;
  totalPipelineValue: number;
  highPriorityCount: number;
  newLeadsCount: number;
  scheduledVisitsCount: number;
  closedDealsCount: number;
  pendingOpportunitiesCount: number;
}
