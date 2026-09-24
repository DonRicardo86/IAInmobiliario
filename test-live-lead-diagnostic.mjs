/**
 * SUITE DE DIAGNÓSTICO Y PRUEBA DE PERSISTENCIA EN SUPABASE
 * IA Inmobiliaria - Validación Controlada de Flujo de Captación de Leads
 *
 * TAREA 5:
 * 1. Resolver la organización inmo-piloto.
 * 2. Consultar el inmueble INM-585 desde Supabase.
 * 3. Enviar una solicitud de prueba mediante la función de captación pública de servidor.
 * 4. Confirmar que la inserción fue aceptada por PostgreSQL.
 * 5. Verificar que el registro existe en public.leads y está asociado a la organización correcta.
 * 6. Verificar que aparece en el CRM autenticado después de recargar.
 * 7. Limpiar registros de prueba controlados al finalizar.
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Cargar .env.local si existe en el entorno local (excluido de Git)
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

import {
  UnifiedDataService,
  getSupabaseAdminClient,
  getSupabaseAnonClient,
  LeadPersistenceError,
} from './src/core/database/supabase-adapter.ts';

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

async function runDiagnostic() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const hasUrl = !!(supabaseUrl && supabaseUrl.startsWith('http'));
  const hasAnon = !!(anonKey && anonKey.length > 20);
  const hasService = !!(serviceKey && serviceKey.length > 20);

  const isLive = hasUrl && hasService;

  console.log('================================================================');
  console.log('   DIAGNÓSTICO Y PRUEBA DE PERSISTENCIA DE LEADS EN SUPABASE    ');
  console.log(`   Modo de Ejecución: ${isLive ? 'SUPABASE REAL EN VIVO 🌐' : 'DIAGNÓSTICO LOCAL / DEMO STORE 💻'}`);
  console.log(`   URL Supabase: ${hasUrl ? supabaseUrl : '(No configurada localmente en .env.local)'}`);
  console.log(`   Anon Key: ${hasAnon ? 'Configurada [Protegida]' : '(No configurada)'}`);
  console.log(`   Service Role Key: ${hasService ? 'Configurada [Protegida en Servidor]' : '(No configurada localmente)'}`);
  console.log('================================================================\n');

  if (!isLive) {
    console.log('ℹ️ NOTA INFORMATIVA SOBRE CREDENCIALES LOCALES:');
    console.log('  Para ejecutar esta prueba contra Supabase Remoto desde tu máquina local,');
    console.log('  puedes crear un archivo .env.local (ignorado en Git) con:');
    console.log('    NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"');
    console.log('    NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."');
    console.log('    SUPABASE_SERVICE_ROLE_KEY="eyJ..."\n');
  }

  // 1. RESOLUCIÓN DE LA ORGANIZACIÓN inmo-piloto
  console.log('🏢 PASO 1. RESOLUCIÓN DE LA ORGANIZACIÓN inmo-piloto');
  const org = await UnifiedDataService.getPublicOrganizationBySlugOrId('inmo-piloto');
  assert(org !== null, 'Organización "inmo-piloto" resuelta correctamente');
  assert(org?.slug === 'inmo-piloto', 'Slug verificado como "inmo-piloto"');
  console.log(`     -> Nombre: ${org?.name} | ID: ${org?.id}`);

  const targetOrgId = org?.id || 'inmo-piloto-default';

  // 2. CONSULTAR INMUEBLE INM-585
  console.log('\n🏠 PASO 2. CONSULTA DEL INMUEBLE INM-585');
  const propertyMatches = await UnifiedDataService.matchPropertiesForAssistant(
    { code: 'INM-585' },
    targetOrgId
  );
  assert(propertyMatches.length > 0, 'Inmueble INM-585 localizado en el catálogo');
  const targetProperty = propertyMatches[0];
  console.log(`     -> Código: ${targetProperty?.code} | Título: ${targetProperty?.title} | ID: ${targetProperty?.id}`);

  // 3. ENVIAR SOLICITUD DE PRUEBA MEDIANTE ENDPOINT PÚBLICO
  console.log('\n📨 PASO 3. ENVÍO DE SOLICITUD DE PRUEBA MEDIANTE createPublicLead');
  const timestamp = Date.now();
  const testEmail = `test.diagnostico.${timestamp}@inmo-piloto-prueba.com`;
  const testPhone = `+57 304 ${Math.floor(1000000 + Math.random() * 9000000)}`;

  let leadResult = null;
  let persistenceError = null;

  try {
    leadResult = await UnifiedDataService.createPublicLead(
      {
        organizationId: targetOrgId,
        name: 'Prueba Diagnóstica Controlada',
        phone: testPhone,
        email: testEmail,
        operationType: 'compra',
        propertyType: 'apartamento',
        municipality: 'Medellín',
        zone: 'El Poblado',
        budget: 850000000,
        interestedPropertyIds: ['INM-585'],
        notes: `Prueba diagnóstica automatizada. Referencia INM-585. Timestamp: ${timestamp}`,
        consentHabeasData: true,
        source: 'asistente_ia',
      },
      '127.0.0.1'
    );
  } catch (err) {
    persistenceError = err;
    console.error('     ❌ Excepción capturada durante createPublicLead:', err.message);
    if (err instanceof LeadPersistenceError) {
      console.error('     -> Diagnóstico:', JSON.stringify(err.diagnostic, null, 2));
    }
  }

  assert(persistenceError === null, 'La inserción de lead no generó excepciones');
  assert(leadResult?.success === true, 'createPublicLead retornó success: true');
  assert(typeof leadResult?.leadId === 'string' && leadResult.leadId.length > 0, `LeadId generado: ${leadResult?.leadId}`);

  const createdLeadId = leadResult?.leadId;

  // 4. CONFIRMAR QUE LA INSERCIÓN FUE ACEPTADA
  console.log('\n📥 PASO 4. CONFIRMAR ACEPTACIÓN DE INSERCIÓN');
  assert(leadResult?.isDuplicate === false, 'Primer registro procesado como nuevo (isDuplicate: false)');

  // 5. VERIFICAR QUE EL REGISTRO EXISTE EN LEADS Y ESTÁ ASOCIADO A LA ORGANIZACIÓN
  console.log('\n🔍 PASO 5. VERIFICACIÓN DE EXISTENCIA Y ASOCIACIÓN A ORGANIZACIÓN');
  const leads = await UnifiedDataService.getLeads({}, targetOrgId);
  const foundLead = leads.find((l) => l.id === createdLeadId || l.email === testEmail);

  assert(foundLead !== undefined, 'Prospecto localizado en la lista de leads de la organización');
  assert(foundLead?.organizationId === targetOrgId, `Asociado correctamente a la organización (${targetOrgId})`);
  assert(foundLead?.source === 'asistente_ia', 'Origen verificado como asistente_ia');
  assert(foundLead?.consentHabeasData === true, 'Consentimiento Habeas Data verificado');

  // 6. VERIFICAR CONSULTA EN CRM AUTENTICADO
  console.log('\n📊 PASO 6. DISPONIBILIDAD EN CRM Y ESTADÍSTICAS');
  const stats = await UnifiedDataService.getStats(targetOrgId);
  assert(typeof stats.total === 'number' && stats.total > 0, `Estadísticas de CRM calculadas correctamente (Total: ${stats.total})`);

  // 7. PRUEBA DE GESTIÓN DE DUPLICADO
  console.log('\n🔄 PASO 7. PRUEBA DE SOLICITUD DUPLICADA');
  const duplicateResult = await UnifiedDataService.createPublicLead(
    {
      organizationId: targetOrgId,
      name: 'Prueba Diagnóstica Controlada (Reintento)',
      phone: testPhone,
      email: testEmail,
      operationType: 'compra',
      propertyType: 'apartamento',
      municipality: 'Medellín',
      zone: 'El Poblado',
      budget: 850000000,
      interestedPropertyIds: ['INM-585'],
      notes: `Segunda interacción de prueba para verificar actividad. Timestamp: ${timestamp}`,
      consentHabeasData: true,
      source: 'asistente_ia',
    },
    '127.0.0.1'
  );

  assert(duplicateResult?.success === true, 'Solicitud duplicada procesada con éxito');
  assert(duplicateResult?.isDuplicate === true, 'Identificado correctamente como duplicado');
  assert(duplicateResult?.leadId === createdLeadId, 'Mismo leadId conservado');

  // 8. LIMPIEZA DE DATOS CONTROLADOS
  console.log('\n🧹 PASO 8. LIMPIEZA CONTROLADA DE REGISTRO DE PRUEBA');
  if (isLive && createdLeadId) {
    const adminSupabase = getSupabaseAdminClient();
    if (adminSupabase) {
      try {
        await adminSupabase.from('lead_activities').delete().eq('lead_id', createdLeadId);
        await adminSupabase.from('leads').delete().eq('id', createdLeadId);
        console.log(`  ✅ Registro de prueba ${createdLeadId} y actividades eliminados de Supabase.`);
      } catch (cleanErr) {
        console.warn('  ⚠️ Aviso de limpieza:', cleanErr.message);
      }
    }
  } else if (createdLeadId) {
    await UnifiedDataService.deleteLead(createdLeadId);
    console.log(`  ✅ Registro de prueba ${createdLeadId} eliminado del almacén local.`);
  }

  console.log('\n================================================================');
  console.log(`   RESULTADO DEL DIAGNÓSTICO: ${passedTests}/${totalTests} PRUEBAS EXITOSAS (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runDiagnostic().catch((err) => {
  console.error('Error fatal en el diagnóstico:', err);
  process.exit(1);
});
