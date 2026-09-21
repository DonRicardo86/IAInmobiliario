-- ==============================================================================
-- IA_INMOBILIARIA: ESQUEMA POSTGRESQL Y ROW LEVEL SECURITY (RLS) PARA SUPABASE
-- Arquitectura SaaS Multi-Tenant para Inmobiliarias Colombianas
-- ==============================================================================

-- 0. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABLA: ORGANIZACIONES (Inmobiliarias)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ==============================================================================
-- 2. TABLA: MIEMBROS DE ORGANIZACIÓN (Vínculo con Supabase Auth)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'agent' CHECK (role IN ('owner', 'admin', 'agent', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_org_user UNIQUE (organization_id, user_id)
);

-- ==============================================================================
-- 3. TABLA: PROPIEDADES / INVENTARIO
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('apartamento', 'casa', 'penthouse', 'oficina', 'local', 'lote', 'bodega', 'finca', 'otro')),
    operation VARCHAR(50) NOT NULL CHECK (operation IN ('compra', 'arriendo')),
    municipality VARCHAR(100) NOT NULL,
    zone VARCHAR(100) NOT NULL,
    internal_address TEXT NOT NULL, -- Dirección privada interna (Solo CRM administrativo)
    price_cop NUMERIC(15, 2) NOT NULL CHECK (price_cop >= 0),
    admin_fee_cop NUMERIC(15, 2) DEFAULT 0 CHECK (admin_fee_cop >= 0),
    area_m2 NUMERIC(10, 2) NOT NULL CHECK (area_m2 >= 0),
    bedrooms INT DEFAULT 0 CHECK (bedrooms >= 0),
    bathrooms INT DEFAULT 0 CHECK (bathrooms >= 0),
    parking_spots INT DEFAULT 0 CHECK (parking_spots >= 0),
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

-- ==============================================================================
-- 4. TABLA: PROSPECTOS / LEADS (CRM Comercial)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('compra', 'arriendo')),
    property_type VARCHAR(50) NOT NULL,
    municipality VARCHAR(100) NOT NULL,
    zone VARCHAR(100) NOT NULL,
    budget NUMERIC(15, 2) NOT NULL CHECK (budget >= 0),
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

-- ==============================================================================
-- 5. TABLA: ACTIVIDADES Y SEGUIMIENTO DE PROSPECTOS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('status_change', 'note_added', 'priority_change', 'contact_attempt', 'visit_scheduled', 'created')),
    description TEXT NOT NULL,
    author VARCHAR(150) NOT NULL DEFAULT 'Sistema',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. ÍNDICES DE ALTO RENDIMIENTO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_properties_org ON public.properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_search ON public.properties(organization_id, operation, type, status, municipality, price_cop);
CREATE INDEX IF NOT EXISTS idx_leads_org ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_status_priority ON public.leads(organization_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_leads_contact_search ON public.leads(organization_id, email, phone);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON public.lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);

-- ==============================================================================
-- 7. VISTA PÚBLICA SANITIZADA (Excluye direcciones privadas y datos de propietarios)
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
-- 8. FUNCIONES AUXILIARES DE AUTENTICACIÓN Y SEGURIDAD
-- ==============================================================================

-- Función segura para extraer la organización del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID AS $$
DECLARE
    jwt_org UUID;
    member_org UUID;
BEGIN
    -- 1. Intentar obtener desde claims JWT (app_metadata / user_metadata)
    BEGIN
        jwt_org := NULLIF(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'organization_id', '')::UUID;
        IF jwt_org IS NOT NULL THEN
            RETURN jwt_org;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        jwt_org := NULL;
    END;

    -- 2. Fallback seguro: consultar la tabla de miembros
    SELECT organization_id INTO member_org
    FROM public.organization_members
    WHERE user_id = auth.uid()
    LIMIT 1;

    RETURN member_org;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Alias en auth schema para compatibilidad
