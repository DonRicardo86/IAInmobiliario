-- ==============================================================================
-- IA_INMOBILIARIA: PROCEDIMIENTO SEGURO DE VINCULACIÓN DE INMOBILIARIA PILOTO
-- Asocia un usuario registrado en Supabase Auth con su organización y rol 'owner'
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.provision_tenant_pilot(
    p_user_email TEXT,
    p_org_name TEXT DEFAULT 'Inmobiliaria Piloto',
    p_org_slug TEXT DEFAULT 'inmo-piloto',
    p_phone TEXT DEFAULT '+57 304 360 5155',
    p_city TEXT DEFAULT 'Medellín'
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_member_id UUID;
BEGIN
    -- 1. Verificar que el usuario exista en auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = LOWER(TRIM(p_user_email))
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario con correo % no encontrado en Supabase Auth. Por favor crea el usuario primero en Authentication -> Users.', p_user_email;
    END IF;

    -- 2. Crear o recuperar la organización piloto
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
        p_org_name,
        p_org_slug,
        p_phone,
        LOWER(TRIM(p_user_email)),
        p_city,
        'COP',
        'SofIA Inmobiliaria',
        '¡Hola! Soy SofIA, asistente virtual de ' || p_org_name || '. ¿En qué puedo ayudarte hoy?'
    )
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        city = EXCLUDED.city,
        updated_at = NOW()
    RETURNING id INTO v_org_id;

    -- 3. Vincular el usuario como 'owner' sin duplicados
    INSERT INTO public.organization_members (
        organization_id,
        user_id,
        role
    ) VALUES (
        v_org_id,
        v_user_id,
        'owner'
    )
    ON CONFLICT (organization_id, user_id) DO UPDATE SET
        role = 'owner'
    RETURNING id INTO v_member_id;

    -- 4. Sincronizar app_metadata del usuario en Supabase Auth para JWTs inmediatos
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
        'organization_id', v_org_id::text,
        'role', 'owner'
    )
    WHERE id = v_user_id;

    -- 5. Retornar resultado estructurado
    RETURN jsonb_build_object(
        'success', true,
        'organization_id', v_org_id,
        'organization_name', p_org_name,
        'organization_slug', p_org_slug,
        'user_id', v_user_id,
        'user_email', p_user_email,
        'role', 'owner',
        'message', 'Organización vinculada y configurada exitosamente con rol owner.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Revocar permisos de ejecución pública y restringir a administradores / service_role
REVOKE EXECUTE ON FUNCTION public.provision_tenant_pilot(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_tenant_pilot(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
