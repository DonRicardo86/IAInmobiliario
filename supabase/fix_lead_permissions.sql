-- ==============================================================================
-- SCRIPT MÍNIMO DE PRIVILEGIOS Y PROCEDIMIENTO DE CAPTACIÓN
-- IA Inmobiliaria - Corrección de Permisos PostgreSQL 42501
-- ==============================================================================
-- Ejecutar en Supabase SQL Editor si persisten errores de permisos en PostgREST.
-- ==============================================================================

-- 1. ASEGURAR PRIVILEGIOS AL ROL ADMINISTRATIVO (service_role)
GRANT USAGE ON SCHEMA public TO service_role, anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- 2. MIGRACIÓN IDEMPOTENTE DEL CAMPO DE INMUEBLES DE INTERÉS
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

-- 3. LIMPIEZA DE POSIBLES SOBRECARGAS PREVIAS
DROP FUNCTION IF EXISTS public.capture_public_lead(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, UUID[], TEXT, BOOLEAN, VARCHAR, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.capture_public_lead(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, TEXT[], TEXT, BOOLEAN, VARCHAR, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.capture_public_lead CASCADE;

-- 4. CREACIÓN DEL PROCEDIMIENTO SEGURO DE CAPTACIÓN
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
    -- 1. Validar autorización de datos personales
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

    -- 3. Validar existencia de la organización receptora
    SELECT id, name INTO v_org_id, v_org_name
    FROM public.organizations
    WHERE id = p_organization_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La organización receptora especificada no existe en el sistema.'
            USING ERRCODE = '22000';
    END IF;

    -- 4. Validar referencias de inmuebles
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

    IF (v_verified_props IS NULL OR array_length(v_verified_props, 1) = 0) AND p_interested_property_ids IS NOT NULL THEN
        v_verified_props := p_interested_property_ids;
    END IF;

    -- 5. Control de duplicados
    SELECT id INTO v_existing_lead_id
    FROM public.leads
    WHERE organization_id = p_organization_id
      AND (LOWER(TRIM(email)) = v_email OR TRIM(phone) = v_phone)
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_existing_lead_id IS NOT NULL THEN
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

    -- 6. Inserción atómica de nuevo prospecto
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

    -- 7. Actividad inicial
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

-- 5. ASIGNACIÓN ESTRICTA DE PRIVILEGIOS DE EJECUCIÓN
REVOKE ALL ON FUNCTION public.capture_public_lead(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, TEXT[], TEXT, BOOLEAN, VARCHAR, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.capture_public_lead(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, TEXT[], TEXT, BOOLEAN, VARCHAR, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.capture_public_lead(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, TEXT[], TEXT, BOOLEAN, VARCHAR, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.capture_public_lead(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, TEXT[], TEXT, BOOLEAN, VARCHAR, TEXT) TO service_role;

-- 6. RECARGA INMEDIATA DE CACHÉ DE POSTGREST
NOTIFY pgrst, 'reload schema';