CREATE OR REPLACE FUNCTION auth.get_user_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN public.get_user_organization_id();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_properties_updated_at ON public.properties;
CREATE TRIGGER tr_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_leads_updated_at ON public.leads;
CREATE TRIGGER tr_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 9. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- 9.1 ORGANIZACIONES
DROP POLICY IF EXISTS "Public can view organization public profile" ON public.organizations;
CREATE POLICY "Public can view organization public profile"
ON public.organizations FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Org members can update their organization" ON public.organizations;
CREATE POLICY "Org members can update their organization"
ON public.organizations FOR UPDATE
TO authenticated
USING (id = auth.get_user_organization_id());

-- 9.2 MIEMBROS DE ORGANIZACIÓN
DROP POLICY IF EXISTS "Org members can view member list" ON public.organization_members;
CREATE POLICY "Org members can view member list"
ON public.organization_members FOR SELECT
TO authenticated
USING (organization_id = auth.get_user_organization_id());

-- 9.3 PROPIEDADES (INVENTARIO)
DROP POLICY IF EXISTS "Public can view available properties" ON public.properties;
CREATE POLICY "Public can view available properties"
ON public.properties FOR SELECT
USING (status = 'disponible');

DROP POLICY IF EXISTS "Org members can view all their properties" ON public.properties;
CREATE POLICY "Org members can view all their properties"
ON public.properties FOR SELECT
TO authenticated
USING (organization_id = auth.get_user_organization_id());

DROP POLICY IF EXISTS "Org members can insert properties" ON public.properties;
CREATE POLICY "Org members can insert properties"
ON public.properties FOR INSERT
TO authenticated
WITH CHECK (organization_id = auth.get_user_organization_id());

DROP POLICY IF EXISTS "Org members can update their properties" ON public.properties;
CREATE POLICY "Org members can update their properties"
ON public.properties FOR UPDATE
TO authenticated
USING (organization_id = auth.get_user_organization_id());

DROP POLICY IF EXISTS "Org members can delete their properties" ON public.properties;
CREATE POLICY "Org members can delete their properties"
ON public.properties FOR DELETE
TO authenticated
USING (organization_id = auth.get_user_organization_id());

-- 9.4 PROSPECTOS (LEADS)
DROP POLICY IF EXISTS "Public can insert lead with habeas data consent" ON public.leads;
CREATE POLICY "Public can insert lead with habeas data consent"
ON public.leads FOR INSERT
WITH CHECK (consent_habeas_data = true);

DROP POLICY IF EXISTS "Org members can view their leads" ON public.leads;
CREATE POLICY "Org members can view their leads"
ON public.leads FOR SELECT
TO authenticated
USING (organization_id = auth.get_user_organization_id());

DROP POLICY IF EXISTS "Org members can update their leads" ON public.leads;
CREATE POLICY "Org members can update their leads"
ON public.leads FOR UPDATE
TO authenticated
USING (organization_id = auth.get_user_organization_id());

DROP POLICY IF EXISTS "Org members can delete their leads" ON public.leads;
CREATE POLICY "Org members can delete their leads"
ON public.leads FOR DELETE
TO authenticated
USING (organization_id = auth.get_user_organization_id());

-- 9.5 ACTIVIDADES DE PROSPECTOS
DROP POLICY IF EXISTS "Org members can view lead activities" ON public.lead_activities;
CREATE POLICY "Org members can view lead activities"
ON public.lead_activities FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_activities.lead_id
    AND leads.organization_id = auth.get_user_organization_id()
));

DROP POLICY IF EXISTS "Org members can insert lead activities" ON public.lead_activities;
CREATE POLICY "Org members can insert lead activities"
ON public.lead_activities FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_activities.lead_id
    AND leads.organization_id = auth.get_user_organization_id()
));

DROP POLICY IF EXISTS "Public can insert initial lead activity" ON public.lead_activities;
CREATE POLICY "Public can insert initial lead activity"
ON public.lead_activities FOR INSERT
WITH CHECK (true);

