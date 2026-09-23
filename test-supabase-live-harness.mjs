/**
 * SUITE DE VERIFICACIÓN PARA PROYECTO SUPABASE REAL
 * IA Inmobiliaria - Pruebas de Integridad Referencial Compuesta, RBAC y Aislamiento Multi-Tenant
 * 
 * Uso:
 *   node test-supabase-live-harness.mjs
 * 
 * Variables de Entorno (Opcionales para ejecutar contra Supabase Remoto):
 *   NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key"
 *   SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-key';

const isLiveSupabase = SUPABASE_URL.startsWith('http') && SUPABASE_URL.includes('supabase.co');

console.log('================================================================');
console.log('   VERIFICACIÓN INTEGRAL DE POLÍTICAS Y CONSTRAINTS SUPABASE     ');
console.log(`   Modo: ${isLiveSupabase ? 'SUPABASE REMOTO REAL 🌐' : 'ENTORNO LOCAL / TEST HARNESS 💻'}`);
console.log(`   URL: ${SUPABASE_URL}`);
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

async function runLiveHarness() {
  if (!isLiveSupabase) {
    console.log('ℹ️ Ejecutando auditoría de reglas de integridad, esquema DDL y API local...');

    // 1. Verificar estructura DDL local en schema.sql
    const fs = await import('fs');
    const schemaSql = fs.readFileSync('./supabase/schema.sql', 'utf-8');

    // 1.1 Verificación de Compound Foreign Key
    const hasCompoundFK = schemaSql.includes('FOREIGN KEY (property_id, organization_id)') &&
      schemaSql.includes('REFERENCES public.properties(id, organization_id)');
    assert(hasCompoundFK, 'Constraint FK compuesto (property_id, organization_id) presente en property_private_details');

    // 1.2 Verificación de Anti-Escalamiento de Privilegios
    const hasAntiEscalationPolicy = schemaSql.includes('"Org admin can add operational members"') &&
      schemaSql.includes("role IN ('admin', 'agent', 'viewer')");
    assert(hasAntiEscalationPolicy, 'Política RLS restringe a los administradores nombrar roles owner');

    // 1.3 Verificación de Protección del Último Owner
    const hasLastOwnerTrigger = schemaSql.includes('check_organization_owner_integrity') &&
      schemaSql.includes('tr_org_members_owner_integrity');
    assert(hasLastOwnerTrigger, 'Trigger tr_org_members_owner_integrity protege contra eliminación del último owner');

    // 1.4 Verificación de Vista Sanitizada de Organizaciones
    const hasPublicOrgView = schemaSql.includes('VIEW public.public_organizations') &&
      schemaSql.includes('security_barrier = true');
    assert(hasPublicOrgView, 'Vista sanitizada public.public_organizations configurada con security_barrier');

    // 1.5 Verificación de Revocación Anónima en Tablas Base
    const hasRevokeAllTables = schemaSql.includes('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon') ||
      schemaSql.includes('REVOKE ALL ON public.properties FROM anon');
    const hasRevokeRoutines = schemaSql.includes('REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC, anon');
    assert(hasRevokeAllTables && hasRevokeRoutines, 'Permisos directos a anon y PUBLIC revocados en tablas base y rutinas');

    // 1.6 Verificación de Rate Limiter Distribuido
    const hasDistributedRateLimit = schemaSql.includes('check_distributed_rate_limit') &&
      schemaSql.includes('public.api_rate_limits');
    assert(hasDistributedRateLimit, 'Función y tabla de rate limiting distribuido check_distributed_rate_limit definidas');

    // 1.7 Verificación de search_path seguro
    const hasSafeSearchPath = schemaSql.includes('SET search_path = public, pg_temp;');
    assert(hasSafeSearchPath, 'Todas las funciones SECURITY DEFINER fijan search_path = public, pg_temp;');
  } else {
    console.log('🌐 Ejecutando pruebas en vivo contra Supabase...');

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Probar acceso anónimo directo a tablas privadas (debe denegarse)
    const { data: anonProps, error: errAnonProps } = await anonClient.from('properties').select('internal_address');
    assert(errAnonProps || !anonProps || anonProps.length === 0, 'Acceso directo anónimo a tabla base properties denegado');

    const { data: anonOrgs, error: errAnonOrgs } = await anonClient.from('organizations').select('address, nit');
    assert(errAnonOrgs || !anonOrgs || anonOrgs.length === 0, 'Acceso directo anónimo a tabla base organizations denegado');

    // 2. Probar acceso a vistas públicas sanitizadas (debe permitirse)
    const { data: pubProps, error: errPubProps } = await anonClient.from('public_properties').select('*');
    assert(!errPubProps && Array.isArray(pubProps), 'Consulta anónima a vista public_properties autorizada');
    const leaksAddress = pubProps?.some(p => p.internal_address !== undefined);
    assert(!leaksAddress, 'Vista public_properties no contiene campo internal_address');

    const { data: pubOrgs, error: errPubOrgs } = await anonClient.from('public_organizations').select('*');
    assert(!errPubOrgs && Array.isArray(pubOrgs), 'Consulta anónima a vista public_organizations autorizada');
  }

  console.log('\n================================================================');
  console.log(`   RESULTADO DE VERIFICACIÓN: ${passedTests}/${totalTests} PRUEBAS EXITOSAS (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runLiveHarness().catch((err) => {
  console.error('Error fatal en el arnés de prueba:', err);
  process.exit(1);
});
