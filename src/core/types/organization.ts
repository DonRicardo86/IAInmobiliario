export interface Organization {
  id: string;
  name: string;
  slug: string;
  nit?: string;
  phone: string;
  email: string;
  city: string;
  address?: string;
  logoUrl?: string;
  currency: string;
  aiAssistantName: string;
  aiAssistantWelcomeMessage: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_ORGANIZATION: Organization = {
  id: 'org_inmo_premier_001',
  name: 'Inmobiliaria Premier Colombia',
  slug: 'inmo-premier',
  nit: '901.458.789-2',
  phone: '+57 300 912 3456',
  email: 'contacto@inmobiliariapremier.com.co',
  city: 'Medellín',
  address: 'Cra 43A # 1-50, San Fernando Plaza, El Poblado',
  currency: 'COP',
  aiAssistantName: 'SofIA Inmobiliaria',
  aiAssistantWelcomeMessage: '¡Hola! Soy SofIA, tu asesora inmobiliaria virtual. ¿Estás buscando comprar o arrendar una propiedad?',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-09-19T00:00:00Z',
};
