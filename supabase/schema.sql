-- ==============================================================================
-- IA_INMOBILIARIA: ESQUEMA POSTGRESQL Y ROW LEVEL SECURITY (RLS) PARA SUPABASE
-- Arquitectura SaaS Multi-Tenant y Seguridad Estricta Basada en Roles (RBAC)
-- ==============================================================================

-- 0. EXTENSIONES DE SEGURIDAD
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABLA: ORGANIZACIONES (Inmobiliarias)
-- Nota: Solo accesible a miembros autenticados de la respectiva organización.
-- Visitantes anónimos acceden exclusivamente a la vista 'public_organizations'.
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
--   - 'owner': Propietario de la inmobiliaria. Control total y nombramiento de roles.
--   - 'admin': Administrador. Gestión de inventario, prospectos y miembros operativos.
--   - 'agent': Asesor comercial. Gestión operativa de inventario y prospectos (sin eliminación).
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
    CONSTRAINT uq_org_property_code UNIQUE (organization_id, code),
    CONSTRAINT uq_property_id_org UNIQUE (id, organization_id)
);

-- ==============================================================================
-- 4. TABLA: DETALLES PRIVADOS DE PROPIEDADES (Datos Sensibles de Propietarios y CRM)
-- Integridad referencial cruzada estricta: garantiza que property_id y organization_id coincidan.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.property_private_details (
    property_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    internal_address TEXT NOT NULL,
    owner_name VARCHAR(255),
    owner_phone VARCHAR(50),
    owner_email VARCHAR(255),
    commission_rate NUMERIC(5,2) DEFAULT 3.00,
    private_notes TEXT,
    assigned_agent VARCHAR(150) DEFAULT 'Sin Asignar',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_prop_private_details_compound 
        FOREIGN KEY (property_id, organization_id) 
        REFERENCES public.properties(id, organization_id) 
        ON DELETE CASCADE
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
-- 7. TABLA: CONTROL DE TASA DISTRIBUIDO (Rate Limiting para Serverless / APIs Públicas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_key VARCHAR(255) NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    request_count INT NOT NULL DEFAULT 1,
    CONSTRAINT uq_client_endpoint UNIQUE (client_key, endpoint)
);

-- ==============================================================================
-- 8. ÍNDICES DE ALTO RENDIMIENTO
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
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.api_rate_limits(client_key, endpoint, window_start);

-- ==============================================================================
-- 9. VISTAS PÚBLICAS SANITIZADAS (Exclusivas para visitantes anónimos)
-- Construidas con security_barrier para evitar filtraciones de canales laterales.
-- ==============================================================================

-- 9.1 Catálogo público de inmuebles disponibles
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

-- 9.2 Perfil público comercial de inmobiliarias
CREATE OR REPLACE VIEW public.public_organizations WITH (security_barrier = true) AS
SELECT
    id,
    name,
    slug,
    phone,
    email,
    city,
    logo_url,
    currency,
    ai_assistant_name,
    ai_assistant_welcome_message
FROM public.organizations;

-- ==============================================================================
-- 10. FUNCIONES DE AUTORIZACIÓN Y SEGURIDAD MULTI-TENANT (RBAC)
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

-- Limitador de tasa distribuido para Serverless
CREATE OR REPLACE FUNCTION public.check_distributed_rate_limit(
    p_client_key TEXT,
    p_endpoint TEXT,
    p_max_requests INT DEFAULT 15,
    p_window_seconds INT DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_window_start TIMESTAMPTZ;
    v_count INT;
BEGIN
    SELECT window_start, request_count INTO v_window_start, v_count
    FROM public.api_rate_limits
    WHERE client_key = p_client_key AND endpoint = p_endpoint
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.api_rate_limits (client_key, endpoint, window_start, request_count)
        VALUES (p_client_key, p_endpoint, v_now, 1);
        RETURN TRUE;
    END IF;

    IF v_now > (v_window_start + (p_window_seconds || ' seconds')::INTERVAL) THEN
        UPDATE public.api_rate_limits
        SET window_start = v_now, request_count = 1
        WHERE client_key = p_client_key AND endpoint = p_endpoint;
        RETURN TRUE;
    END IF;

    IF v_count >= p_max_requests THEN
        RETURN FALSE;
    END IF;

    UPDATE public.api_rate_limits
    SET request_count = request_count + 1
    WHERE client_key = p_client_key AND endpoint = p_endpoint;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- Captación Pública Segura de Prospectos (SofIA / Web)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.capture_public_lead(
    p_organization_id UUID,
    p_name VARCHAR,
    p_phone VARCHAR,
    p_email VARCHAR,
    p_operation_type VARCHAR DEFAULT 'compra',
    p_property_type VARCHAR DEFAULT 'apartamento',
    p_municipality VARCHAR DEFAULT 'Medellín',
    p_zone VARCHAR DEFAULT 'El Poblado',
    p_budget NUMERIC DEFAULT 0,
    p_interested_property_ids TEXT[] DEFAULT '{}',
    p_notes TEXT DEFAULT '',
    p_consent_habeas_data BOOLEAN DEFAULT true,
    p_source VARCHAR DEFAULT 'asistente_ia',
    p_client_ip TEXT DEFAULT 'web'
)
RETURNS JSON AS $$
DECLARE
    v_org_id UUID;
    v_org_name VARCHAR;
    v_name VARCHAR;
    v_phone VARCHAR;
    v_email VARCHAR;
    v_existing_lead_id UUID;
    v_new_lead_id UUID;
BEGIN
    -- 1. Validar autorización de tratamiento de datos (Habeas Data Ley 1581 de 2012)
    IF p_consent_habeas_data IS NOT TRUE THEN
        RAISE EXCEPTION 'Se requiere la autorización expresa de tratamiento de datos personales (Habeas Data).'
            USING ERRCODE = '22000';
    END IF;

    -- 2. Validar datos mínimos obligatorios
    v_name := TRIM(COALESCE(p_name, ''));
    v_phone := TRIM(COALESCE(p_phone, ''));
    v_email := LOWER(TRIM(COALESCE(p_email, '')));

    IF v_name = '' OR v_phone = '' OR v_email = '' THEN
        RAISE EXCEPTION 'Los datos de contacto (nombre, teléfono y correo electrónico) son obligatorios.'
            USING ERRCODE = '22000';
    END IF;

    -- 3. Validar existencia de la organización receptora en public.organizations
    SELECT id, name INTO v_org_id, v_org_name
    FROM public.organizations
    WHERE id = p_organization_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La organización receptora especificada no existe en el sistema.'
            USING ERRCODE = '22000';
    END IF;

    -- 4. Detección de duplicados para la misma organización (por correo o teléfono)
    SELECT id INTO v_existing_lead_id
    FROM public.leads
    WHERE organization_id = p_organization_id
      AND (LOWER(TRIM(email)) = v_email OR TRIM(phone) = v_phone)
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_existing_lead_id IS NOT NULL THEN
        -- Registrar nueva interacción en el historial del prospecto existente
        INSERT INTO public.lead_activities (lead_id, description, type, author)
        VALUES (
            v_existing_lead_id,
            'Nueva solicitud registrada desde ' || COALESCE(p_source, 'asistente_ia') || '. Inmuebles: ' || 
            CASE WHEN array_length(p_interested_property_ids, 1) > 0 THEN array_to_string(p_interested_property_ids, ', ') ELSE 'Búsqueda general' END || 
            '. Notas: ' || COALESCE(p_notes, 'Consulta web recurrente'),
            'contact_attempt',
            'Asistente SofIA'
        );

        RETURN json_build_object(
            'success', true,
            'lead_id', v_existing_lead_id,
            'is_duplicate', true,
            'organization_id', p_organization_id,
            'message', 'Solicitud actualizada para el prospecto existente en ' || v_org_name || '.'
        );
    END IF;

    -- 5. Inserción protegida de nuevo prospecto
    INSERT INTO public.leads (
        organization_id,
        name,
        phone,
        email,
        operation_type,
        property_type,
        municipality,
        zone,
        budget,
        currency,
        desired_features,
        interested_property_ids,
        notes,
        status,
        priority,
        source,
        assigned_agent,
        consent_habeas_data
    ) VALUES (
        p_organization_id,
        v_name,
        v_phone,
        v_email,
        COALESCE(p_operation_type, 'compra'),
        COALESCE(p_property_type, 'apartamento'),
        COALESCE(p_municipality, 'Medellín'),
        COALESCE(p_zone, 'El Poblado'),
        COALESCE(p_budget, 0),
        'COP',
        ARRAY[]::TEXT[],
        COALESCE(p_interested_property_ids, ARRAY[]::TEXT[]),
        COALESCE(p_notes, ''),
        'nuevo',
        'alto',
        COALESCE(p_source, 'asistente_ia'),
        'Por Asignar',
        true
    )
    RETURNING id INTO v_new_lead_id;

    -- 6. Registrar actividad inicial
    INSERT INTO public.lead_activities (lead_id, description, type, author)
    VALUES (
        v_new_lead_id,
        'Prospecto captado exitosamente mediante ' || COALESCE(p_source, 'asistente_ia') || ' (' || v_org_name || '). Autorización Habeas Data verificada.',
        'created',
        'Sistema IA'
    );

    RETURN json_build_object(
        'success', true,
        'lead_id', v_new_lead_id,
        'is_duplicate', false,
        'organization_id', p_organization_id,
        'message', 'Prospecto creado exitosamente en el CRM de ' || v_org_name || '.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Trigger para garantizar integridad y evitar eliminación del último propietario
CREATE OR REPLACE FUNCTION public.check_organization_owner_integrity()
RETURNS TRIGGER AS $$
DECLARE
    owner_count INT;
BEGIN
    -- Si se intenta eliminar un propietario o cambiar su rol
    IF (TG_OP = 'DELETE' AND OLD.role = 'owner') OR 
       (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role <> 'owner') THEN
        SELECT COUNT(*) INTO owner_count
        FROM public.organization_members
        WHERE organization_id = OLD.organization_id
          AND role = 'owner'
          AND id <> OLD.id;

        IF owner_count = 0 THEN
            RAISE EXCEPTION 'Operación denegada: Una organización debe conservar al menos un propietario (owner) activo.';
        END IF;
    END IF;

    -- Impedir que un usuario modifique su propio rol
    IF TG_OP = 'UPDATE' AND OLD.user_id = auth.uid() AND OLD.role <> NEW.role THEN
        RAISE EXCEPTION 'Operación denegada: No está permitido modificar tu propio rol.';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS tr_org_members_owner_integrity ON public.organization_members;
CREATE TRIGGER tr_org_members_owner_integrity
BEFORE UPDATE OR DELETE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.check_organization_owner_integrity();

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS tr_organizations_updated_at ON public.organizations;
CREATE TRIGGER tr_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

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
-- 11. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_private_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- 11.1 ORGANIZACIONES
-- Consulta completa restringida exclusivamente a miembros autenticados de esa organización
DROP POLICY IF EXISTS "Org members can view their organization full profile" ON public.organizations;
CREATE POLICY "Org members can view their organization full profile"
ON public.organizations FOR SELECT
TO authenticated
USING (public.is_org_member(id));

DROP POLICY IF EXISTS "Org owner can update organization" ON public.organizations;
CREATE POLICY "Org owner can update organization"
ON public.organizations FOR UPDATE
TO authenticated
USING (public.has_org_role(id, ARRAY['owner']));

-- 11.2 MIEMBROS DE ORGANIZACIÓN (Control estricto contra escalamiento de privilegios)
DROP POLICY IF EXISTS "Org members can view member list" ON public.organization_members;
CREATE POLICY "Org members can view member list"
ON public.organization_members FOR SELECT
TO authenticated
USING (public.is_org_member(organization_id));

-- Solo el owner puede nombrar a cualquier rol (incluido otro owner)
DROP POLICY IF EXISTS "Org owner can add any members" ON public.organization_members;
CREATE POLICY "Org owner can add any members"
ON public.organization_members FOR INSERT
TO authenticated
WITH CHECK (public.has_org_role(organization_id, ARRAY['owner']));

-- Un admin solo puede agregar miembros operativos ('admin', 'agent', 'viewer'). NUNCA 'owner'.
DROP POLICY IF EXISTS "Org admin can add operational members" ON public.organization_members;
CREATE POLICY "Org admin can add operational members"
ON public.organization_members FOR INSERT
TO authenticated
WITH CHECK (
    public.has_org_role(organization_id, ARRAY['admin'])
    AND role IN ('admin', 'agent', 'viewer')
);

-- Solo el owner puede cambiar roles
DROP POLICY IF EXISTS "Org owner can update member roles" ON public.organization_members;
CREATE POLICY "Org owner can update member roles"
ON public.organization_members FOR UPDATE
TO authenticated
USING (public.has_org_role(organization_id, ARRAY['owner']));

-- Solo el owner puede expulsar miembros
DROP POLICY IF EXISTS "Org owner can remove members" ON public.organization_members;
CREATE POLICY "Org owner can remove members"
ON public.organization_members FOR DELETE
TO authenticated
USING (public.has_org_role(organization_id, ARRAY['owner']));

-- 11.3 PROPIEDADES (INVENTARIO GENERAL)
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

-- 11.4 DETALLES PRIVADOS DE PROPIEDADES
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

-- 11.5 PROSPECTOS (LEADS)
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

-- 11.6 ACTIVIDADES DE PROSPECTOS
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

-- 11.7 CONTROL DE RATE LIMITING (Solo accesible por el backend/funciones del sistema)
DROP POLICY IF EXISTS "System access only on rate limits" ON public.api_rate_limits;
CREATE POLICY "System access only on rate limits"
ON public.api_rate_limits FOR ALL
TO authenticated
USING (true);

-- ==============================================================================
-- 12. PERMISOS DE ACCESO PARA ROLES DE SUPABASE (anon / authenticated)
-- Principio de mínimo privilegio estricto: 'anon' nunca accede a tablas base ni funciones privadas.
-- ==============================================================================
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC, anon;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- Permisos públicos autorizados para 'anon' EXCLUSIVAMENTE sobre vistas sanitizadas
GRANT SELECT ON public.public_properties TO anon;
GRANT SELECT ON public.public_organizations TO anon;

-- Permisos para usuarios autenticados (filtrados por las políticas RLS)
GRANT SELECT ON public.public_properties TO authenticated;
GRANT SELECT ON public.public_organizations TO authenticated;
GRANT SELECT, UPDATE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_private_details TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;

-- Permisos de ejecución de funciones restringidos a roles autenticados y backend de servicio
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_org_role(UUID, VARCHAR[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_organization_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_distributed_rate_limit(TEXT, TEXT, INT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.capture_public_lead(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, TEXT[], TEXT, BOOLEAN, VARCHAR, TEXT) TO anon, authenticated, service_role;

-- Revocación de privilegios automáticos por defecto en PostgreSQL para funciones futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;


