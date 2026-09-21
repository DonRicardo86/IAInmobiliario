/**
 * Test Integral de Multi-Tenancy, Aislamiento, Seguridad y Asistente IA
 * IA Inmobiliaria SaaS
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const ADMIN_SECRET = 'ia-admin-secret-dev';

async function runComprehensiveTests() {
  console.log('================================================================');
  console.log('   AUDITORÍA DE MULTI-TENANCY, SEGURIDAD Y ASISTENTE IA        ');
  console.log(`   URL Base: ${BASE_URL}`);
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message, extraData) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      if (extraData) console.error('  Detalles:', extraData);
      throw new Error(`Prueba fallida: ${message}`);
    }
  }

  // Helper para llamadas HTTP
  async function apiCall(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }
    return { status: res.status, data };
  }

  const tokenOrg1 = `Bearer ${ADMIN_SECRET}:org_inmo_premier_001`;
  const tokenOrg2 = `Bearer ${ADMIN_SECRET}:org_cardona_real_002`;

  console.log('🏢 1. AISLAMIENTO MULTI-TENANT ENTRE ORGANIZACIONES');

  // 1.1 Crear propiedad para Inmobiliaria Premier (Org 1)
  const codeOrg1 = `PREM-${Date.now().toString().slice(-4)}`;
  const prop1Res = await apiCall('/api/properties', {
    method: 'POST',
    headers: { Authorization: tokenOrg1 },
    body: JSON.stringify({
      code: codeOrg1,
      title: `Apartamento Premier Lujo ${codeOrg1}`,
      type: 'apartamento',
      operation: 'compra',
      municipality: 'Medellín',
      zone: 'El Poblado',
      priceCOP: 1200000000,
      areaM2: 120,
      bedrooms: 3,
      bathrooms: 3,
      internalAddress: 'Cra 43A # 1-50 Torre Apto 1002 (Clave Propietario: 5544)',
    }),
  });
  assert(prop1Res.status === 201, `Propiedad creada para Org 1 (${codeOrg1}) con status 201`, prop1Res);
  const prop1Id = prop1Res.data.property.id;

  // 1.2 Crear propiedad para Inmobiliaria Cardona (Org 2)
  const codeOrg2 = `CARD-${Date.now().toString().slice(-4)}`;
  const prop2Res = await apiCall('/api/properties', {
    method: 'POST',
    headers: { Authorization: tokenOrg2 },
    body: JSON.stringify({
      code: codeOrg2,
      title: `Casa Campestre Cardona ${codeOrg2}`,
      type: 'casa',
      operation: 'arriendo',
      municipality: 'Rionegro',
      zone: 'Llanogrande',
      priceCOP: 8500000,
      areaM2: 280,
      bedrooms: 4,
      bathrooms: 4,
      internalAddress: 'Km 7 Vía Llanogrande Parcela 42 (Propietario Privado)',
    }),
  });
  assert(prop2Res.status === 201, `Propiedad creada para Org 2 (${codeOrg2}) con status 201`, prop2Res);
  const prop2Id = prop2Res.data.property.id;

  // 1.3 Verificar aislamiento en listado: Org 1 no debe ver la propiedad de Org 2
  const listOrg1Res = await apiCall('/api/properties', {
    method: 'GET',
    headers: { Authorization: tokenOrg1 },
  });
  assert(listOrg1Res.status === 200, 'Consulta de propiedades de Org 1 exitosa');
  const org1HasProp1 = listOrg1Res.data.properties.some((p) => p.code === codeOrg1);
  const org1HasProp2 = listOrg1Res.data.properties.some((p) => p.code === codeOrg2);
  assert(org1HasProp1, `Org 1 contiene su propia propiedad ${codeOrg1}`);
  assert(!org1HasProp2, `Org 1 NO contiene la propiedad ajena ${codeOrg2} de Org 2`);

  // 1.4 Verificar aislamiento en listado de Org 2
  const listOrg2Res = await apiCall('/api/properties', {
    method: 'GET',
    headers: { Authorization: tokenOrg2 },
  });
  assert(listOrg2Res.status === 200, 'Consulta de propiedades de Org 2 exitosa');
  const org2HasProp2 = listOrg2Res.data.properties.some((p) => p.code === codeOrg2);
  const org2HasProp1 = listOrg2Res.data.properties.some((p) => p.code === codeOrg1);
  assert(org2HasProp2, `Org 2 contiene su propia propiedad ${codeOrg2}`);
  assert(!org2HasProp1, `Org 2 NO contiene la propiedad ajena ${codeOrg1} de Org 1`);

  console.log('\n🔒 2. SEGURIDAD, ACCESO ANÓNIMO Y SANITIZACIÓN');

  // 2.1 Visor público no expone direcciones internas
  const publicPropsRes = await apiCall('/api/properties?view=public');
  assert(publicPropsRes.status === 200, 'Catálogo público responde HTTP 200');
  const exposedAddresses = publicPropsRes.data.properties.filter(
    (p) => p.internalAddress && !p.internalAddress.includes('protegida')
  );
  assert(exposedAddresses.length === 0, 'Ninguna dirección privada expuesta en el catálogo público');

  // 2.2 Intentos anónimos de mutación administrativa rechazados con 401
  const anonPostRes = await apiCall('/api/properties', {
    method: 'POST',
    body: JSON.stringify({ code: 'HACK-01', title: 'Hacked Property', priceCOP: 50000000 }),
  });
  assert(anonPostRes.status === 401, 'Creación anónima de inmuebles rechazada con HTTP 401 Unauthorized');

  const anonDeleteRes = await apiCall(`/api/properties/${prop1Id}`, {
    method: 'DELETE',
  });
  assert(anonDeleteRes.status === 401, 'Eliminación anónima rechazada con HTTP 401 Unauthorized');

  console.log('\n📋 3. CAPTACIÓN DE PROSPECTOS, HABEAS DATA Y DUPLICADOS');

  // 3.1 Rechazo sin consentimiento de Habeas Data
  const leadNoConsentRes = await apiCall('/api/leads', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Usuario Sin Consentimiento',
      phone: '+573110001122',
      email: 'sinconsentimiento@test.com',
      consentHabeasData: false,
    }),
  });
  assert(leadNoConsentRes.status === 400, 'Rechazo inmediato por falta de Habeas Data (Status 400)');

  // 3.2 Registro exitoso de prospecto con consentimiento
  const testEmail = `prospecto-${Date.now()}@inversionistas.co`;
  const testPhone = `+57315${Date.now().toString().slice(-6)}`;
  const lead1Res = await apiCall('/api/leads', {
    method: 'POST',
    headers: { Authorization: tokenOrg1 },
    body: JSON.stringify({
      name: 'Alejandro Restrepo Botero',
      phone: testPhone,
      email: testEmail,
      operationType: 'compra',
      propertyType: 'apartamento',
      zone: 'El Poblado',
      budget: 1200000000,
      consentHabeasData: true,
      interestedPropertyIds: [prop1Id],
    }),
  });
  assert(lead1Res.status === 201, `Prospecto registrado en Org 1 con status 201 (ID: ${lead1Res.data.lead?.id})`);
  const lead1Id = lead1Res.data.lead.id;

  // 3.3 Prevención de duplicados: Segundo intento con el mismo email/teléfono
  const duplicateLeadRes = await apiCall('/api/leads', {
    method: 'POST',
    headers: { Authorization: tokenOrg1 },
    body: JSON.stringify({
      name: 'Alejandro Restrepo Botero (Reingreso)',
      phone: testPhone,
      email: testEmail,
      notes: 'Consulta adicional sobre formas de pago',
      consentHabeasData: true,
    }),
  });
  assert(duplicateLeadRes.status === 200, 'Detección de duplicado exitosa sin crear registro redundante');
  assert(duplicateLeadRes.data.duplicateDetected === true, 'Bandera duplicateDetected confirmada como TRUE');

  console.log('\n🤖 4. ASISTENTE SOFIA Y CONSULTA DE INVENTARIO MULTI-TENANT');

  // 4.1 Consulta de SofIA para Inmobiliaria Premier
  const sofiaPremierRes = await apiCall('/api/ai/assistant', {
    method: 'POST',
    body: JSON.stringify({
      organizationId: 'org_inmo_premier_001',
      messages: [
        {
          role: 'user',
          content: 'Busco apartamento en compra en El Poblado con presupuesto de 1200 millones',
        },
      ],
    }),
  });
  assert(sofiaPremierRes.status === 200, 'Asistente responde HTTP 200 para Org 1');
  const matchedPremier = sofiaPremierRes.data.matchedProperties || [];
  assert(matchedPremier.length > 0, `SofIA encontró ${matchedPremier.length} propiedades confirmadas`);
  assert(matchedPremier.some((p) => p.code === codeOrg1), `SofIA incluyó la propiedad ${codeOrg1} de Org 1`);

  // 4.2 Consulta de SofIA para Inmobiliaria Cardona
  const sofiaCardonaRes = await apiCall('/api/ai/assistant', {
    method: 'POST',
    body: JSON.stringify({
      organizationId: 'org_cardona_real_002',
      messages: [
        {
          role: 'user',
          content: 'Busco casa en arriendo en Rionegro Llanogrande',
        },
      ],
    }),
  });
  assert(sofiaCardonaRes.status === 200, 'Asistente responde HTTP 200 para Org 2');
  const matchedCardona = sofiaCardonaRes.data.matchedProperties || [];
  assert(matchedCardona.some((p) => p.code === codeOrg2), `SofIA Cardona encontró la casa ${codeOrg2} de Org 2`);

  // 4.3 Verificación Anti-Alucinación: Búsqueda sin coincidencias reales
  const sofiaNoMatchRes = await apiCall('/api/ai/assistant', {
    method: 'POST',
    body: JSON.stringify({
      organizationId: 'org_inmo_premier_001',
      messages: [
        {
          role: 'user',
          content: 'Busco penthouse en arriendo en Leticia Amazonas por $300.000',
        },
      ],
    }),
  });
  assert(sofiaNoMatchRes.status === 200, 'SofIA responde honestamente ante búsquedas sin inventario');
  assert((sofiaNoMatchRes.data.matchedProperties || []).length === 0, 'SofIA NO inventó propiedades inexistentes');

  console.log('\n📊 5. CRM, HISTORIAL DE ACTIVIDADES Y MÉTRICAS');

  // 5.1 Actualizar estado del prospecto
  const updateLeadRes = await apiCall(`/api/leads/${lead1Id}`, {
    method: 'PUT',
    headers: { Authorization: tokenOrg1 },
    body: JSON.stringify({
      status: 'visita_agendada',
      activity: {
        description: 'Visita presencial agendada para el sábado a las 10:00 AM con Laura Gómez.',
        type: 'visit_scheduled',
        author: 'Laura Gómez (Asesora)',
      },
    }),
  });
  assert(updateLeadRes.status === 200, 'Estado del prospecto actualizado a visita_agendada');
  assert(updateLeadRes.data.lead?.status === 'visita_agendada', 'Estado verificado en respuesta');

  // 5.2 Limpieza de datos temporales
  await apiCall(`/api/properties/${prop1Id}`, { method: 'DELETE', headers: { Authorization: tokenOrg1 } });
  await apiCall(`/api/properties/${prop2Id}`, { method: 'DELETE', headers: { Authorization: tokenOrg2 } });
  await apiCall(`/api/leads/${lead1Id}`, { method: 'DELETE', headers: { Authorization: tokenOrg1 } });

  console.log('\n================================================================');
  console.log(`   RESULTADO AUDITORÍA MULTI-TENANT: ${passed}/${total} PRUEBAS EXITOSAS (100%)`);
  console.log('================================================================\n');
}

runComprehensiveTests().catch((err) => {
  console.error('Error fatal durante la auditoría:', err);
  process.exit(1);
});
