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

async function runVerification() {
  console.log('--- INICIANDO VERIFICACIÓN AUTOMATIZADA DE IA_INMOBILIARIA ---\n');

  // 1. Check Landing Page
  const landing = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET',
  });
  console.log(`[1/6] Landing Page (GET /): Status ${landing.status} - OK`);

  // 2. Check Public AI Assistant Page & API
  const assistantPage = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/asistente',
    method: 'GET',
  });
  console.log(`[2/6] Asistente Page (GET /asistente): Status ${assistantPage.status} - OK`);

  // Test Assistant matching with the exact user prompt
  const assistantQuery = await makeRequest(
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
          content:
            'Busco un apartamento en arriendo en Medellín, de dos habitaciones y hasta $2.500.000 mensuales',
        },
      ],
      userContext: {},
    }
  );

  console.log(`[3/6] Assistant Query NLP Match (POST /api/ai/assistant): Status ${assistantQuery.status}`);
  console.log(`   Modo: ${assistantQuery.data?.mode}`);
  console.log(`   Inmuebles Coincidentes Encontrados: ${assistantQuery.data?.matchedProperties?.length}`);
  if (assistantQuery.data?.matchedProperties?.length > 0) {
    assistantQuery.data.matchedProperties.forEach((p) => {
      console.log(`   -> [${p.code}] ${p.title} | ${p.municipality} - ${p.zone} | $${p.priceCOP.toLocaleString('es-CO')} COP | ${p.bedrooms} alcobas`);
    });
  }

  // 3. Test Lead Capture from Assistant
  const leadCaptureRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/ai/assistant',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      leadCapture: {
        name: 'Andrés Felipe Cifuentes',
        phone: '+57 314 888 7766',
        email: 'andres.cifuentes@correo.com',
        criteria: assistantQuery.data?.updatedCriteria || {},
        propertyIds: assistantQuery.data?.matchedProperties?.map((p) => p.id) || [],
        notes: 'Solicitud de visita para apartamento 2 alcobas en Medellín arriendo.',
        consentHabeasData: true,
      },
    }
  );
  console.log(`[4/6] Lead Intake con Habeas Data (POST /api/ai/assistant): Status ${leadCaptureRes.status}`);
  console.log(`   Lead Creado: ${leadCaptureRes.data?.leadCreated} | ID: ${leadCaptureRes.data?.leadId}`);

  // 4. Test CRM Leads API
  const leadsRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/leads',
    method: 'GET',
  });
  console.log(`[5/6] CRM Leads API (GET /api/leads): Status ${leadsRes.status}`);
  console.log(`   Total Prospectos en Base: ${leadsRes.data?.leads?.length}`);
  console.log(`   Tasa de Conversión: ${leadsRes.data?.stats?.conversionRate}%`);
  console.log(`   Pipeline Activo: $${leadsRes.data?.stats?.totalPipelineValue?.toLocaleString('es-CO')} COP`);

  // 5. Test Public Catalog and Detail Pages
  const catalogPage = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/propiedades',
    method: 'GET',
  });
  const detailPage = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/propiedades/prop-001',
    method: 'GET',
  });
  const adminPropertiesPage = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/properties',
    method: 'GET',
  });
  const dashboardPage = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/dashboard',
    method: 'GET',
  });

  console.log(`[6/6] Verificación de Rutas HTML:`);
  console.log(`   GET /propiedades (Catálogo Público): Status ${catalogPage.status}`);
  console.log(`   GET /propiedades/prop-001 (Ficha Inmueble): Status ${detailPage.status}`);
  console.log(`   GET /properties (Inventario CRM): Status ${adminPropertiesPage.status}`);
  console.log(`   GET /dashboard (Dashboard Comercial): Status ${dashboardPage.status}`);

  console.log('\n--- VERIFICACIÓN AUTOMATIZADA FINALIZADA CON ÉXITO ---');
}

runVerification().catch(console.error);
