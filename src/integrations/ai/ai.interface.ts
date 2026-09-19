import { LeadPriority, OperationType, PropertyType } from '@/core/types/lead';

export interface AIQualificationRequest {
  leadText: string;
  sourceContext?: string;
}

export interface AIQualificationResult {
  score: number; // 0 - 100
  recommendedPriority: LeadPriority;
  extractedData: {
    name?: string;
    phone?: string;
    email?: string;
    operationType?: OperationType;
    propertyType?: PropertyType;
    zone?: string;
    budgetEstimate?: number;
    urgencyLevel: 'inmediata' | '1_3_meses' | 'mas_3_meses' | 'exploratoria';
  };
  keyInsights: string[];
  suggestedAction: string;
  confidence: number;
}

export interface IAIService {
  qualifyLead(request: AIQualificationRequest): Promise<AIQualificationResult>;
  generateFollowUpMessage(leadName: string, propertyType: string, zone: string): Promise<string>;
}
