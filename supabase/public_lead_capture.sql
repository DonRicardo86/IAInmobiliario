-- ==============================================================================
-- PROCEDIMIENTO DE CAPTACIÓN PÚBLICA SEGURA DE PROSPECTOS (LEADS)
-- IA Inmobiliaria - Módulo de Captación de Servidor con Privilegios Mínimos
-- ==============================================================================
-- Propósito:
-- Permite que el backend autorizado (usando SUPABASE_SERVICE_ROLE_KEY) registre
-- prospectos de forma atómica y validada tras haber superado las verificaciones
-- del servidor (Habeas Data, rate limiting, validación de contacto y resolución de organización).
--
-- REGLA DE SEGURIDAD ESTRICTA:
-- Este procedimiento NO es invocable directamente por visitantes anónimos ('anon')
-- ni usuarios ordinarios ('authenticated') a través de PostgREST.
-- Su ejecución está restringida EXCLUSIVAMENTE al rol 'service_role' del servidor.
-- ==============================================================================

-- 0. MIGRACIÓN PREVENTIVA DE TIPO DE COLUMNA (Idempotente)
-- Permite almacenar tanto códigos (ej. 'INM-585') como UUIDs sin errores de casteo
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'interested_property_ids'
    ) THEN
        ALTER TABLE public.leads 
        ALTER COLUMN interested_property_ids TYPE TEXT[] 
        USING interested_property_ids::TEXT[];
    END IF;
END $$;

-- 0.1 ASEGURAR PRIVILEGIOS DE ESQUEMA Y TABLAS AL ROL ADMINISTRATIVO (service_role)
GRANT USAGE ON SCHEMA public TO service_role, anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- 0.2 LIMPIEZA DE SOBRECARGAS ANTERIORES (Evita colisiones entre UUID[] y TEXT[])
DROP FUNCTION IF EXISTS public.capture_public_lead(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, UUID[], TEXT, BOOLEAN, VARCHAR, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.capture_public_lead(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, TEXT[], TEXT, BOOLEAN, VARCHAR, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.capture_public_lead CASCADE;

-- 1. CREACIÓN DE LA FUNCIÓN RPC PRIVILEGIADA
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
    v_prop_ref TEXT;
    v_verified_props TEXT[] := '{}';
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

    -- 3. Validar existencia y vigencia de la organización receptora en public.organizations
    SELECT id, name INTO v_org_id, v_org_name
    FROM public.organizations
    WHERE id = p_organization_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La organización receptora especificada no existe en el sistema.'
            USING ERRCODE = '22000';
    END IF;

    -- 4. Validar y recolectar inmuebles de interés de esa organización
    IF p_interested_property_ids IS NOT NULL AND array_length(p_interested_property_ids, 1) > 0 THEN
        FOREACH v_prop_ref IN ARRAY p_interested_property_ids
        LOOP
            IF TRIM(v_prop_ref) <> '' THEN
                PERFORM 1 FROM public.properties
                WHERE organization_id = p_organization_id
                  AND (code = TRIM(v_prop_ref) OR id::TEXT = TRIM(v_prop_ref));

                IF FOUND THEN
                    v_verified_props := array_append(v_verified_props, TRIM(v_prop_ref));
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- Si se enviaron referencias de inmueble no registradas, conservarlas para registro comercial
    IF (v_verified_props IS NULL OR array_length(v_verified_props, 1) = 0) AND p_interested_property_ids IS NOT NULL THEN
        v_verified_props := p_interested_property_ids;
    END IF;

    -- 5. Detección de duplicados para la misma organización (por correo o teléfono)
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
            CASE WHEN array_length(v_verified_props, 1) > 0 THEN array_to_string(v_verified_props, ', ') ELSE 'Búsqueda general' END || 
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

    -- 6. Inserción protegida de nuevo prospecto (campos administrativos fijados estrictamente por el servidor)
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
        COALESCE(v_verified_props, ARRAY[]::TEXT[]),
        COALESCE(p_notes, ''),
        'nuevo',
        'alto',
        COALESCE(p_source, 'asistente_ia'),
        'Por Asignar',
        true
    )
    RETURNING id INTO v_new_lead_id;

    -- 7. Registrar actividad inicial atómica
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

-- ==============================================================================
-- GESTIÓN ESTRICTA DE PRIVILEGIOS (Acceso exclusivo de backend service_role)
-- ==============================================================================
-- 1. Revocar completamente cualquier permiso a PUBLIC, anon y authenticated
REVOKE ALL ON FUNCTION public.capture_public_lead(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, TEXT[], TEXT, BOOLEAN, VARCHAR, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.capture_public_lead(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, TEXT[], TEXT, BOOLEAN, VARCHAR, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.capture_public_lead(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, TEXT[], TEXT, BOOLEAN, VARCHAR, TEXT) FROM authenticated;

-- 2. Conceder EXECUTE EXCLUSIVAMENTE a service_role (backend autenticado del servidor)
GRANT EXECUTE ON FUNCTION public.capture_public_lead(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, TEXT[], TEXT, BOOLEAN, VARCHAR, TEXT) TO service_role;

-- 3. Recarga inmediata de caché de PostgREST
NOTIFY pgrst, 'reload schema';

