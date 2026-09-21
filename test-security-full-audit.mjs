/**
 * AUDITORÍA INTEGRAL DE SEGURIDAD, RBAC Y AISLAMIENTO MULTI-TENANT
 * IA Inmobiliaria - Suite de Pruebas de Penetración y Políticas
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

const ADMIN_SECRET = process.env.ADMIN_API_SECRET || 'ia-admin-secret-dev';

// Tokens con roles simulados
const TOKEN_ORG1_OWNER = `${ADMIN_SECRET}:org_inmo_premier_001:owner`;
const TOKEN_ORG1_ADMIN = `${ADMIN_SECRET}:org_inmo_premier_001:admin`;
const TOKEN_ORG1_AGENT = `${ADMIN_SECRET}:org_inmo_premier_001:agent`;
const TOKEN_ORG1_VIEWER = `${ADMIN_SECRET}:org_inmo_premier_001:viewer`;
const TOKEN_ORG2_OWNER = `${ADMIN_SECRET}:org_cardona_real_002:owner`;

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runAudit() {
  console.log('================================================================');
  console.log('   AUDITORÍA EXHAUSTIVA DE SEGURIDAD, RBAC Y MULTI-TENANCY      ');
  console.log(`   URL Base: ${BASE_URL}`);
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // 1. SEGURIDAD DEL INVENTARIO Y ACCESO ANÓNIMO
  // -------------------------------------------------------------
  console.log('🔒 1. SEGURIDAD DEL INVENTARIO Y ACCESO ANÓNIMO');

  // 1.1 Catálogo público no expone direcciones internas
  const resPublic = await fetch(`${BASE_URL}/api/properties?view=public`);
  const dataPublic = await resPublic.json();
  assert(resPublic.status === 200, 'Catálogo público responde HTTP 200');
  const hasInternalAddress = dataPublic.properties?.some((p) => p.internalAddress !== undefined);
  assert(!hasInternalAddress, 'Ninguna propiedad en el catálogo público contiene el campo internalAddress');

  // 1.2 Creación anónima de propiedad rechazada
  const resAnonPropPost = await fetch(`${BASE_URL}/api/properties`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'HACK-001',
      title: 'Inmueble no autorizado',
      type: 'apartamento',
      operation: 'arriendo',
      municipality: 'Medellín',
      zone: 'Poblado',
      priceCOP: 1000000,
      areaM2: 50,
      bedrooms: 1,
      bathrooms: 1,
    }),
  });
  assert(resAnonPropPost.status === 401, 'Creación anónima de inmuebles rechazada con HTTP 401 Unauthorized');

  // 1.3 Modificación y eliminación anónima rechazada
  const resAnonPropPut = await fetch(`${BASE_URL}/api/properties/prop-001`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Hackeado' }),
  });
  assert(resAnonPropPut.status === 401, 'Modificación anónima de inmueble rechazada con HTTP 401 Unauthorized');

  const resAnonPropDel = await fetch(`${BASE_URL}/api/properties/prop-001`, {
    method: 'DELETE',
  });
  assert(resAnonPropDel.status === 401, 'Eliminación anónima de inmueble rechazada con HTTP 401 Unauthorized');

  // -------------------------------------------------------------
  // 2. CAPTACIÓN PÚBLICA DE PROSPECTOS Y HABEAS DATA
  // -------------------------------------------------------------
  console.log('\n📋 2. CAPTACIÓN PÚBLICA DE PROSPECTOS, HABEAS DATA Y RATE LIMITING');

  // 2.1 Rechazo sin Habeas Data
  const resNoConsent = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Prospecto Sin Consentimiento',
      phone: '+57 300 000 0000',
      email: 'noconsent@test.com',
      operationType: 'compra',
      propertyType: 'apartamento',
      municipality: 'Medellín',
      zone: 'Laureles',
      budget: 300000000,
      consentHabeasData: false,
    }),
  });
  assert(resNoConsent.status === 400, 'Rechazo inmediato por falta de Habeas Data con HTTP 400');

  // 2.2 Captación pública válida con Habeas Data
  const resValidLead = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Carlos Montoya Seguro',
      phone: '+57 310 998 8776',
      email: 'carlos.montoya.audit@gmail.com',
      operationType: 'compra',
      propertyType: 'apartamento',
      municipality: 'Medellín',
      zone: 'El Poblado',
      budget: 850000000,
      consentHabeasData: true,
      source: 'web_form',
    }),
  });
  const dataValidLead = await resValidLead.json();
  assert(resValidLead.status === 201, 'Prospecto captado exitosamente con HTTP 201');
  assert(dataValidLead.lead?.organizationId === 'org_inmo_premier_001', 'Organización de destino asignada de forma segura por el servidor');

  // -------------------------------------------------------------
  // 3. CONTROL DE ACCESO BASADO EN ROLES (RBAC)
  // -------------------------------------------------------------
  console.log('\n🛡️ 3. CONTROL DE ACCESO BASADO EN ROLES (RBAC: Viewer, Agent, Admin, Owner)');

  // 3.1 Rol VIEWER: Solo lectura (No puede crear ni modificar inmuebles)
  const resViewerPropCreate = await fetch(`${BASE_URL}/api/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN_ORG1_VIEWER}`,
    },
    body: JSON.stringify({
      code: 'VIEWER-001',
      title: 'Propiedad intentada por viewer',
      type: 'casa',
      operation: 'compra',
      municipality: 'Envigado',
      zone: 'Zuñiga',
      priceCOP: 500000000,
      areaM2: 120,
      bedrooms: 3,
      bathrooms: 2,
    }),
  });
  assert(resViewerPropCreate.status === 403, 'Rol VIEWER bloqueado para crear inmuebles con HTTP 403 Forbidden');

  // 3.2 Rol VIEWER: Bloqueado para modificar leads
  const resViewerLeadPut = await fetch(`${BASE_URL}/api/leads/${dataValidLead.lead?.id || 'lead-1'}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN_ORG1_VIEWER}`,
    },
    body: JSON.stringify({ status: 'negociacion' }),
  });
  assert(resViewerLeadPut.status === 403, 'Rol VIEWER bloqueado para modificar prospectos con HTTP 403 Forbidden');

  // 3.3 Rol AGENT: Puede crear y modificar, pero NO eliminar
  const resAgentPropCreate = await fetch(`${BASE_URL}/api/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN_ORG1_AGENT}`,
    },
    body: JSON.stringify({
      code: `AGENT-${Date.now().toString().slice(-4)}`,
      title: 'Propiedad creada por Agente',
      type: 'apartamento',
      operation: 'arriendo',
      municipality: 'Medellín',
      zone: 'Laureles',
      priceCOP: 2800000,
      areaM2: 75,
      bedrooms: 2,
      bathrooms: 2,
    }),
  });
  const dataAgentProp = await resAgentPropCreate.json();
  assert(resAgentPropCreate.status === 201, 'Rol AGENT autorizado para registrar inmuebles con HTTP 201');

  const resAgentPropDelete = await fetch(`${BASE_URL}/api/properties/${dataAgentProp.property?.id || 'prop-1'}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${TOKEN_ORG1_AGENT}`,
    },
  });
  assert(resAgentPropDelete.status === 403, 'Rol AGENT bloqueado para eliminar inmuebles con HTTP 403 Forbidden');

  // 3.4 Rol ADMIN / OWNER: Autorizado para eliminar
  const resAdminPropDelete = await fetch(`${BASE_URL}/api/properties/${dataAgentProp.property?.id || 'prop-1'}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${TOKEN_ORG1_ADMIN}`,
    },
  });
  assert(resAdminPropDelete.status === 200, 'Rol ADMIN autorizado para eliminar inmuebles con HTTP 200');

  // -------------------------------------------------------------
  // 4. AISLAMIENTO MULTI-TENANT ESTRICTO
  // -------------------------------------------------------------
  console.log('\n🏢 4. AISLAMIENTO MULTI-TENANT ESTRICTO ENTRE ORGANIZACIONES');

  // 4.1 Crear recurso en Org 1
  const resOrg1Prop = await fetch(`${BASE_URL}/api/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN_ORG1_OWNER}`,
    },
    body: JSON.stringify({
      code: `TENANT1-${Date.now().toString().slice(-4)}`,
      title: 'Inmueble Confidencial Org 1',
      type: 'oficina',
      operation: 'arriendo',
      municipality: 'Medellín',
      zone: 'El Poblado',
      priceCOP: 4500000,
      areaM2: 90,
      bedrooms: 0,
      bathrooms: 2,
    }),
  });
  const dataOrg1Prop = await resOrg1Prop.json();
  assert(resOrg1Prop.status === 201, 'Inmueble creado en Organización 1');

  // 4.2 Crear recurso en Org 2
  const resOrg2Prop = await fetch(`${BASE_URL}/api/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN_ORG2_OWNER}`,
    },
    body: JSON.stringify({
      code: `TENANT2-${Date.now().toString().slice(-4)}`,
      title: 'Inmueble Confidencial Org 2',
      type: 'local',
      operation: 'compra',
      municipality: 'Medellín',
      zone: 'Laureles',
      priceCOP: 750000000,
      areaM2: 110,
      bedrooms: 0,
      bathrooms: 1,
    }),
  });
  const dataOrg2Prop = await resOrg2Prop.json();
  assert(resOrg2Prop.status === 201, 'Inmueble creado en Organización 2');

  // 4.3 Consultar desde Org 1 y verificar que NO aparece el de Org 2
  const resListOrg1 = await fetch(`${BASE_URL}/api/properties`, {
    headers: { Authorization: `Bearer ${TOKEN_ORG1_OWNER}` },
  });
  const dataListOrg1 = await resListOrg1.json();
  const org1HasOrg2 = dataListOrg1.properties?.some((p) => p.id === dataOrg2Prop.property?.id);
  assert(!org1HasOrg2, 'Organización 1 NO puede ver las propiedades privadas de Organización 2');

  // 4.4 Consultar desde Org 2 y verificar que NO aparece el de Org 1
  const resListOrg2 = await fetch(`${BASE_URL}/api/properties`, {
    headers: { Authorization: `Bearer ${TOKEN_ORG2_OWNER}` },
  });
  const dataListOrg2 = await resListOrg2.json();
  const org2HasOrg1 = dataListOrg2.properties?.some((p) => p.id === dataOrg1Prop.property?.id);
  assert(!org2HasOrg1, 'Organización 2 NO puede ver las propiedades privadas de Organización 1');

  // -------------------------------------------------------------
  // 5. PROTECCIÓN DE CLAVES Y SECRETOS
  // -------------------------------------------------------------
  console.log('\n🔑 5. PROTECCIÓN DE CLAVES Y SECRETOS');
  assert(!process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY, 'Clave service_role NO está expuesta con prefijo NEXT_PUBLIC');

  console.log('\n================================================================');
  console.log(`   RESULTADO DE AUDITORÍA: ${passedTests}/${totalTests} PRUEBAS EXITOSAS (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Error fatal durante la auditoría:', err);
  process.exit(1);
});
