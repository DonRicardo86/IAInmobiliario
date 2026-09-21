/**
 * TEST SUITE: CAPTACIÓN PÚBLICA SEGURA DE PROSPECTOS Y RESILIENCIA EN SUPABASE
 * IA Inmobiliaria - Validación Integral de Flujo de Leads
 */

import { UnifiedDataService } from './src/core/database/supabase-adapter.ts';
import { PILOT_ORGANIZATION } from './src/core/types/organization.ts';

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

async function runTests() {
  console.log('================================================================');
  console.log('   PRUEBAS DE CAPTACIÓN PÚBLICA DE PROSPECTOS (LEADS)           ');
  console.log('================================================================\n');

  // 1. RESOLUCIÓN DE ORGANIZACIÓN RECEPTORA
  console.log('🏢 1. RESOLUCIÓN DE ORGANIZACIÓN INMOBILIARIA PILOTO');
  const org = await UnifiedDataService.getPublicOrganizationBySlugOrId('inmo-piloto');
  assert(org !== null, 'Organización "inmo-piloto" resuelta correctamente');
  assert(org?.slug === 'inmo-piloto', 'Slug verificado como "inmo-piloto"');
  const targetOrgId = org.id;

  // 2. VALIDACIÓN DE HABEAS DATA
  console.log('\n⚖️ 2. EXIGENCIA DE AUTORIZACIÓN HABEAS DATA (LEY 1581 DE 2012)');
  let habeasDataRejected = false;
  try {
    await UnifiedDataService.createPublicLead({
      organizationId: targetOrgId,
      name: 'Carlos Ficticio',
      phone: '+57 310 999 8888',
      email: 'carlos.ficticio.noconsent@test.com',
      consentHabeasData: false,
    });
  } catch (err) {
    habeasDataRejected = true;
  }
  assert(habeasDataRejected, 'Rechazo garantizado si no se autoriza el tratamiento de datos personales');

  // 3. VALIDACIÓN DE CAMPOS OBLIGATORIOS
  console.log('\n📝 3. VALIDACIÓN DE CAMPOS DE CONTACTO OBLIGATORIOS');
  let missingFieldsRejected = false;
  try {
    await UnifiedDataService.createPublicLead({
      organizationId: targetOrgId,
      name: '',
      phone: '+57 310 000 0000',
      email: '',
      consentHabeasData: true,
    });
  } catch (err) {
    missingFieldsRejected = true;
  }
  assert(missingFieldsRejected, 'Rechazo garantizado ante campos de contacto vacíos');

  // 4. CAPTACIÓN DE PROSPECTO VINCULADO AL INMUEBLE INM-585
  console.log('\n🏠 4. CAPTACIÓN DE PROSPECTO ASOCIADO AL INMUEBLE INM-585');
  const uniqueTestEmail = `prospecto.piloto.${Date.now()}@testficticio.co`;
  const uniqueTestPhone = `+57 304 ${Math.floor(1000000 + Math.random() * 9000000)}`;

  const leadCaptureResult = await UnifiedDataService.createPublicLead({
    organizationId: targetOrgId,
    name: 'Alejandro Morales (Test Ficticio)',
    phone: uniqueTestPhone,
    email: uniqueTestEmail,
    operationType: 'compra',
    propertyType: 'apartamento',
    municipality: 'Medellín',
    zone: 'El Poblado',
    budget: 850000000,
    interestedPropertyIds: ['INM-585'],
    notes: 'Interesado en agendar visita para el inmueble INM-585 en El Poblado.',
    consentHabeasData: true,
    source: 'asistente_ia',
  });

  assert(leadCaptureResult.success === true, 'Prospecto creado satisfactoriamente a través de createPublicLead');
  assert(typeof leadCaptureResult.leadId === 'string' && leadCaptureResult.leadId.length > 0, 'Se retornó un leadId válido');
  assert(leadCaptureResult.isDuplicate === false, 'Primer registro marcado correctamente como nuevo (no duplicado)');

  // 5. COMPORTAMIENTO ANTE REQUERIMIENTO DUPLICADO
  console.log('\n🔄 5. GESTIÓN INTELIGENTE DE DUPLICADOS');
  const duplicateResult = await UnifiedDataService.createPublicLead({
    organizationId: targetOrgId,
    name: 'Alejandro Morales (Test Ficticio)',
    phone: uniqueTestPhone,
    email: uniqueTestEmail,
    operationType: 'compra',
    propertyType: 'apartamento',
    municipality: 'Medellín',
    zone: 'El Poblado',
    budget: 850000000,
    interestedPropertyIds: ['INM-585'],
    notes: 'Segunda consulta: solicita llamada en la mañana.',
    consentHabeasData: true,
    source: 'asistente_ia',
  });

  assert(duplicateResult.success === true, 'La solicitud reiterada se procesa con éxito');
  assert(duplicateResult.isDuplicate === true, 'Identificado como duplicado sin generar inconsistencias');
  assert(duplicateResult.leadId === leadCaptureResult.leadId, 'Se asoció al mismo leadId previo');

  // 6. VERIFICACIÓN DE PERSISTENCIA EN EL CRM
  console.log('\n📊 6. DISPONIBILIDAD EN EL CRM DE INMOBILIARIA PILOTO');
  const leadsInOrg = await UnifiedDataService.getLeads({}, targetOrgId);
  const foundLead = leadsInOrg.find((l) => l.email === uniqueTestEmail || l.phone === uniqueTestPhone);
  assert(foundLead !== undefined, 'El prospecto aparece registrado en la lista de leads de Inmobiliaria Piloto');
  assert(foundLead?.source === 'asistente_ia', 'El origen quedó registrado como asistente_ia');
  assert(foundLead?.status === 'nuevo', 'El estado inicial asignado es "nuevo"');
  assert(foundLead?.priority === 'alto', 'La prioridad asignada es "alto"');
  assert(foundLead?.consentHabeasData === true, 'Se conserva la evidencia de autorización Habeas Data');

  // 7. COMPORTAMIENTO ESTRICTO EN PRODUCCIÓN SIN FALLBACK A MEMORIA
  console.log('\n🛡️ 7. SEGURIDAD EN PRODUCCIÓN: SIN SIMULACIONES NI FALSOS POSITIVOS');
  const originalEnv = process.env.NODE_ENV;
  const originalTestMode = process.env.TEST_MODE;
  const originalDemoMode = process.env.DEMO_MODE;
  
  process.env.NODE_ENV = 'production';
  delete process.env.TEST_MODE;
  delete process.env.DEMO_MODE;

  let productionRejectedWithoutKey = false;
  try {
    // Intentar captar prospecto en modo producción sin cliente administrativo
    await UnifiedDataService.createPublicLead({
      organizationId: targetOrgId,
      name: 'Test Producción',
      phone: '+57 300 111 2222',
      email: 'test.prod@inmobiliaria.co',
      consentHabeasData: true,
    });
  } catch (err) {
    productionRejectedWithoutKey = true;
  }

  // Restaurar entorno de pruebas
  process.env.NODE_ENV = originalEnv;
  if (originalTestMode) process.env.TEST_MODE = originalTestMode;
  if (originalDemoMode) process.env.DEMO_MODE = originalDemoMode;

  assert(productionRejectedWithoutKey, 'En producción, se rechaza la operación si no existe persistencia real configurada (sin falsos positivos)');

  console.log('\n================================================================');
  console.log(`   RESULTADO DE PRUEBAS: ${passedTests}/${totalTests} APROBADAS (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');
}

runTests().catch(console.error);

