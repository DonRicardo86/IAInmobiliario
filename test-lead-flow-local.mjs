/**
 * SUITE DE PRUEBAS DE FLUJO LOCAL DE CAPTACIÓN DE PROSPECTOS
 * IA Inmobiliaria - Simulación de Captación y Validación de Rate Limiting
 */

import { UnifiedDataService } from './src/core/database/supabase-adapter.ts';
import { checkRateLimit, extractClientIp } from './src/core/auth/auth-guard.ts';
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

async function runLocalFlowTests() {
  console.log('================================================================');
  console.log('   PRUEBA INTEGRAL DE RATE LIMITING Y CAPTACIÓN DE PROSPECTOS   ');
  console.log('================================================================\n');

  const testIp = `190.145.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
  const chatBucket = 'api/ai/assistant/chat';
  const leadBucket = 'api/ai/assistant/lead';

  // 1. COMPROBAR AISLAMIENTO DE BUCKETS (CHAT VS FORMULARIO DE CAPTACIÓN)
  console.log('🚦 1. AISLAMIENTO DE CONTADORES (CHAT VS FORMULARIO)');
  
  // Realizar 5 consultas de chat
  for (let i = 0; i < 5; i++) {
    const allowed = await checkRateLimit(testIp, chatBucket, 60, 60);
    if (!allowed) break;
  }

  // Comprobar que el bucket de leads sigue completamente disponible (15 disponibles)
  const leadFirstAttempt = await checkRateLimit(testIp, leadBucket, 15, 60);
  assert(leadFirstAttempt === true, 'El formulario de asesoría no se ve afectado por la actividad previa de chat');

  // 2. COMPROBAR QUE NO SE BLOQUEA EN EL PRIMER INTENTO POR ERRORES DE DB
  console.log('\n🛡️ 2. RESILIENCIA: SIN FALSOS POSITIVOS EN EL PRIMER INTENTO');
  const freshIp = `201.244.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
  const freshAttempt = await checkRateLimit(freshIp, leadBucket, 15, 60);
  assert(freshAttempt === true, 'Una solicitud legítima en el primer intento es permitida sin falsos 429');

  // 3. VALIDACIÓN DE HABEAS DATA OBLIGATORIO
  console.log('\n⚖️ 3. EXIGENCIA DE HABEAS DATA');
  let rejectedNoConsent = false;
  try {
    await UnifiedDataService.createPublicLead({
      organizationId: PILOT_ORGANIZATION.id,
      name: 'Usuario Sin Consentimiento',
      phone: '+57 300 123 4567',
      email: 'noconsent@test.com',
      consentHabeasData: false,
    });
  } catch (err) {
    rejectedNoConsent = true;
  }
  assert(rejectedNoConsent, 'Rechazo estricto ante ausencia de autorización de datos personales');

  // 4. PERSISTENCIA DE PROSPECTO PARA INMOBILIARIA PILOTO
  console.log('\n🏠 4. PERSISTENCIA DE PROSPECTO ASOCIADO AL INMUEBLE INM-585');
  const testEmail = `prospecto.flow.${Date.now()}@testficticio.co`;
  const testPhone = `+57 304 ${Math.floor(1000000 + Math.random() * 9000000)}`;

  const created = await UnifiedDataService.createPublicLead({
    organizationId: PILOT_ORGANIZATION.id,
    name: 'Usuario Piloto Prueba',
    phone: testPhone,
    email: testEmail,
    operationType: 'arriendo',
    propertyType: 'apartamento',
    municipality: 'Medellín',
    zone: 'Laureles',
    budget: 2000000,
    interestedPropertyIds: ['INM-585'],
    notes: 'Interesado en canon de arriendo para INM-585',
    consentHabeasData: true,
    source: 'asistente_ia',
  });

  assert(created.success === true, 'Prospecto procesado exitosamente por UnifiedDataService');
  assert(created.isDuplicate === false, 'Primer intento marcado como nuevo registro');
  assert(typeof created.leadId === 'string' && created.leadId.length > 0, 'ID de prospecto generado');

  // 5. CONSULTA EN EL CRM
  console.log('\n📊 5. DISPONIBILIDAD EN CRM DE INMOBILIARIA PILOTO');
  const allLeads = await UnifiedDataService.getLeads({}, PILOT_ORGANIZATION.id);
  const found = allLeads.find((l) => l.email === testEmail || l.phone === testPhone);
  assert(found !== undefined, 'Prospecto visible en la lista del CRM de Inmobiliaria Piloto');
  assert(found?.source === 'asistente_ia', 'Origen verificado como asistente_ia');
  assert(found?.consentHabeasData === true, 'Evidencia de Habeas Data conservada');

  console.log('\n================================================================');
  console.log(`   RESULTADO DE PRUEBAS: ${passedTests}/${totalTests} APROBADAS (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runLocalFlowTests().catch((err) => {
  console.error('Error en pruebas de flujo:', err);
  process.exit(1);
});
