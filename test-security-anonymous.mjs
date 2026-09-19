/**
 * Test de Seguridad y Control de Acceso Anónimo
 * Verifica códigos HTTP y protección de datos privados.
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function runSecurityTests() {
  console.log(`\n🔒 EJECUTANDO AUDITORÍA DE SEGURIDAD Y ACCESO ANÓNIMO`);
  console.log(`URL Base: ${BASE_URL}\n`);

  const results = [];

  const check = async (name, url, options, expectedStatus, validator) => {
    try {
      const res = await fetch(`${BASE_URL}${url}`, options);
      const status = res.status;
      let body = null;
      try {
        body = await res.json();
      } catch (e) {
        body = await res.text();
      }

      const passedStatus = status === expectedStatus;
      let passedValidation = true;
      let validationMsg = '';

      if (validator && passedStatus) {
        const valRes = validator(body);
        passedValidation = valRes.valid;
        validationMsg = valRes.message || '';
      }

      const ok = passedStatus && passedValidation;
      results.push({
        name,
        url,
        method: options.method || 'GET',
        status,
        expectedStatus,
        ok,
        message: validationMsg,
      });

      const icon = ok ? '✅' : '❌';
      console.log(`${icon} [HTTP ${status}] ${options.method || 'GET'} ${url} -> ${name} ${validationMsg ? `(${validationMsg})` : ''}`);
    } catch (err) {
      results.push({
        name,
        url,
        method: options.method || 'GET',
        status: 'ERROR',
        expectedStatus,
        ok: false,
        message: err.message,
      });
      console.log(`❌ [ERROR] ${options.method || 'GET'} ${url} -> ${err.message}`);
    }
  };

  // 1. Endpoints de Escritura/Modificación/Eliminación Administrativa (Deben responder 401 Unauthorized para anónimos)
  await check(
    'Creación anónima de propiedad rechazada',
    '/api/properties',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Hack Prop', code: 'HCK-01', priceCOP: 100000000 }),
    },
    401
  );

  await check(
    'Modificación anónima de propiedad rechazada',
    '/api/properties/prop-001',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Modified Title' }),
    },
    401
  );

  await check(
    'Eliminación anónima de propiedad rechazada',
    '/api/properties/prop-001',
    {
      method: 'DELETE',
    },
    401
  );

  await check(
    'Reinicio anónimo de base de datos rechazado',
    '/api/demo/reset',
    {
      method: 'POST',
    },
    401
  );

  await check(
    'Modificación anónima de prospecto rechazada',
    '/api/leads/lead-1',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked Lead' }),
    },
    401
  );

  await check(
    'Eliminación anónima de prospecto rechazada',
    '/api/leads/lead-1',
    {
      method: 'DELETE',
    },
    401
  );

  // 2. Endpoints Públicos y de Demostración con Protección de Privacidad
  await check(
    'Catálogo público sanitiza direcciones internas',
    '/api/properties?view=public',
    { method: 'GET' },
    200,
    (body) => {
      const hasPrivateAddr = body.properties?.some((p) => p.internalAddress && !p.internalAddress.includes('protegida'));
      return {
        valid: !hasPrivateAddr,
        message: hasPrivateAddr ? 'Contiene direcciones privadas' : 'Direcciones privadas ocultas',
      };
    }
  );

  await check(
    'Detalle anónimo de propiedad sanitiza dirección privada',
    '/api/properties/prop-001',
    { method: 'GET' },
    200,
    (body) => {
      const isSanitized = body.property?.internalAddress?.includes('Modo Demostración');
      return {
        valid: isSanitized,
        message: isSanitized ? 'Dirección enmascarada para demo' : 'Dirección real expuesta',
      };
    }
  );

  await check(
    'Consulta anónima de CRM enmascara datos de contacto de prospectos',
    '/api/leads',
    { method: 'GET' },
    200,
    (body) => {
      const allMasked = body.leads?.every((l) => l.phone.includes('****') || l.email.includes('demo'));
      return {
        valid: allMasked,
        message: allMasked ? 'Teléfonos y correos enmascarados' : 'Datos sensibles expuestos',
      };
    }
  );

  await check(
    'Detalle anónimo de prospecto enmascara datos sensibles',
    '/api/leads/lead-1',
    { method: 'GET' },
    200,
    (body) => {
      const isMasked = body.lead?.phone?.includes('****') && body.lead?.email?.includes('demo');
      return {
        valid: isMasked,
        message: isMasked ? 'Contacto enmascarado' : 'Contacto expuesto',
      };
    }
  );

  console.log('\n--- RESUMEN DE SEGURIDAD ---');
  const total = results.length;
  const passed = results.filter((r) => r.ok).length;
  console.log(`Total pruebas: ${total}`);
  console.log(`Aprobadas: ${passed}`);
  console.log(`Fallidas: ${total - passed}`);

  if (passed === total) {
    console.log(`\n🎉 TODAS LAS PRUEBAS DE SEGURIDAD Y ACCESO ANÓNIMO PASARON (100%)\n`);
    process.exit(0);
  } else {
    console.log(`\n⚠️ ALGUNAS PRUEBAS FALLARON\n`);
    process.exit(1);
  }
}

runSecurityTests();
