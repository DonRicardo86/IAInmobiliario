-- ==============================================================================
-- IA_Inmobiliaria: Supabase PostgreSQL Schema & Row Level Security (RLS)
-- Multi-Tenant SaaS Architecture for Colombian Real Estate Agencies
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZATIONS (Real Estate Agencies)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    nit VARCHAR(50),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT,
    logo_url TEXT,
    currency VARCHAR(10) DEFAULT 'COP',
    ai_assistant_name VARCHAR(100) DEFAULT 'SofIA Inmobiliaria',
    ai_assistant_welcome_message TEXT DEFAULT '¡Hola! Soy tu asistente virtual inmobiliario. ¿Buscas comprar o arrendar una propiedad?',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROPERTIES (Inventory)
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('apartamento', 'casa', 'penthouse', 'oficina', 'local', 'lote', 'bodega', 'finca', 'otro')),
    operation VARCHAR(50) NOT NULL CHECK (operation IN ('compra', 'arriendo')),
    municipality VARCHAR(100) NOT NULL,
    zone VARCHAR(100) NOT NULL,
    internal_address TEXT NOT NULL, -- Private internal address for CRM only
    price_cop NUMERIC(15, 2) NOT NULL,
    admin_fee_cop NUMERIC(15, 2) DEFAULT 0,
    area_m2 NUMERIC(10, 2) NOT NULL,
    bedrooms INT DEFAULT 0,
    bathrooms INT DEFAULT 0,
    parking_spots INT DEFAULT 0,
    stratum INT CHECK (stratum BETWEEN 1 AND 6),
    features TEXT[] DEFAULT '{}',
    images TEXT[] DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible', 'reservado', 'vendido', 'arrendado')),
    assigned_agent VARCHAR(150) DEFAULT 'Sin Asignar',
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_org_property_code UNIQUE (organization_id, code)
);

-- 3. LEADS (Prospects)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('compra', 'arriendo')),
    property_type VARCHAR(50) NOT NULL,
    municipality VARCHAR(100) NOT NULL,
    zone VARCHAR(100) NOT NULL,
    budget NUMERIC(15, 2) NOT NULL,
    min_budget NUMERIC(15, 2),
    max_budget NUMERIC(15, 2),
    currency VARCHAR(10) DEFAULT 'COP',
    desired_features TEXT[] DEFAULT '{}',
    interested_property_ids UUID[] DEFAULT '{}',
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'nuevo' CHECK (status IN ('nuevo', 'contactado', 'interesado', 'visita_agendada', 'negociacion', 'cerrado', 'no_interesado')),
    priority VARCHAR(50) NOT NULL DEFAULT 'medio' CHECK (priority IN ('alto', 'medio', 'bajo')),
    source VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (source IN ('web_form', 'asistente_ia', 'whatsapp', 'portal_inmobiliario', 'landing_demo', 'manual', 'referido')),
    assigned_agent VARCHAR(150) DEFAULT 'Sin Asignar',
    consent_habeas_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. LEAD ACTIVITIES (Timeline and Follow-ups)
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('status_change', 'note_added', 'priority_change', 'contact_attempt', 'visit_scheduled', 'created')),
    description TEXT NOT NULL,
    author VARCHAR(150) NOT NULL DEFAULT 'Sistema',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR HIGH QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_properties_org ON public.properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_properties_search ON public.properties(operation, type, status, municipality, price_cop);
CREATE INDEX IF NOT EXISTS idx_leads_org ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_status_priority ON public.leads(status, priority);
CREATE INDEX IF NOT EXISTS idx_leads_search ON public.leads(email, phone, municipality);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON public.lead_activities(lead_id);

-- ==============================================================================
-- PUBLIC SANITIZED VIEW (Hides internal address from public clients)
-- ==============================================================================
CREATE OR REPLACE VIEW public.public_properties AS
SELECT
    id,
    organization_id,
    code,
    title,
    description,
    type,
    operation,
    municipality,
    zone,
    price_cop,
    admin_fee_cop,
    area_m2,
    bedrooms,
    bathrooms,
    parking_spots,
    stratum,
    features,
    images,
    status,
    featured,
    created_at
FROM public.properties
WHERE status = 'disponible';

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- Helper function to extract user's organization from auth metadata
CREATE OR REPLACE FUNCTION auth.get_user_organization_id()
RETURNS UUID AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'organization_id', '')::UUID;
$$ LANGUAGE SQL STABLE;

-- 1. Properties RLS
-- Public can view available properties
CREATE POLICY "Public can view available properties"
ON public.properties FOR SELECT
USING (status = 'disponible');

-- Authenticated organization members can CRUD only their own properties
CREATE POLICY "Org members can view all their properties"
ON public.properties FOR SELECT
TO authenticated
USING (organization_id = auth.get_user_organization_id());

CREATE POLICY "Org members can insert properties"
ON public.properties FOR INSERT
TO authenticated
WITH CHECK (organization_id = auth.get_user_organization_id());

CREATE POLICY "Org members can update their properties"
ON public.properties FOR UPDATE
TO authenticated
USING (organization_id = auth.get_user_organization_id());

CREATE POLICY "Org members can delete their properties"
ON public.properties FOR DELETE
TO authenticated
USING (organization_id = auth.get_user_organization_id());

-- 2. Leads RLS
-- Public users (AI assistant, web forms) can INSERT leads with data consent
CREATE POLICY "Public can insert lead with habeas data consent"
ON public.leads FOR INSERT
WITH CHECK (consent_habeas_data = true);

-- Authenticated organization members can CRUD only their own leads
CREATE POLICY "Org members can view their leads"
ON public.leads FOR SELECT
TO authenticated
USING (organization_id = auth.get_user_organization_id());

CREATE POLICY "Org members can update their leads"
ON public.leads FOR UPDATE
TO authenticated
USING (organization_id = auth.get_user_organization_id());

CREATE POLICY "Org members can delete their leads"
ON public.leads FOR DELETE
TO authenticated
USING (organization_id = auth.get_user_organization_id());

-- 3. Lead Activities RLS
CREATE POLICY "Org members can view lead activities"
ON public.lead_activities FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_activities.lead_id
    AND leads.organization_id = auth.get_user_organization_id()
));

CREATE POLICY "Org members can insert lead activities"
ON public.lead_activities FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_activities.lead_id
    AND leads.organization_id = auth.get_user_organization_id()
));
