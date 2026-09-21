-- ==============================================================================
-- IA_INMOBILIARIA: ESQUEMA POSTGRESQL Y ROW LEVEL SECURITY (RLS) PARA SUPABASE
-- Arquitectura SaaS Multi-Tenant y Seguridad Estricta Basada en Roles (RBAC)
-- ==============================================================================

-- 0. EXTENSIONES DE SEGURIDAD
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
-- 2. TABLA: MIEMBROS DE ORGANIZACIÓN (Vínculo con Supabase Auth y Roles)
-- Roles disponibles:
--   - 'owner': Control total de la inmobiliaria, gestión de miembros y facturación.
--   - 'admin': Gestión completa de inventario, prospectos y consulta de miembros.
--   - 'agent': Gestión operativa de inventario y prospectos (sin eliminación).
--   - 'viewer': Solo lectura sobre inventario y prospectos de su organización.
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
-- 3. TABLA: PROPIEDADES (Inventario General)
-- Nota: Solo accesible a miembros autenticados de la organización.
-- Visitantes anónimos acceden exclusivamente a la vista 'public_properties'.
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
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_org_property_code UNIQUE (organization_id, code)
);

-- ==============================================================================
-- 4. TABLA: DETALLES PRIVADOS DE PROPIEDADES (Datos Sensibles de Propietarios y CRM)
-- Separación física estricta para garantizar que la información confidencial nunca se exponga.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.property_private_details (
    property_id UUID PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    internal_address TEXT NOT NULL,
    owner_name VARCHAR(255),
    owner_phone VARCHAR(50),
    owner_email VARCHAR(255),
    commission_rate NUMERIC(5,2) DEFAULT 3.00,
    private_notes TEXT,
    assigned_agent VARCHAR(150) DEFAULT 'Sin Asignar',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. TABLA: PROSPECTOS / LEADS (CRM Comercial Privado)
-- Solo accesible a miembros autenticados. La captación pública se procesa mediante el servidor.
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
-- 6. TABLA: ACTIVIDADES Y SEGUIMIENTO DE PROSPECTOS
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
-- 7. ÍNDICES DE ALTO RENDIMIENTO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_properties_org ON public.properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_search ON public.properties(organization_id, operation, type, status, municipality, price_cop);
CREATE INDEX IF NOT EXISTS idx_prop_private_org ON public.property_private_details(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_org ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_status_priority ON public.leads(organization_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_leads_contact_search ON public.leads(organization_id, email, phone);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON public.lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);

-- ==============================================================================
-- 8. VISTA PÚBLICA SANITIZADA (Solo datos comerciales autorizados)
-- Con security_barrier para evitar ataques de canal lateral o filtración de planes de ejecución.
-- ==============================================================================
CREATE OR REPLACE VIEW public.public_properties WITH (security_barrier = true) AS
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
-- 9. FUNCIONES DE AUTORIZACIÓN Y SEGURIDAD MULTI-TENANT (RBAC)
-- Todas las funciones usan search_path seguro para prevenir inyección de esquemas.
-- ==============================================================================

-- Verifica si el usuario autenticado pertenece a una organización específica
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = target_org_id
          AND organization_members.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Verifica si el usuario autenticado tiene uno de los roles autorizados en la organización
CREATE OR REPLACE FUNCTION public.has_org_role(target_org_id UUID, allowed_roles VARCHAR[])
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = target_org_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role = ANY(allowed_roles)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Obtiene el rol del usuario autenticado en una organización
CREATE OR REPLACE FUNCTION public.get_user_role(target_org_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    user_role VARCHAR;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT role INTO user_role
    FROM public.organization_members
    WHERE organization_members.organization_id = target_org_id
      AND organization_members.user_id = auth.uid()
    LIMIT 1;

    RETURN user_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Retorna el conjunto de IDs de organizaciones a las que pertenece el usuario
CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
RETURNS SETOF UUID AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT organization_members.organization_id
    FROM public.organization_members
    WHERE organization_members.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS tr_properties_updated_at ON public.properties;
CREATE TRIGGER tr_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_prop_private_updated_at ON public.property_private_details;
CREATE TRIGGER tr_prop_private_updated_at
BEFORE UPDATE ON public.property_private_details
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_leads_updated_at ON public.leads;
CREATE TRIGGER tr_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 10. POLÍTICAS DE ROW LEVEL SECURITY (RLS) GRANULARES POR ROL
-- ==============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_private_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- 10.1 ORGANIZACIONES
DROP POLICY IF EXISTS "Public can view organization public profile" ON public.organizations;
CREATE POLICY "Public can view organization public profile"
ON public.organizations FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Org owner can update organization" ON public.organizations;
CREATE POLICY "Org owner can update organization"
ON public.organizations FOR UPDATE
TO authenticated
USING (public.has_org_role(id, ARRAY['owner']));

-- 10.2 MIEMBROS DE ORGANIZACIÓN
DROP POLICY IF EXISTS "Org members can view member list" ON public.organization_members;
CREATE POLICY "Org members can view member list"
ON public.organization_members FOR SELECT
TO authenticated
USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Org owner or admin can add members" ON public.organization_members;
CREATE POLICY "Org owner or admin can add members"
ON public.organization_members FOR INSERT
TO authenticated
WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "Org owner can update member roles" ON public.organization_members;
CREATE POLICY "Org owner can update member roles"
ON public.organization_members FOR UPDATE
TO authenticated
USING (public.has_org_role(organization_id, ARRAY['owner']));

DROP POLICY IF EXISTS "Org owner can remove members" ON public.organization_members;
CREATE POLICY "Org owner can remove members"
ON public.organization_members FOR DELETE
TO authenticated
USING (public.has_org_role(organization_id, ARRAY['owner']));

-- 10.3 PROPIEDADES (INVENTARIO GENERAL)
-- NOTA CRÍTICA: No existe política SELECT para 'anon' en la tabla base.
-- Los visitantes anónimos solo leen de public.public_properties.
DROP POLICY IF EXISTS "Org members can view their properties" ON public.properties;
CREATE POLICY "Org members can view their properties"
ON public.properties FOR SELECT
TO authenticated
USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Authorized members can insert properties" ON public.properties;
CREATE POLICY "Authorized members can insert properties"
ON public.properties FOR INSERT
TO authenticated
WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'agent']));

