-- ==============================================================================
-- IA_INMOBILIARIA: SCRIPT ADMINISTRATIVO DE APROVISIONAMIENTO (SQL EDITOR)
-- Ejecución exclusiva por el Administrador del Proyecto en Supabase SQL Editor
-- No crea funciones RPC expuestas a la API ni permite escalamiento de privilegios.
-- ==============================================================================

-- 1. LIMPIEZA DE SEGURIDAD: Eliminar cualquier función de aprovisionamiento previa si existiera
DROP FUNCTION IF EXISTS public.provision_tenant_pilot(TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.provision_tenant_pilot CASCADE;

-- 2. BLINDAJE DE PRIVILEGIOS POR DEFECTO EN POSTGRESQL
-- Garantiza que futuras funciones creadas en el esquema public no sean ejecutables por PUBLIC o anon
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;

-- 3. BLOQUE DE EJECUCIÓN ADMINISTRATIVO DIRECTO
DO $$
DECLARE
    -- PARÁMETROS CONFIGURABLES POR EL ADMINISTRADOR:
    v_target_email   TEXT := 'tu_correo_real@ejemplo.com'; -- <<< REEMPLAZA AQUÍ TU CORREO REAL DE SUPABASE AUTH
    v_org_name       TEXT := 'Inmobiliaria Piloto';
    v_org_slug       TEXT := 'inmo-piloto';
    v_phone          TEXT := '+57 304 360 5155';
    v_city           TEXT := 'Medellín';

    -- VARIABLES INTERNAS:
    v_user_id        UUID;
    v_org_id         UUID;
    v_member_id      UUID;
    v_existing_role  VARCHAR;
BEGIN
    -- Validación de parámetro
    IF v_target_email = 'tu_correo_real@ejemplo.com' OR TRIM(v_target_email) = '' THEN
        RAISE EXCEPTION 'Por favor especifica un correo electrónico válido registrado en Supabase Auth en la variable v_target_email.';
    END IF;

    -- Paso A: Verificar que el usuario exista en auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = LOWER(TRIM(v_target_email))
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'El usuario [%] no existe en auth.users. Regístralo primero en Supabase: Authentication -> Users -> Add User.', v_target_email;
    END IF;

    -- Paso B: Obtener o crear la organización sin sobrescribir datos existentes
    SELECT id INTO v_org_id
    FROM public.organizations
    WHERE slug = v_org_slug;

    IF v_org_id IS NULL THEN
        INSERT INTO public.organizations (
            name,
            slug,
            phone,
            email,
            city,
            currency,
            ai_assistant_name,
            ai_assistant_welcome_message
        ) VALUES (
            v_org_name,
            v_org_slug,
            v_phone,
            LOWER(TRIM(v_target_email)),
            v_city,
            'COP',
            'SofIA Inmobiliaria',
            '¡Hola! Soy SofIA, asesora virtual de ' || v_org_name || '. ¿En qué puedo ayudarte hoy?'
        )
        RETURNING id INTO v_org_id;

        RAISE NOTICE 'Organización [%] creada con ID: %', v_org_name, v_org_id;
    ELSE
        RAISE NOTICE 'Organización [%] existente localizada con ID: %', v_org_name, v_org_id;
    END IF;

    -- Paso C: Verificar membresía previa sin sobrescribir roles arbitrariamente
    SELECT id, role INTO v_member_id, v_existing_role
    FROM public.organization_members
    WHERE organization_id = v_org_id
      AND user_id = v_user_id;

    IF v_member_id IS NULL THEN
        -- Insertar como primer propietario (owner)
        INSERT INTO public.organization_members (
            organization_id,
            user_id,
            role
        ) VALUES (
            v_org_id,
            v_user_id,
            'owner'
        )
        RETURNING id INTO v_member_id;

        RAISE NOTICE 'Usuario [%] vinculado exitosamente como OWNER de [%] (Member ID: %)', v_target_email, v_org_name, v_member_id;
    ELSE
        RAISE NOTICE 'El usuario [%] ya es miembro de [%] con el rol [%]. No se modificaron sus permisos.', v_target_email, v_org_name, v_existing_role;
    END IF;

    RAISE NOTICE '--- APROVISIONAMIENTO ADMINISTRATIVO COMPLETADO SATISFACTORIAMENTE ---';
END $$;