-- ==============================================================================
-- 10. DATOS SEMILLA INICIALES (Organización de Demostración Aislada)
-- ==============================================================================
INSERT INTO public.organizations (
    id,
    name,
    slug,
    nit,
    phone,
    email,
    city,
    address,
    currency,
    ai_assistant_name,
    ai_assistant_welcome_message
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Inmobiliaria Premier (Demostración)',
    'inmo-premier-demo',
    '901.458.789-2',
    '+57 304 360 5155',
    'agenteinmobiliaria1986@gmail.com',
    'Medellín',
    'Cra 43A # 1-50, San Fernando Plaza, El Poblado',
    'COP',
    'SofIA Inmobiliaria',
    '¡Hola! Soy SofIA, tu asesora inmobiliaria virtual de Inmobiliaria Premier. ¿Estás buscando comprar o arrendar una propiedad?'
) ON CONFLICT (slug) DO UPDATE SET
    phone = EXCLUDED.phone,
    email = EXCLUDED.email;

-- Propiedades de muestra para la organización de prueba
INSERT INTO public.properties (
    id, organization_id, code, title, description, type, operation, municipality, zone,
    internal_address, price_cop, admin_fee_cop, area_m2, bedrooms, bathrooms, parking_spots, stratum, features, images, status, assigned_agent, featured
) VALUES
(
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000001',
    'APT-101',
    'Apartamento de Lujo en El Poblado con Vista Panorámica',
    'Exclusivo apartamento en sector exclusivo de El Poblado. Acabados importados, ventanales de piso a techo, cocina italiana abierta y amplia terraza con vista a la ciudad.',
    'apartamento', 'compra', 'Medellín', 'El Poblado',
    'Cra 32 # 2 Sur-45 Torre 2 Apto 1802 (Propietario: Fernando Osorio)',
    980000000, 650000, 142, 3, 3, 2, 6,
    ARRAY['Balcón Panorámico', 'Piscina Climatizada', 'Gimnasio', '2 Parqueaderos'],
    ARRAY['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'],
    'disponible', 'Laura Gómez', true
),
(
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000001',
    'APT-901',
    'Apartamento 2 Alcobas Moderno en Laureles Nogal',
    'Moderno apartamento remodelado en el corazón de Laureles. Excelente iluminación natural, balcón amplio y acabados de primera.',
    'apartamento', 'arriendo', 'Medellín', 'Laureles',
    'Circular 4 # 72-18 Apto 401 (Propietaria: Beatriz Elena Jaramillo)',
    2500000, 220000, 68, 2, 2, 1, 5,
    ARRAY['Balcón', 'Ascensor', 'Parqueadero Privado', 'Cocina Integral'],
    ARRAY['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80'],
    'disponible', 'Laura Gómez', true
),
(
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000001',
    'APT-802',
    'Apartamento de 2 Habitaciones en Belén La Palma',
    'Acogedor apartamento cerca al metroplus y centros comerciales. Unidad cerrada con portería 24/7 y zonas verdes.',
    'apartamento', 'arriendo', 'Medellín', 'Belén',
    'Calle 30 # 78-45 Apto 502 (Propietario: Roberto Silva)',
    2350000, 180000, 64, 2, 2, 1, 4,
    ARRAY['Portería 24h', 'Piscina', 'Salón Social', 'Parqueadero'],
    ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80'],
    'disponible', 'Laura Gómez', false
),
(
    '00000000-0000-0000-0000-000000000104',
    '00000000-0000-0000-0000-000000000001',
    'CAS-401',
    'Casa Campestre Exclusiva en Envigado Las Brujas',
    'Hermosa casa campestre en unidad cerrada exclusiva. Lote independiente de 600m2 con jardines, jacuzzi privado y acabados rústicos modernos.',
    'casa', 'compra', 'Envigado', 'Las Brujas',
    'Loma de las Brujas Calle 38 Sur # 22-100 Casa 8 (Propietario: Mauricio Vélez)',
    1450000000, 480000, 290, 4, 4, 3, 5,
    ARRAY['Jacuzzi Privado', 'Jardín', 'Zona BBQ', '3 Parqueaderos'],
    ARRAY['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80'],
    'disponible', 'Laura Gómez', true
)
ON CONFLICT (organization_id, code) DO NOTHING;

-- ==============================================================================
-- 11. PERMISOS DE ACCESO PARA ROLES DE SUPABASE (anon / authenticated)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

GRANT SELECT ON public.public_properties TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO anon, authenticated;
GRANT SELECT, UPDATE ON public.organizations TO anon, authenticated;
GRANT SELECT ON public.organization_members TO authenticated;

