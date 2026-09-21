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

export const DEMO_ORGANIZATION: Organization = {
  id: 'org_inmo_premier_001',
  name: 'Inmobiliaria Premier (Demostración)',
  slug: 'inmo-premier-demo',
  nit: '901.458.789-2',
  phone: '+57 304 360 5155',
  email: 'agenteinmobiliaria1986@gmail.com',
  city: 'Medellín',
  address: 'Cra 43A # 1-50, San Fernando Plaza, El Poblado',
  currency: 'COP',
  aiAssistantName: 'SofIA Inmobiliaria',
  aiAssistantWelcomeMessage: '¡Hola! Soy SofIA, tu asesora inmobiliaria virtual. ¿Estás buscando comprar o arrendar una propiedad?',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-09-21T00:00:00Z',
};

export const COMMERCIAL_ORGANIZATION: Organization = {
  id: 'org_cardona_real_002',
  name: 'Inmobiliaria Cardona & Asociados',
  slug: 'inmo-cardona-real',
  nit: '900.876.543-1',
  phone: '+57 304 360 5155',
  email: 'agenteinmobiliaria1986@gmail.com',
  city: 'Medellín',
  address: 'Calle 10 # 32-15, Provenza, El Poblado',
  currency: 'COP',
  aiAssistantName: 'SofIA Cardona',
  aiAssistantWelcomeMessage: '¡Hola! Soy SofIA de Inmobiliaria Cardona & Asociados. ¿En qué zona de Medellín o el Oriente deseas invertir?',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-21T00:00:00Z',
};

export const PILOT_ORGANIZATION: Organization = {
  id: 'inmo-piloto-default',
  name: 'Inmobiliaria Piloto',
  slug: 'inmo-piloto',
  nit: '901.987.654-3',
  phone: '+57 304 360 5155',
  email: 'contacto@inmobiliariapiloto.com',
  city: 'Medellín',
  address: 'Medellín, Antioquia, Colombia',
  currency: 'COP',
  aiAssistantName: 'SofIA Inmobiliaria',
  aiAssistantWelcomeMessage: '¡Hola! Soy SofIA, tu asesora inmobiliaria virtual de Inmobiliaria Piloto en Medellín y el Área Metropolitana. 👋\n\n¿Estás buscando comprar o arrendar una propiedad? Cuéntame qué tipo de inmueble buscas, la zona de tu preferencia y tu presupuesto aproximado.',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-21T00:00:00Z',
};

export const DEFAULT_ORGANIZATION = PILOT_ORGANIZATION;

export const KNOWN_ORGANIZATIONS: Record<string, Organization> = {
  [PILOT_ORGANIZATION.id]: PILOT_ORGANIZATION,
  [PILOT_ORGANIZATION.slug]: PILOT_ORGANIZATION,
  [DEMO_ORGANIZATION.id]: DEMO_ORGANIZATION,
  [DEMO_ORGANIZATION.slug]: DEMO_ORGANIZATION,
  [COMMERCIAL_ORGANIZATION.id]: COMMERCIAL_ORGANIZATION,
  [COMMERCIAL_ORGANIZATION.slug]: COMMERCIAL_ORGANIZATION,
};

export function getOrganizationById(id?: string): Organization {
  if (!id) return DEFAULT_ORGANIZATION;
  return KNOWN_ORGANIZATIONS[id] || {
    ...DEFAULT_ORGANIZATION,
    id,
    name: `Inmobiliaria ${id.slice(-6)}`,
  };
}

export function getOrganizationBySlug(slug?: string): Organization {
  if (!slug) return DEFAULT_ORGANIZATION;
  return KNOWN_ORGANIZATIONS[slug] || getOrganizationById(slug);
}
