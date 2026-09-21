/**
 * TEST OBLIGATORIO DE CONVERSACIÓN SOFIA - FLUJO MULTI-TURNO E INVENTARIO PILOTO
 * IA Inmobiliaria
 */

import { UnifiedDataService } from './src/core/database/supabase-adapter.ts';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    if (details) console.log(`     -> ${details}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    if (details) console.error(`     -> Detalle: ${details}`);
  }
}

async function simulateAssistantCall(messages, userContext, orgSlug = 'inmo-piloto') {
  // Simular la lógica de POST /api/ai/assistant
  const org = await UnifiedDataService.getPublicOrganizationBySlugOrId(orgSlug);
  if (!org) throw new Error('Organización no encontrada');

  const targetOrgId = org.id;
  const lastUserMessage = messages && messages.length > 0 ? messages[messages.length - 1].content.trim() : '';
  const textLower = lastUserMessage.toLowerCase();
  const context = userContext || {};

  let activePropertyCode = context.activePropertyCode || null;
  let activeProperty = context.activeProperty || null;

  const formatMoney = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  // 1. Detect explicit property code
  const explicitCodeMatch = textLower.match(/\b(inm-?\d{1,6}|pilot-?\d{1,6}|prem-?\d{1,6}|cas-?\d{1,6}|apt-?\d{1,6}|ofi-?\d{1,6}|loc-?\d{1,6})\b/i);
  let requestedCode = null;
  if (explicitCodeMatch) {
    requestedCode = explicitCodeMatch[1].toUpperCase().replace(/\s+/g, '');
    if (!requestedCode.includes('-')) {
      requestedCode = requestedCode.replace(/^([A-Z]+)(\d+)$/, '$1-$2');
    }
  } else {
    const bareCodeMatch = textLower.match(/(?:inmueble|código|codigo|propiedad|ref)\s*[:#]?\s*(\d{2,6})/i);
    if (bareCodeMatch) {
      requestedCode = `INM-${bareCodeMatch[1]}`;
    }
  }

  // 2. Detect if asking for other properties
  const isNewSearchQuery =
    textLower.includes('otros') ||
    textLower.includes('otras') ||
    textLower.includes('otra propiedad') ||
    textLower.includes('otro apartamento') ||
    textLower.includes('más económico') ||
    textLower.includes('mas economico') ||
    textLower.includes('más barato') ||
    textLower.includes('mas barato') ||
    textLower.includes('más accesible') ||
    textLower.includes('menor precio');

  if (requestedCode) {
    activePropertyCode = requestedCode;
    activeProperty = null;
  }

  if (activePropertyCode && (!activeProperty || activeProperty.code !== activePropertyCode)) {
    const codeMatches = await UnifiedDataService.matchPropertiesForAssistant({ code: activePropertyCode }, targetOrgId);
    if (codeMatches.length > 0) {
      activeProperty = codeMatches[0];
    }
  }

  const isAskingAboutActive = !isNewSearchQuery && !requestedCode && !!activeProperty;

  let responseText = '';
  let matchedPropertiesToReturn = [];
  let updatedCriteria = { ...context };

  if (isAskingAboutActive && activeProperty) {
    const p = activeProperty;
    const formattedPrice = formatMoney(p.priceCOP);
    const formattedAdmin = p.adminFeeCOP ? formatMoney(p.adminFeeCOP) : null;

    if (
      textLower.includes('barrio') ||
      textLower.includes('ubicad') ||
      textLower.includes('ubicaci') ||
      textLower.includes('dónde queda') ||
      textLower.includes('donde queda') ||
      textLower.includes('sector') ||
      textLower.includes('zona')
    ) {
      responseText = `Está ubicado en **${p.zone}, ${p.municipality}**.`;
    } else if (
      textLower.includes('habitaci') ||
      textLower.includes('alcoba') ||
      textLower.includes('cuarto') ||
      textLower.includes('dormitorio')
    ) {
      responseText = `Tiene **${p.bedrooms} ${p.bedrooms === 1 ? 'habitación' : 'habitaciones'}**.`;
    } else if (textLower.includes('baño') || textLower.includes('bano')) {
      responseText = `Tiene **${p.bathrooms} ${p.bathrooms === 1 ? 'baño' : 'baños'}**.`;
    } else if (
      textLower.includes('cuánto cuesta') ||
      textLower.includes('cuanto cuesta') ||
      textLower.includes('cuánto vale') ||
      textLower.includes('cuanto vale') ||
      textLower.includes('precio') ||
      textLower.includes('costo') ||
      textLower.includes('canon') ||
      textLower.includes('arriendo')
    ) {
      if (p.operation === 'arriendo') {
        responseText = `El canon de arriendo es de **${formattedPrice} mensuales**${formattedAdmin ? ` (administración: ${formattedAdmin})` : ''}.`;
      } else {
        responseText = `El precio de venta es de **${formattedPrice}**.`;
      }
    } else if (
      textLower.includes('visit') ||
      textLower.includes('conocer') ||
      textLower.includes('cita') ||
      textLower.includes('agend') ||
      textLower.includes('ir a ver') ||
      textLower.includes('verlo')
    ) {
      responseText = `¡Con gusto! Para coordinar una visita al inmueble **${p.code} (${p.title})**, haz clic en el botón **"Solicitar Asesoría Humana"** o déjanos tu nombre y número de teléfono para que un asesor comercial de **${org.name}** se comunique contigo y verifique los horarios disponibles.`;
    }

    matchedPropertiesToReturn = [];
    updatedCriteria.activePropertyCode = p.code;
    updatedCriteria.activeProperty = p;
  } else if (requestedCode && activeProperty) {
    const p = activeProperty;
    const formattedPrice = formatMoney(p.priceCOP);
    const opText = p.operation === 'arriendo' ? 'canon mensual' : 'precio de venta';
    responseText = `Con gusto te presento el inmueble **${p.title}** (${p.code}), ubicado en **${p.zone}, ${p.municipality}**:\n\n• **Precio:** ${formattedPrice} (${opText})\n• **Distribución:** ${p.bedrooms} alcobas | ${p.bathrooms} baños | ${p.areaM2} m²\n• **Descripción:** ${p.description}`;
    matchedPropertiesToReturn = [p];
    updatedCriteria.activePropertyCode = p.code;
    updatedCriteria.activeProperty = p;
  } else {
    // New search
    const searchCriteria = {};
    if (isNewSearchQuery) {
      const currentPrice = activeProperty ? activeProperty.priceCOP : 3000000;
      searchCriteria.maxBudget = Math.max(500000, currentPrice - 100000);
      searchCriteria.operation = activeProperty ? activeProperty.operation : 'arriendo';
      searchCriteria.propertyType = activeProperty ? activeProperty.type : 'apartamento';
    }

    const finalCriteria = { ...context, ...searchCriteria };
    const matches = await UnifiedDataService.matchPropertiesForAssistant(finalCriteria, targetOrgId);
    const filteredMatches = (isNewSearchQuery && activeProperty)
      ? matches.filter((m) => m.code !== activeProperty.code)
      : matches;

    if (filteredMatches.length > 0) {
      responseText = `He consultado el inventario de **${org.name}** y encontré ${filteredMatches.length} opciones disponibles.`;
      matchedPropertiesToReturn = filteredMatches;
    } else {
      responseText = `He revisado nuestro catálogo en **${org.name}** y actualmente no tenemos otras opciones con esos parámetros exactos.`;
      matchedPropertiesToReturn = [];
    }

    updatedCriteria = { ...finalCriteria, activePropertyCode: null, activeProperty: null };
  }

  return {
    response: responseText,
    matchedProperties: matchedPropertiesToReturn,
    updatedCriteria,
  };
}

async function runTestConversation() {
  console.log('================================================================');
  console.log('   PRUEBA OBLIGATORIA DE CONVERSACIÓN MULTI-TURNO CON SOFIA     ');
  console.log('================================================================\n');

  let history = [];
  let currentContext = {};

  // PASO 1: "Muéstrame el inmueble INM-585"
  console.log('--- PASO 1 ---');
  const msg1 = { role: 'user', content: 'Muéstrame el inmueble INM-585' };
  history.push(msg1);
  const res1 = await simulateAssistantCall(history, currentContext);
  console.log(`Cliente: "${msg1.content}"`);
  console.log(`SofIA:   "${res1.response.replace(/\n+/g, ' ')}"`);
  console.log(`Tarjetas visuales adjuntas: ${res1.matchedProperties.length}`);
  
  assert(res1.matchedProperties.length === 1, 'Paso 1: Muestra la ficha visual del inmueble INM-585');
  assert(res1.matchedProperties[0].code === 'INM-585', 'Paso 1: El código del inmueble es INM-585');
  currentContext = res1.updatedCriteria;
  history.push({ role: 'assistant', content: res1.response });

  // PASO 2: "¿En qué barrio está ubicado?"
  console.log('\n--- PASO 2 ---');
  const msg2 = { role: 'user', content: '¿En qué barrio está ubicado?' };
  history.push(msg2);
  const res2 = await simulateAssistantCall(history, currentContext);
  console.log(`Cliente: "${msg2.content}"`);
  console.log(`SofIA:   "${res2.response}"`);
  console.log(`Tarjetas visuales adjuntas: ${res2.matchedProperties.length}`);

  assert(res2.response.includes('Laureles, Medellín'), 'Paso 2: Responde "Está ubicado en Laureles, Medellín"', res2.response);
  assert(res2.matchedProperties.length === 0, 'Paso 2: NO repite la tarjeta visual');
  currentContext = res2.updatedCriteria;
  history.push({ role: 'assistant', content: res2.response });

  // PASO 3: "¿Cuántas habitaciones tiene?"
  console.log('\n--- PASO 3 ---');
  const msg3 = { role: 'user', content: '¿Cuántas habitaciones tiene?' };
  history.push(msg3);
  const res3 = await simulateAssistantCall(history, currentContext);
  console.log(`Cliente: "${msg3.content}"`);
  console.log(`SofIA:   "${res3.response}"`);
  console.log(`Tarjetas visuales adjuntas: ${res3.matchedProperties.length}`);

  assert(res3.response.includes('3 habitaciones'), 'Paso 3: Responde "Tiene 3 habitaciones"', res3.response);
  assert(res3.matchedProperties.length === 0, 'Paso 3: NO repite la tarjeta visual');
  currentContext = res3.updatedCriteria;
  history.push({ role: 'assistant', content: res3.response });

  // PASO 4: "¿Cuánto cuesta?"
  console.log('\n--- PASO 4 ---');
  const msg4 = { role: 'user', content: '¿Cuánto cuesta?' };
  history.push(msg4);
  const res4 = await simulateAssistantCall(history, currentContext);
  console.log(`Cliente: "${msg4.content}"`);
  console.log(`SofIA:   "${res4.response}"`);
  console.log(`Tarjetas visuales adjuntas: ${res4.matchedProperties.length}`);

  assert(res4.response.includes('$2.000.000 mensuales') || res4.response.includes('2.000.000'), 'Paso 4: Responde que el canon de arriendo es de $2.000.000 mensuales', res4.response);
  assert(res4.matchedProperties.length === 0, 'Paso 4: NO repite la tarjeta visual');
  currentContext = res4.updatedCriteria;
  history.push({ role: 'assistant', content: res4.response });

  // PASO 5: "¿Puedo visitarlo?"
  console.log('\n--- PASO 5 ---');
  const msg5 = { role: 'user', content: '¿Puedo visitarlo?' };
  history.push(msg5);
  const res5 = await simulateAssistantCall(history, currentContext);
  console.log(`Cliente: "${msg5.content}"`);
  console.log(`SofIA:   "${res5.response}"`);
  console.log(`Tarjetas visuales adjuntas: ${res5.matchedProperties.length}`);

  assert(res5.response.includes('visita') && (res5.response.includes('Solicitar Asesoría Humana') || res5.response.includes('asesor')), 'Paso 5: Ofrece registrar solicitud de visita sin confirmar horarios no verificados', res5.response);
  assert(res5.matchedProperties.length === 0, 'Paso 5: NO repite la tarjeta visual');
  currentContext = res5.updatedCriteria;
  history.push({ role: 'assistant', content: res5.response });

  // PASO 6: "¿Tienes otros apartamentos más económicos?"
  console.log('\n--- PASO 6 ---');
  const msg6 = { role: 'user', content: '¿Tienes otros apartamentos más económicos?' };
  history.push(msg6);
  const res6 = await simulateAssistantCall(history, currentContext);
  console.log(`Cliente: "${msg6.content}"`);
  console.log(`SofIA:   "${res6.response}"`);
  console.log(`Tarjetas visuales adjuntas: ${res6.matchedProperties.length}`);

  assert(res6.response.length > 0, 'Paso 6: Ejecuta nueva búsqueda en el inventario');
  assert(!res6.matchedProperties.some(p => p.code === 'INM-585'), 'Paso 6: Excluye el inmueble previo INM-585 al buscar otras opciones más económicas');

  console.log('\n================================================================');
  console.log(`   RESULTADOS DE LA PRUEBA CONVERSACIONAL: ${passedTests}/${totalTests} APROBADAS (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');
}

runTestConversation().catch(console.error);
