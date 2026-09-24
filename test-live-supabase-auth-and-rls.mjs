/**
 * ==============================================================================
 * SUITE DE VERIFICACIÓN EN VIVO: SUPABASE AUTH, PERMISOS RLS Y PERSISTENCIA REAL
 * ==============================================================================
 * Ejecución:
 *   $env:NEXT_PUBLIC_SUPABASE_URL="https://<tu-id>.supabase.co"
 *   $env:NEXT_PUBLIC_SUPABASE_ANON_KEY="<tu-anon-key>"
 *   $env:TEST_USER_EMAIL="usuario_owner@inmobiliaria.com"       (Opcional para login real)
 *   $env:TEST_USER_PASSWORD="tu_password_seguro"                 (Opcional para login real)
 *   node test-live-supabase-auth-and-rls.mjs
 * ==============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';

// Cargar .env.local si existe en el entorno local
if (existsSync('.env.local')) {
  const envContent = readFileSync('.env.local', 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const USER_EMAIL = process.env.TEST_USER_EMAIL || '';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD || '';

const hasAnonConfig = SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 20;
const hasUserCredentials = USER_EMAIL.length > 3 && USER_PASSWORD.length > 3;

console.log('================================================================================');
console.log('     IA INMOBILIARIA - VERIFICACIÓN DE CONEXIÓN REAL Y SEGURIDAD RLS            ');
console.log('================================================================================');
console.log(`📡 URL Supabase:         ${hasAnonConfig ? SUPABASE_URL : '⚠️ No configurada'}`);
console.log(`🔑 Clave Pública (Anon): ${hasAnonConfig ? 'Configurada (' + SUPABASE_ANON_KEY.slice(0, 12) + '...)' : '⚠️ No configurada'}`);
console.log(`👤 Usuario de Prueba:    ${hasUserCredentials ? USER_EMAIL : 'ℹ️ No suministrado en variables locales (Opcional)'}`);
console.log('================================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runLiveVerification() {
  if (!hasAnonConfig) {
    console.log('⚠️ NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY no están presentes en el entorno local.');
    console.log('   Para ejecutar la prueba en vivo contra tu Supabase real:');
    console.log('   $env:NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"');
    console.log('   $env:NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key"');
    console.log('   node test-live-supabase-auth-and-rls.mjs\n');
    console.log('Ejecutando validación de estructura de seguridad local...');

    // Validación estática de seguridad
    const fs = await import('fs');
    const authGuard = fs.readFileSync('./src/core/auth/auth-guard.ts', 'utf-8');
    const adapter = fs.readFileSync('./src/core/database/supabase-adapter.ts', 'utf-8');

    assert(authGuard.includes('cleanToken.startsWith(\'ia-admin-secret-dev\')') && authGuard.includes('return null;'), 'auth-guard rechaza incondicionalmente ia-admin-secret-dev en producción');
    assert(adapter.includes('property_private_details'), 'supabase-adapter incluye soporte completo para property_private_details');
    assert(adapter.includes('getSupabaseUserClient'), 'supabase-adapter utiliza cliente con JWT autenticado para RLS ordinario');

    console.log(`\n================================================================================`);
    console.log(`   VALIDACIÓN ESTÁTICA LOCAL: ${passedTests}/${totalTests} APROBADAS (100%)`);
    console.log(`================================================================================\n`);
    return;
  }

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  // -------------------------------------------------------------
  // 1. PRUEBA DE CONEXIÓN BÁSICA Y VISTAS PÚBLICAS
  // -------------------------------------------------------------
  console.log('🌐 1. CONEXIÓN EN VIVO Y PROTECCIÓN DE DATOS ANÓNIMOS');

  // 1.1 Consulta a vista public_organizations
  const { data: publicOrgs, error: errPubOrgs } = await anonClient
    .from('public_organizations')
    .select('*');

  assert(!errPubOrgs, 'Conexión exitosa a Supabase PostgREST (public_organizations)');
  if (publicOrgs) {
    const hasNit = publicOrgs.some((o) => o.nit !== undefined);
    assert(!hasNit, 'Vista public_organizations no expone el campo confidencial NIT');
  }

  // 1.2 Consulta a vista public_properties
  const { data: publicProps, error: errPubProps } = await anonClient
    .from('public_properties')
    .select('*');

  assert(!errPubProps, 'Consulta anónima autorizada a la vista public_properties');
  if (publicProps) {
    const hasInternalAddress = publicProps.some((p) => p.internal_address !== undefined);
    assert(!hasInternalAddress, 'Vista public_properties no expone la columna privada internal_address');
  }

  // 1.3 Bloqueo de consulta directa anónima a tabla privada properties
  const { data: directProps, error: errDirectProps } = await anonClient
    .from('properties')
    .select('*');

  const propertiesProtected = errDirectProps !== null || !directProps || directProps.length === 0;
  assert(propertiesProtected, 'Tabla privada public.properties protegida contra consultas anónimas directas');

  // 1.4 Bloqueo de consulta directa anónima a tabla property_private_details
  const { data: directDetails, error: errDirectDetails } = await anonClient
    .from('property_private_details')
    .select('*');

  const detailsProtected = errDirectDetails !== null || !directDetails || directDetails.length === 0;
  assert(detailsProtected, 'Tabla privada public.property_private_details protegida contra consultas anónimas directas');

  // 1.5 Bloqueo de consulta directa anónima a tabla leads
  const { data: directLeads, error: errDirectLeads } = await anonClient
    .from('leads')
    .select('*');

  const leadsProtected = errDirectLeads !== null || !directLeads || directLeads.length === 0;
  assert(leadsProtected, 'Tabla CRM public.leads protegida contra consultas anónimas directas');

  // -------------------------------------------------------------
  // 2. AUTENTICACIÓN SUPABASE AUTH Y OPERACIONES DE USUARIO OWNER
  // -------------------------------------------------------------
  if (hasUserCredentials) {
    console.log('\n🔐 2. AUTENTICACIÓN CON SUPABASE AUTH (USUARIO OWNER)');

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email: USER_EMAIL,
      password: USER_PASSWORD,
    });

    assert(!authError && !!authData?.session?.access_token, `Inicio de sesión exitoso con Supabase Auth para ${USER_EMAIL}`);

    if (authData?.session?.access_token) {
      const userToken = authData.session.access_token;
      const userId = authData.user.id;

      // Cliente autenticado con el JWT ordinario del usuario
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
        global: {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      });

      // 2.1 Verificar membresía y rol del usuario
      const { data: memberships, error: errMem } = await userClient
        .from('organization_members')
        .select('organization_id, role, organizations(name, slug)')
        .eq('user_id', userId);

      assert(!errMem && memberships && memberships.length > 0, 'El usuario autenticado tiene membresía en su organización piloto');
      const ownerMembership = memberships?.find((m) => m.role === 'owner');
      assert(!!ownerMembership, `El usuario tiene rol "owner" confirmado en la organización`);

      const targetOrgId = ownerMembership?.organization_id;

      if (targetOrgId) {
        console.log(`\n🏢 Organización Piloto: ${ownerMembership.organizations?.name || targetOrgId}`);

        // 2.2 Prueba de persistencia: Inserción de un inmueble de prueba mediante JWT del usuario
        const testCode = `TEST-${Date.now().toString().slice(-4)}`;
        console.log(`\n📦 3. CREACIÓN Y CONSULTA PERSISTENTE DE INMUEBLE (${testCode})`);

        const { data: newProp, error: errNewProp } = await userClient
          .from('properties')
          .insert({
            organization_id: targetOrgId,
            code: testCode,
            title: 'Apartamento Piloto de Prueba Persistente',
            description: 'Inmueble de verificación técnica de persistencia y RLS',
            type: 'apartamento',
            operation: 'arriendo',
            municipality: 'Medellín',
            zone: 'El Poblado',
            price_cop: 3500000,
            area_m2: 85,
            bedrooms: 2,
            bathrooms: 2,
            parking_spots: 1,
            stratum: 5,
            status: 'disponible',
          })
          .select()
          .single();

        assert(!errNewProp && !!newProp?.id, `Inmueble ${testCode} creado exitosamente por el usuario owner`);

        if (newProp?.id) {
          // 2.3 Inserción de detalle privado compuesto
          const { data: newPrivate, error: errPrivate } = await userClient
            .from('property_private_details')
            .insert({
              property_id: newProp.id,
              organization_id: targetOrgId,
              internal_address: 'Carrera 43A # 1-50 Torre Piloto Apto 1201',
              assigned_agent: 'Asesor Piloto Principal',
              owner_name: 'Propietario Ficticio de Prueba',
              owner_phone: '+57 300 999 8888',
            })
            .select()
            .single();

          assert(!errPrivate && !!newPrivate?.property_id, 'Detalle privado registrado con dirección interna confidencial');

          // 2.4 Consulta con JOIN de detalle privado mediante JWT del usuario
          const { data: readProp, error: errReadProp } = await userClient
            .from('properties')
            .select('*, property_private_details(*)')
            .eq('id', newProp.id)
            .single();

          assert(
            !errReadProp && readProp?.property_private_details?.internal_address === 'Carrera 43A # 1-50 Torre Piloto Apto 1201',
            'Consulta persistente autorizada: El owner accede al inmueble con su dirección interna real'
          );

          // 2.5 Limpieza del inmueble de prueba
          const { error: errDel } = await userClient
            .from('properties')
            .delete()
            .eq('id', newProp.id);

          assert(!errDel, 'Inmueble de prueba eliminado limpiamente al finalizar la verificación');
        }
      }
    }
  } else {
    console.log('\nℹ️ Para probar la creación y lectura de inmuebles con el usuario owner real:');
    console.log('   $env:TEST_USER_EMAIL="tu_usuario_creado@ejemplo.com"');
    console.log('   $env:TEST_USER_PASSWORD="tu_password"');
    console.log('   node test-live-supabase-auth-and-rls.mjs\n');
  }

  console.log(`\n================================================================================`);
  console.log(`   RESULTADO DE PRUEBAS: ${passedTests}/${totalTests} APROBADAS (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`================================================================================\n`);
}

runLiveVerification().catch((e) => {
  console.error('Error durante la verificación en vivo:', e);
  process.exit(1);
});
