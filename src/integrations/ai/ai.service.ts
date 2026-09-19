import { AIQualificationRequest, AIQualificationResult, IAIService } from './ai.interface';

/**
 * AI Lead Qualification Service Stub
 * Prepared for plug-and-play integration with OpenAI, Gemini, or Claude APIs.
 */
export class AIService implements IAIService {
  async qualifyLead(request: AIQualificationRequest): Promise<AIQualificationResult> {
    // Stub heuristic analyzer
    const text = request.leadText.toLowerCase();
    
    let score = 50;
    let urgency: AIQualificationResult['extractedData']['urgencyLevel'] = '1_3_meses';

    if (text.includes('urgente') || text.includes('inmediato') || text.includes('comprar ya')) {
      score += 35;
      urgency = 'inmediata';
    } else if (text.includes('preaprobado') || text.includes('contado') || text.includes('efectivo')) {
      score += 25;
    }

    const priority = score >= 75 ? 'alto' : score >= 50 ? 'medio' : 'bajo';

    return {
      score,
      recommendedPriority: priority,
      extractedData: {
        urgencyLevel: urgency,
      },
      keyInsights: [
        'Análisis semántico preliminar completado.',
        'Presupuesto y requerimientos alineados con el catálogo de propiedades.',
      ],
      suggestedAction: 'Programar llamada de presentación y enviar catálogo curado.',
      confidence: 0.92,
    };
  }

  async generateFollowUpMessage(leadName: string, propertyType: string, zone: string): Promise<string> {
    return `Hola ${leadName}, gusto en saludarte. Vemos tu interés en opciones de ${propertyType} en la zona de ${zone}. Tenemos 3 propiedades exclusivas con esas características disponibles para visita esta semana. ¿Te gustaría conocer los detalles?`;
  }
}

export const aiService = new AIService();
