/**
 * TEST SUITE: ASISTENTE SOFIA, RESOLUCIÓN DE INMOBILIARIA PILOTO E INTERPRETACIÓN DE CONSULTAS
 * IA Inmobiliaria
 */

import { UnifiedDataService } from './src/core/database/supabase-adapter.ts';
import { PILOT_ORGANIZATION, DEMO_ORGANIZATION } from './src/core/types/organization.ts';

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
  console.log('   VALIDACIÓN DE ASISTENTE SOFIA Y ORGANIZACIÓN PILOTO          ');
  console.log('================================================================\n');

  // 1. RESOLUCIÓN DE ORGANIZACIONES
  console.log('🏢 1. RESOLUCIÓN DINÁMICA DE ORGANIZACIONES POR SLUG O ID');
  const resolvedPilot = await UnifiedDataService.getPublicOrganizationBySlugOrId('inmo-piloto');
  assert(resolvedPilot !== null, 'Organización Inmobiliaria Piloto resuelta por slug "inmo-piloto"');
  assert(resolvedPilot?.name === 'Inmobiliaria Piloto', 'Nombre de organización es "Inmobiliaria Piloto"');
  assert(resolvedPilot?.slug === 'inmo-piloto', 'Slug verificado como "inmo-piloto"');

  const resolvedDemo = await UnifiedDataService.getPublicOrganizationBySlugOrId('inmo-premier-demo');
  assert(resolvedDemo !== null, 'Organización de demostración resuelta por slug "inmo-premier-demo"');
  assert(resolvedDemo?.name === 'Inmobiliaria Premier (Demostración)', 'Nombre de organización demo verificado');

  // 2. PRIVACIDAD DE CATÁLOGO PÚBLICO
  console.log('\n🔒 2. SEGURIDAD Y PRIVACIDAD DEL CATÁLOGO PÚBLICO');
  const publicCatalog = await UnifiedDataService.getPublicProperties({}, resolvedPilot.id);
  assert(Array.isArray(publicCatalog), 'Catálogo público retorna un arreglo de inmuebles');
  const hasPrivateData = publicCatalog.some((p) => p.internalAddress !== undefined || p.ownerName !== undefined);
  assert(!hasPrivateData, 'Ningún inmueble público expone datos privados ni direcciones internas');

  // 3. CONSULTAS Y COINCIDENCIA DE INMUEBLES
  console.log('\n🔍 3. COINCIDENCIA DE CONSULTAS Y RECONOCIMIENTO EN ESPAÑOL');
  
  // Búsqueda por código exacto
  const matchByCode = await UnifiedDataService.matchPropertiesForAssistant({ code: 'INM-585' }, resolvedPilot.id);
  assert(Array.isArray(matchByCode), 'Búsqueda por código de inmueble ejecuta sin errores');

  // Búsqueda por ubicación y operación
  const matchLocation = await UnifiedDataService.matchPropertiesForAssistant({
    municipality: 'Medellín',
    operation: 'compra',
    propertyType: 'apartamento',
  }, resolvedPilot.id);
  assert(Array.isArray(matchLocation), 'Búsqueda por municipio, operación y tipo de inmueble ejecuta correctamente');

  // 4. AISLAMIENTO MULTI-TENANT
  console.log('\n🛡️ 4. AISLAMIENTO ENTRE ORGANIZACIONES');
  const demoCatalog = await UnifiedDataService.getPublicProperties({}, resolvedDemo.id);
  assert(Array.isArray(demoCatalog), 'Catálogo de demo consultado por separado');

  console.log('\n================================================================');
  console.log(`   RESULTADO DE PRUEBAS LOCALES: ${passedTests}/${totalTests} APROBADAS (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');
}

runTests().catch(console.error);
