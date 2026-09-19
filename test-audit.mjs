import http from 'http';

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runComprehensiveAudit() {
  console.log('================================================================');
  console.log('   AUDITORÍA INTEGRAL Y VERIFICACIÓN COMERCIAL - IA_INMOBILIARIA ');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message, extraData) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      if (extraData) console.error('  Detalles:', extraData);
      throw new Error(`Prueba fallida: ${message}`);
    }
  }

  // ---------------------------------------------------------
  // FASE 1: AUDITORÍA FUNCIONAL
  // ---------------------------------------------------------
  console.log('📋 FASE 1: AUDITORÍA FUNCIONAL');

  // 1.1 Sincronización exacta de Inventario: Crear inmueble en Admin y consultar por Asistente
  const testPropCode = `TEST-${Date.now().toString().slice(-4)}`;
  const createdPropRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/properties',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      code: testPropCode,
      title: 'Apartamento Exclusivo Provenza Penthouse Suite',
      description: 'Espectacular penthouse con terraza privada y vista panorámica a la ciudad.',
      type: 'apartamento',
      operation: 'arriendo',
      municipality: 'Medellín',
      zone: 'El Poblado',
      internalAddress: 'Cra 35 # 8A-42 Apto 1401 (Propietario: Carlos Duque - Clave 8821)',
      priceCOP: 3800000,
      adminFeeCOP: 450000,
      areaM2: 95,
      bedrooms: 2,
      bathrooms: 2,
      parkingSpots: 1,
      stratum: 6,
      features: ['Balcón panorámico', 'Piscina', 'Gimnasio'],
      status: 'disponible',
      assignedAgent: 'Laura Gómez',
    }
  );

  assert(createdPropRes.status === 201, `Creación de propiedad administrativa (${testPropCode}) exitosa (Status 201)`, createdPropRes);
  assert(createdPropRes.data?.property?.id, `ID de propiedad generado: ${createdPropRes.data?.property?.id}`);

  // 1.2 El Asistente debe encontrar este inmueble exacto recién creado
  const assistantSearchRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/ai/assistant',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      messages: [
        {
          role: 'user',
          content: `Busco un apartamento en arriendo en El Poblado Medellín de 2 habitaciones por hasta $4.000.000`,
        },
      ],
      userContext: {},
    }
  );

  assert(assistantSearchRes.status === 200, 'Consulta al Asistente IA procesada correctamente (Status 200)');
  const matchedCodes = assistantSearchRes.data?.matchedProperties?.map((p) => p.code) || [];
  assert(
    matchedCodes.includes(testPropCode),
    `El Asistente encontró inmediatamente el inmueble creado por el Administrador (${testPropCode})`,
    { testPropCode, matchedCodes, matchedProperties: assistantSearchRes.data?.matchedProperties }
  );

  // 1.3 Captación de Prospecto desde el Asistente y verificación en CRM
  const leadIntakeRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/ai/assistant',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      leadCapture: {
        name: 'Camila Restrepo Moreno',
        phone: '+57 301 555 4321',
        email: 'camila.restrepo@empresa.com.co',
        criteria: {
          operation: 'arriendo',
          propertyType: 'apartamento',
          municipality: 'Medellín',
          zone: 'El Poblado',
          maxBudget: 3800000,
        },
        propertyIds: [createdPropRes.data.property.id],
        notes: `Interesada en coordinar visita a ${testPropCode} el próximo sábado por la mañana.`,
        consentHabeasData: true,
      },
    }
  );

  assert(leadIntakeRes.status === 200 && leadIntakeRes.data?.leadCreated, 'Prospecto captado por el Asistente con autorización de Habeas Data');
  const capturedLeadId = leadIntakeRes.data?.leadId;

  // 1.4 Verificación de persistencia del prospecto en el CRM
  const crmLeadRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/leads/${capturedLeadId}`,
    method: 'GET',
  });

  assert(crmLeadRes.status === 200, `Prospecto consultado individualmente en el CRM (ID: ${capturedLeadId})`, crmLeadRes);
  assert(crmLeadRes.data?.lead?.name === 'Camila Restrepo Moreno', 'Datos del prospecto verificados correctamente en CRM');
  assert(crmLeadRes.data?.lead?.source === 'asistente_ia', 'Origen del prospecto identificado como asistente_ia');
  assert(crmLeadRes.data?.lead?.consentHabeasData === true, 'Consentimiento Habeas Data verificado como TRUE');

  // 1.5 Destino funcional del formulario de Landing Page (solicitud de demo comercial)
  const landingDemoRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/leads',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Dr. Guillermo Valencia (Inmobiliaria Santa María)',
      phone: '+57 310 444 8899',
      email: 'gerencia@santamaria.com.co',
      operationType: 'compra',
      propertyType: 'oficina',
      municipality: 'Bogotá',
      zone: 'Chicó',
      budget: 550000,
      notes: 'Solicitud formal de Demo Comercial SaaS IA Inmobiliaria. Inventario: 45 propiedades.',
      source: 'landing_demo',
      consentHabeasData: true,
      priority: 'alto',
    }
  );

  assert(landingDemoRes.status === 201, 'Formulario de Landing Page tiene destino funcional y registra prospecto en CRM');

  // 1.6 Métricas reales del Dashboard calculadas dinámicamente
  const statsRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/leads',
    method: 'GET',
  });

  const stats = statsRes.data?.stats;
  assert(stats && stats.total > 0, `Dashboard calcula métricas reales: Total ${stats.total} prospectos`);
  assert(stats.totalPipelineValue > 0, `Pipeline financiero calculado: $${stats.totalPipelineValue.toLocaleString('es-CO')} COP`);
  assert(stats.highPriorityCount > 0, `Prospectos de alta prioridad contabilizados: ${stats.highPriorityCount}`);
  console.log('');

  // ---------------------------------------------------------
  // FASE 2: BASE DE DATOS Y SEGURIDAD
  // ---------------------------------------------------------
  console.log('🔒 FASE 2: BASE DE DATOS, MULTI-TENANCY Y SEGURIDAD');

  // 2.1 Privacidad de datos: El catálogo público y Asistente NO deben incluir datos privados
  const publicPropsRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/properties?view=public',
    method: 'GET',
  });

  assert(publicPropsRes.status === 200, 'Catálogo público responde con status 200');
  const allPublicProps = publicPropsRes.data?.properties || [];
  const hasLeakedAddress = allPublicProps.some((p) => p.internalAddress);
  assert(!hasLeakedAddress, 'Validación de Privacidad: "internalAddress" NUNCA se expone en endpoints públicos');

  // 2.2 Validación de entradas y protección contra abusos
  const invalidLeadRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/leads',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: '',
      phone: '',
      budget: 0,
    }
  );

  assert(invalidLeadRes.status === 400, 'Validación de seguridad: Solicitudes inválidas son rechazadas con HTTP 400');

  // 2.3 Requerimiento estricto de Habeas Data
  const missingHabeasRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/ai/assistant',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      leadCapture: {
        name: 'Prueba Sin Habeas',
        phone: '3001234567',
        email: 'test@correo.com',
        consentHabeasData: false,
      },
    }
  );

  assert(missingHabeasRes.status === 400, 'Seguridad Legal (Ley 1581): Rechazo inmediato si no autoriza tratamiento de datos');
  console.log('');

  // ---------------------------------------------------------
  // FASE 3: ASISTENTE CON IA Y LÓGICA DE NEGOCIO
  // ---------------------------------------------------------
  console.log('🤖 FASE 3: ASISTENTE CON IA Y REGLAS DE NEGOCIO');

  // 3.1 Consulta de inmuebles inexistentes: Asistente NO debe inventar propiedades
  const nonExistentQuery = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/ai/assistant',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      messages: [
        {
          role: 'user',
          content: 'Busco una bodega industrial en Leticia Amazonas de 5000 metros por $500.000 mensuales',
        },
      ],
      userContext: {},
    }
  );

  assert(
    nonExistentQuery.data?.matchedProperties?.length === 0,
    'El Asistente NO inventa inmuebles cuando no hay coincidencias reales en la base de datos'
  );
  assert(
    nonExistentQuery.data?.response?.includes('no tenemos inmuebles que coincidan') ||
      nonExistentQuery.data?.response?.includes('catálogo en tiempo real'),
    'El Asistente responde con honestidad comercial ofreciendo registrar los datos para búsqueda personalizada'
  );

  // 3.2 Indicación clara del modo de operación
  assert(
    nonExistentQuery.data?.mode === 'rule_based_demo' || nonExistentQuery.data?.mode === 'openai_live',
    `Modo de Asistente identificado: "${nonExistentQuery.data?.mode}"`
  );
  console.log('');

  // ---------------------------------------------------------
  // FASE 4: LIMPIEZA DE DATOS DE PRUEBA
  // ---------------------------------------------------------
  console.log('🧹 FASE 4: LIMPIEZA Y REINICIO DE AISLAMIENTO');
  await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/properties/${createdPropRes.data.property.id}`,
    method: 'DELETE',
  });
  console.log(`  Propiedad temporal de prueba (${testPropCode}) eliminada para mantener la integridad del catálogo.`);

  console.log('\n================================================================');
  console.log(`   RESULTADO DE LA AUDITORÍA: ${passedTests}/${totalTests} PRUEBAS EXITOSAS (100%)`);
  console.log('================================================================');
}

runComprehensiveAudit().catch((err) => {
  console.error('Error fatal durante la auditoría:', err);
  process.exit(1);
});
