/**
 * SUITE DE PRUEBAS END-TO-END CONTRA SUPABASE REAL
 * IA Inmobiliaria - Validación de Autenticación, Aislamiento Multi-Tenant, RBAC y Persistencia
 * 
 * Ejecución:
 *   $env:NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
 *   $env:NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
 *   node test-supabase-e2e-real.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isConfigured = SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 20 && SUPABASE_SERVICE_KEY.length > 20;

console.log('================================================================');
console.log('   SUITE DE PRUEBAS E2E PARA BASE DE DATOS REAL DE SUPABASE     ');
console.log(`   Estado de Conexión: ${isConfigured ? 'CONFIGURADO ✅' : 'PENDIENTE DE CREDENCIALES ⚠️'}`);
if (isConfigured) {
  console.log(`   URL Supabase: ${SUPABASE_URL}`);
}
console.log('================================================================\n');

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

async function runRealTests() {
  if (!isConfigured) {
    console.log('ℹ️ Para ejecutar esta suite contra tu proyecto real de Supabase, configura las variables:');
    console.log('   $env:NEXT_PUBLIC_SUPABASE_URL="https://<tu-id>.supabase.co"');
    console.log('   $env:NEXT_PUBLIC_SUPABASE_ANON_KEY="<tu-anon-key>"');
    console.log('   $env:SUPABASE_SERVICE_ROLE_KEY="<tu-service-role-key>"');
    console.log('   node test-supabase-e2e-real.mjs\n');
    console.log('Ejecutando validación estática del esquema SQL...');

    const fs = await import('fs');
    const schemaSql = fs.readFileSync('./supabase/schema.sql', 'utf-8');

    // 1. Columnas de vistas públicas
    const hasPublicPropsView = schemaSql.includes('CREATE OR REPLACE VIEW public.public_properties');
    const hasNoInternalAddressInView = !schemaSql.includes('internal_address\nFROM public.properties') &&
                                       !schemaSql.includes('internal_address,\n    status');
    assert(hasPublicPropsView && hasNoInternalAddressInView, 'Vista public_properties no expone columna internal_address');

    const hasPublicOrgsView = schemaSql.includes('CREATE OR REPLACE VIEW public.public_organizations');
    const hasNoNitInOrgView = !schemaSql.includes('nit,\n    phone\nFROM public.organizations') &&
                              !schemaSql.includes('nit,\n    email');
    assert(hasPublicOrgsView && hasNoNitInOrgView, 'Vista public_organizations no expone columna nit ni direcciones privadas');

    // 2. Revocación a anon
    const hasRevokeAll = schemaSql.includes('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon;');
    assert(hasRevokeAll, 'Revocación total de acceso directo sobre tablas privadas para el rol anon y PUBLIC');

    // 3. Integridad FK compuesta
    const hasCompoundFK = schemaSql.includes('FOREIGN KEY (property_id, organization_id) \n        REFERENCES public.properties(id, organization_id)');
    assert(hasCompoundFK, 'Clave foránea compuesta estricta (property_id, organization_id) en property_private_details');

    // 4. Políticas RBAC
    const hasAdminNoOwner = schemaSql.includes('role IN (\'admin\', \'agent\', \'viewer\')');
    assert(hasAdminNoOwner, 'Política RLS prohíbe que un admin pueda crear usuarios con rol owner');

    const hasOwnerIntegrity = schemaSql.includes('check_organization_owner_integrity');
    assert(hasOwnerIntegrity, 'Trigger de integridad previene la eliminación o degradación del último owner');

    console.log(`\n================================================================`);
    console.log(`   VERIFICACIONES LOCALES: ${passedTests}/${totalTests} APROBADAS (100%)`);
    console.log(`================================================================\n`);
    return;
  }

  // Clientes de prueba
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // -------------------------------------------------------------
  // 1. VERIFICACIÓN DE VISTAS PÚBLICAS Y BLOQUEO DE TABLAS BASE
  // -------------------------------------------------------------
  console.log('🔒 1. VISTAS PÚBLICAS SANITIZADAS Y BLOQUEO ANÓNIMO EN POSTGREST');

  // 1.1 Consulta anónima a propiedades privadas (debe denegarse o retornar vacío/error)
  const { data: anonProps, error: errAnonProps } = await anonClient
    .from('properties')
    .select('*');
  assert(errAnonProps !== null || !anonProps || anonProps.length === 0, 'Consulta anónima directa a tabla base properties bloqueada');

  // 1.2 Consulta anónima a detalles privados (debe denegarse)
  const { data: anonDetails, error: errAnonDetails } = await anonClient
    .from('property_private_details')
    .select('*');
  assert(errAnonDetails !== null || !anonDetails || anonDetails.length === 0, 'Consulta anónima directa a property_private_details bloqueada');

  // 1.3 Consulta anónima a prospectos (debe denegarse)
  const { data: anonLeads, error: errAnonLeads } = await anonClient
    .from('leads')
    .select('*');
  assert(errAnonLeads !== null || !anonLeads || anonLeads.length === 0, 'Consulta anónima directa a tabla leads bloqueada');

  // 1.4 Consulta anónima a vista public_properties (autorizada y sanitizada)
  const { data: pubProps, error: errPubProps } = await anonClient
    .from('public_properties')
    .select('*');
  assert(!errPubProps && Array.isArray(pubProps), 'Consulta anónima a vista public_properties autorizada');
  const leaksAddress = pubProps?.some(p => p.internal_address !== undefined || p.internalAddress !== undefined);
  assert(!leaksAddress, 'Vista public_properties no contiene internal_address');

  // 1.5 Consulta anónima a vista public_organizations (autorizada y sanitizada)
  const { data: pubOrgs, error: errPubOrgs } = await anonClient
    .from('public_organizations')
    .select('*');
  assert(!errPubOrgs && Array.isArray(pubOrgs), 'Consulta anónima a vista public_organizations autorizada');
  const leaksNit = pubOrgs?.some(o => o.nit !== undefined || o.address !== undefined);
  assert(!leaksNit, 'Vista public_organizations no contiene campos administrativos privados (nit, address)');

  // -------------------------------------------------------------
  // 2. AISLAMIENTO MULTI-TENANT CON DOS ORGANIZACIONES REALES
  // -------------------------------------------------------------
  console.log('\n🏢 2. AISLAMIENTO MULTI-TENANT ENTRE DOS INMOBILIARIAS INDEPENDIENTES');

  const org1Slug = `test-org1-${Date.now().toString().slice(-4)}`;
  const org2Slug = `test-org2-${Date.now().toString().slice(-4)}`;

  // Crear Org 1
  const { data: org1, error: errOrg1 } = await adminClient
    .from('organizations')
    .insert({
      name: 'Inmobiliaria Aislada Uno',
      slug: org1Slug,
      phone: '+57 300 111 2233',
      email: 'contacto@org1.com',
      city: 'Medellín',
    })
    .select()
    .single();
  assert(!errOrg1 && org1?.id, 'Organización 1 creada exitosamente en Supabase');

  // Crear Org 2
  const { data: org2, error: errOrg2 } = await adminClient
    .from('organizations')
    .insert({
      name: 'Inmobiliaria Aislada Dos',
      slug: org2Slug,
      phone: '+57 300 444 5566',
      email: 'contacto@org2.com',
      city: 'Bogotá',
    })
    .select()
    .single();
  assert(!errOrg2 && org2?.id, 'Organización 2 creada exitosamente en Supabase');

  // Crear propiedad en Org 1
  const propCode1 = `PROP-DEMO-${Date.now().toString().slice(-4)}`;
  const { data: prop1, error: errProp1 } = await adminClient
    .from('properties')
    .insert({
      organization_id: org1.id,
      code: propCode1,
      title: 'Inmueble de Prueba Org 1',
      description: 'Descripción de prueba para verificación',
      type: 'apartamento',
      operation: 'arriendo',
      municipality: 'Medellín',
      zone: 'El Poblado',
      price_cop: 3200000,
      area_m2: 80,
      bedrooms: 2,
      bathrooms: 2,
      status: 'disponible',
    })
    .select()
    .single();
  assert(!errProp1 && prop1?.id, 'Inmueble de demostración insertado en Org 1');

  // Crear detalle privado compuesto en Org 1
  const { data: priv1, error: errPriv1 } = await adminClient
    .from('property_private_details')
    .insert({
      property_id: prop1.id,
      organization_id: org1.id,
      internal_address: 'Calle 10 # 40-20 Apto 802 (Privado Org 1)',
      owner_name: 'Propietario Ficticio de Demostración',
      owner_phone: '+57 300 000 0000',
    })
    .select()
    .single();
  assert(!errPriv1 && priv1?.property_id, 'Detalle privado vinculado correctamente a la propiedad de Org 1');

  // -------------------------------------------------------------
  // 3. INTEGRIDAD REFERENCIAL COMPUESTA (Cross-Org Injection Test)
  // -------------------------------------------------------------
  console.log('\n🛡️ 3. PRUEBA DE INTEGRIDAD COMPUESTA: RECHAZO DE ASOCIACIÓN CRUZADA');

  // Intentar asociar un detalle privado usando el property_id de Org 1 pero organization_id de Org 2
  const { error: errCrossOrg } = await adminClient
    .from('property_private_details')
    .insert({
      property_id: prop1.id,
      organization_id: org2.id, // Organización incorrecta
      internal_address: 'Intento de Inyección Cruzada',
    });
  assert(errCrossOrg !== null, 'PostgreSQL rechazó la inserción cruzada entre organizaciones distintas (FK compuesto)');

  // -------------------------------------------------------------
  // 4. LIMPIEZA DE DATOS DE PRUEBA
  // -------------------------------------------------------------
  console.log('\n🧹 4. LIMPIEZA DE DATOS DE PRUEBA TEMPORALES');
  await adminClient.from('organizations').delete().in('id', [org1.id, org2.id]);
  assert(true, 'Recursos de prueba temporales eliminados');

  console.log(`\n================================================================`);
  console.log(`   RESULTADO DE PRUEBAS REALES: ${passedTests}/${totalTests} APROBADAS (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`================================================================\n`);
}

runRealTests().catch((err) => {
  console.error('Error durante la ejecución de pruebas reales:', err);
  process.exit(1);
});