DROP POLICY IF EXISTS "Authorized members can update properties" ON public.properties;
CREATE POLICY "Authorized members can update properties"
ON public.properties FOR UPDATE
TO authenticated
USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'agent']));

DROP POLICY IF EXISTS "Only owner and admin can delete properties" ON public.properties;
CREATE POLICY "Only owner and admin can delete properties"
ON public.properties FOR DELETE
TO authenticated
USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']));

-- 10.4 DETALLES PRIVADOS DE PROPIEDADES
DROP POLICY IF EXISTS "Authorized members can view private details" ON public.property_private_details;
CREATE POLICY "Authorized members can view private details"
ON public.property_private_details FOR SELECT
TO authenticated
USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'agent']));

DROP POLICY IF EXISTS "Authorized members can insert private details" ON public.property_private_details;
CREATE POLICY "Authorized members can insert private details"
ON public.property_private_details FOR INSERT
TO authenticated
WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'agent']));

DROP POLICY IF EXISTS "Authorized members can update private details" ON public.property_private_details;
CREATE POLICY "Authorized members can update private details"
ON public.property_private_details FOR UPDATE
TO authenticated
USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'agent']));

DROP POLICY IF EXISTS "Only owner and admin can delete private details" ON public.property_private_details;
CREATE POLICY "Only owner and admin can delete private details"
ON public.property_private_details FOR DELETE
TO authenticated
USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']));

-- 10.5 PROSPECTOS (LEADS)
-- NOTA CRÍTICA: Se revoca inserción y consulta anónima directa.
-- La captación pública se procesa a través del endpoint seguro del servidor.
DROP POLICY IF EXISTS "Org members can view their leads" ON public.leads;
CREATE POLICY "Org members can view their leads"
ON public.leads FOR SELECT
TO authenticated
USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Authorized members can insert leads" ON public.leads;
CREATE POLICY "Authorized members can insert leads"
ON public.leads FOR INSERT
TO authenticated
WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'agent']));

DROP POLICY IF EXISTS "Authorized members can update leads" ON public.leads;
CREATE POLICY "Authorized members can update leads"
ON public.leads FOR UPDATE
TO authenticated
USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'agent']));

DROP POLICY IF EXISTS "Only owner and admin can delete leads" ON public.leads;
CREATE POLICY "Only owner and admin can delete leads"
ON public.leads FOR DELETE
TO authenticated
USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']));

-- 10.6 ACTIVIDADES DE PROSPECTOS
DROP POLICY IF EXISTS "Org members can view lead activities" ON public.lead_activities;
CREATE POLICY "Org members can view lead activities"
ON public.lead_activities FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_activities.lead_id
    AND public.is_org_member(leads.organization_id)
));

DROP POLICY IF EXISTS "Authorized members can insert lead activities" ON public.lead_activities;
CREATE POLICY "Authorized members can insert lead activities"
ON public.lead_activities FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_activities.lead_id
    AND public.has_org_role(leads.organization_id, ARRAY['owner', 'admin', 'agent'])
));

-- ==============================================================================
-- 11. PERMISOS DE ACCESO PARA ROLES DE SUPABASE (anon / authenticated)
-- Principio de mínimo privilegio: 'anon' no tiene permisos directos sobre tablas privadas.
-- ==============================================================================
REVOKE ALL ON public.properties FROM anon;
REVOKE ALL ON public.property_private_details FROM anon;
REVOKE ALL ON public.leads FROM anon;
REVOKE ALL ON public.lead_activities FROM anon;
REVOKE ALL ON public.organization_members FROM anon;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- Permisos públicos autorizados para 'anon'
GRANT SELECT ON public.public_properties TO anon;
GRANT SELECT ON public.organizations TO anon;

-- Permisos para usuarios autenticados (filtrados por las políticas RLS anteriores)
GRANT SELECT ON public.public_properties TO authenticated;
GRANT SELECT, UPDATE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_private_details TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;

-- Permisos de ejecución de funciones
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_role(UUID, VARCHAR[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organization_ids() TO authenticated;
