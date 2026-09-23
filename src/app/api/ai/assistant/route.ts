import { NextRequest, NextResponse } from 'next/server';
import { UnifiedDataService, LeadPersistenceError, getSupabaseAdminClient } from '@/core/database/supabase-adapter';
import { DEFAULT_ORGANIZATION } from '@/core/types/organization';
import { PropertyPublicView } from '@/core/types/property';
import { checkRateLimit, rateLimitResponse, extractClientIp } from '@/core/auth/auth-guard';

const FALLBACK_CONTACT = {
  whatsapp: '+57 304 360 5155',
  email: 'agenteinmobiliaria1986@gmail.com',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, userContext, leadCapture, organizationId, orgSlug } = body;
    const clientIp = extractClientIp(req);

    // 1. Resolve organization safely from slug or ID against Supabase
    const identifier = orgSlug || organizationId || req.nextUrl.searchParams.get('org') || DEFAULT_ORGANIZATION.slug;
    const org = await UnifiedDataService.getPublicOrganizationBySlugOrId(identifier);

    if (!org) {
      return NextResponse.json(
        {
          success: false,
          error: `Organización "${identifier}" no encontrada en el sistema.`,
          diagnostic: {
            stage: 'ORG_RESOLUTION',
            code: 'ERR_ORG_NOT_FOUND',
            adminClientConfigured: !!getSupabaseAdminClient(),
          },
        },
        { status: 404 }
      );
    }

    const targetOrgId = org.id;

    // 2. Direct lead capture request from the assistant
    if (leadCapture) {
      // Dedicated rate limit bucket for lead intake (15 requests/min per IP)
      const isAllowed = await checkRateLimit(clientIp, 'api/ai/assistant/lead', 15, 60);
      if (!isAllowed) {
        return rateLimitResponse('Has enviado demasiadas solicitudes de contacto. Por favor espera un momento antes de reintentar.');
      }

      const { name, phone, email, criteria, propertyIds, notes, consentHabeasData } = leadCapture;

      // Validate required fields
      if (!name?.trim() || !phone?.trim() || !email?.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: 'Los datos de contacto (nombre, teléfono y correo) son obligatorios.',
            diagnostic: {
              stage: 'VALIDATION',
              code: 'ERR_REQUIRED_CONTACT_FIELDS',
            },
          },
          { status: 400 }
        );
      }

      // Validate Habeas Data consent
      if (!consentHabeasData) {
        return NextResponse.json(
          {
            success: false,
            error: 'Se requiere la autorización expresa de tratamiento de datos personales según la Ley 1581 de 2012 (Habeas Data).',
            diagnostic: {
              stage: 'VALIDATION',
              code: 'ERR_HABEAS_DATA_REQUIRED',
            },
          },
          { status: 400 }
        );
      }

      // Collect and verify interested property codes/ids
      let verifiedPropertyIds: string[] = Array.isArray(propertyIds) ? [...propertyIds] : [];
      if (criteria?.activePropertyCode && !verifiedPropertyIds.includes(criteria.activePropertyCode)) {
        verifiedPropertyIds.push(criteria.activePropertyCode);
      }

      try {
        const result = await UnifiedDataService.createPublicLead(
          {
            organizationId: targetOrgId,
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim(),
            operationType: criteria?.operation || 'compra',
            propertyType: criteria?.propertyType || 'apartamento',
            municipality: criteria?.municipality || org.city || 'Medellín',
            zone: criteria?.zone || 'El Poblado',
            budget: criteria?.maxBudget || (criteria?.activeProperty?.priceCOP ? criteria.activeProperty.priceCOP : 800000000),
            interestedPropertyIds: verifiedPropertyIds,
            notes: `Captado por ${org.aiAssistantName} (${org.name}). Requerimiento: ${notes || 'Consulta de propiedades'}. Inmuebles de interés: ${verifiedPropertyIds.join(', ') || 'General'}. Criterios: ${JSON.stringify(criteria || {})}`,
            consentHabeasData: true,
            source: 'asistente_ia',
          },
          clientIp
        );

        if (result.isDuplicate) {
          return NextResponse.json({
            success: true,
            leadCreated: false,
            leadUpdated: true,
            leadId: result.leadId,
            message: `¡Hola de nuevo, ${name.trim()}! Hemos actualizado tu requerimiento en el sistema comercial de ${org.name}. Un asesor se comunicará contigo al ${phone} a la brevedad.`,
          });
        }

        return NextResponse.json({
          success: true,
          leadCreated: true,
          leadId: result.leadId,
          message: `¡Muchas gracias, ${name.trim()}! Hemos registrado tu solicitud en el CRM de ${org.name}. Un asesor comercial se comunicará contigo al ${phone} o ${email} para coordinar la atención y agendar visitas.`,
        });
      } catch (leadError: any) {
        const correlationId = `cor_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
        const rawDiagnostic = leadError instanceof LeadPersistenceError
          ? leadError.diagnostic
          : {
              stage: 'PERSISTENCE_UNKNOWN' as const,
              code: leadError.code || 'ERR_LEAD_PERSISTENCE',
              dbErrorMessage: leadError.message,
            };

        // Registro detallado en servidor para auditoría
        console.error(`[AssistantRoute][${correlationId}] Error en persistencia de prospecto público:`, {
          correlationId,
          stage: rawDiagnostic.stage,
          code: rawDiagnostic.code,
          dbErrorCode: (rawDiagnostic as any).dbErrorCode,
          dbErrorMessage: (rawDiagnostic as any).dbErrorMessage,
          rpcErrorCode: (rawDiagnostic as any).rpcErrorCode,
          rpcErrorMessage: (rawDiagnostic as any).rpcErrorMessage,
          resolvedOrgId: (rawDiagnostic as any).resolvedOrgId,
        });

        // Respuesta pública segura sin detalles internos de base de datos
        return NextResponse.json(
          {
            success: false,
            error: 'No fue posible registrar tu solicitud automáticamente en este momento.',
            message: `No fue posible registrar la solicitud en el sistema. Puedes comunicarte directamente con nuestro asesor comercial vía WhatsApp (${FALLBACK_CONTACT.whatsapp}) o al correo ${FALLBACK_CONTACT.email}.`,
            diagnostic: {
              correlationId,
              stage: rawDiagnostic.stage || 'RPC_EXECUTION',
              code: rawDiagnostic.code || 'ERR_LEAD_PERSISTENCE',
            },
            fallbackContact: FALLBACK_CONTACT,
          },
          { status: 500 }
        );
      }
    }

    // 3. Conversational State & Context Management
    const lastUserMessage = messages && messages.length > 0 ? messages[messages.length - 1].content.trim() : '';
    const textLower = lastUserMessage.toLowerCase();
    const context = userContext || {};

    let activePropertyCode: string | null = context.activePropertyCode || null;
    let activeProperty: PropertyPublicView | null = context.activeProperty || null;

    // Helper formatters
    const formatMoney = (val: number) =>
      new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

    // 3.1 Check if user explicitly mentioned a new property code in the current message
    const explicitCodeMatch = textLower.match(/\b(inm-?\d{1,6}|pilot-?\d{1,6}|prem-?\d{1,6}|cas-?\d{1,6}|apt-?\d{1,6}|ofi-?\d{1,6}|loc-?\d{1,6})\b/i);
    let requestedCode: string | null = null;
    if (explicitCodeMatch && explicitCodeMatch[1]) {
      let codeStr = explicitCodeMatch[1].toUpperCase().replace(/\s+/g, '');
      if (!codeStr.includes('-')) {
        codeStr = codeStr.replace(/^([A-Z]+)(\d+)$/, '$1-$2');
      }
      requestedCode = codeStr;
    } else {
      const bareCodeMatch = textLower.match(/(?:inmueble|código|codigo|propiedad|ref)\s*[:#]?\s*(\d{2,6})/i);
      if (bareCodeMatch && bareCodeMatch[1]) {
        requestedCode = `INM-${bareCodeMatch[1]}`;
      }
    }

    // 3.2 Determine intent type
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
      textLower.includes('mas accesible') ||
      textLower.includes('menor precio') ||
      textLower.includes('mayor precio') ||
      textLower.includes('otra opción') ||
      textLower.includes('otra opcion') ||
      textLower.includes('buscar en') ||
      textLower.includes('muéstrame en') ||
      textLower.includes('muestrame en') ||
      textLower.includes('en arriendo') && !activePropertyCode ||
      textLower.includes('en venta') && !activePropertyCode;

    // If an explicit new code is requested, it overrides active property
    if (requestedCode) {
      activePropertyCode = requestedCode;
      activeProperty = null; // Force fresh query
    }

    // Load active property from Supabase if we have a code but no cached object or code changed
    if (activePropertyCode && (!activeProperty || activeProperty.code !== activePropertyCode)) {
      const codeMatches = await UnifiedDataService.matchPropertiesForAssistant({ code: activePropertyCode }, targetOrgId);
      if (codeMatches.length > 0) {
        activeProperty = codeMatches[0];
      }
    }

    // 3.3 Check if this is a follow-up attribute question on the ACTIVE property
    const isAskingAboutActive = !isNewSearchQuery && !requestedCode && !!activeProperty;

    let responseText = '';
    let matchedPropertiesToReturn: PropertyPublicView[] = [];
    let updatedCriteria: any = { ...context };

    if (isAskingAboutActive && activeProperty) {
      // -----------------------------------------------------------------------------------
      // INTENT: SPECIFIC ATTRIBUTE QUERY ABOUT ACTIVE PROPERTY (NO visual card repeat)
      // -----------------------------------------------------------------------------------
      const p = activeProperty;
      const formattedPrice = formatMoney(p.priceCOP);
      const formattedAdmin = p.adminFeeCOP ? formatMoney(p.adminFeeCOP) : null;

      // Question A: Location / Barrio / Ubicación
      if (
        textLower.includes('barrio') ||
        textLower.includes('ubicad') ||
        textLower.includes('ubicaci') ||
        textLower.includes('dónde queda') ||
        textLower.includes('donde queda') ||
        textLower.includes('dónde está') ||
        textLower.includes('donde esta') ||
        textLower.includes('sector') ||
        textLower.includes('zona') ||
        textLower.includes('direcci') ||
        textLower.includes('lugar')
      ) {
        responseText = `Está ubicado en **${p.zone}, ${p.municipality}**.`;
      }
      // Question B: Habitaciones / Alcobas / Cuartos
      else if (
        textLower.includes('habitaci') ||
        textLower.includes('alcoba') ||
        textLower.includes('cuarto') ||
        textLower.includes('dormitorio') ||
        textLower.includes('piezas')
      ) {
        responseText = `Tiene **${p.bedrooms} ${p.bedrooms === 1 ? 'habitación' : 'habitaciones'}**.`;
      }
      // Question C: Baños
      else if (textLower.includes('baño') || textLower.includes('bano')) {
        responseText = `Tiene **${p.bathrooms} ${p.bathrooms === 1 ? 'baño' : 'baños'}**.`;
      }
      // Question D: Precio / Costo / Canon / Valor
      else if (
        textLower.includes('cuánto cuesta') ||
        textLower.includes('cuanto cuesta') ||
        textLower.includes('cuánto vale') ||
        textLower.includes('cuanto vale') ||
        textLower.includes('precio') ||
        textLower.includes('costo') ||
        textLower.includes('canon') ||
        textLower.includes('arriendo') ||
        textLower.includes('administraci')
      ) {
        if (textLower.includes('administraci') && formattedAdmin) {
          responseText = `El valor de administración del inmueble **${p.code}** es de **${formattedAdmin} mensuales**.`;
        } else if (p.operation === 'arriendo') {
          responseText = `El canon de arriendo es de **${formattedPrice} mensuales**${formattedAdmin ? ` (administración: ${formattedAdmin})` : ''}.`;
        } else {
          responseText = `El precio de venta es de **${formattedPrice}**.`;
        }
      }
      // Question E: Área / Metros cuadrados
      else if (
        textLower.includes('metro') ||
        textLower.includes('área') ||
        textLower.includes('area') ||
        textLower.includes('m2') ||
        textLower.includes('tamaño') ||
        textLower.includes('tamano') ||
        textLower.includes('superficie')
      ) {
        responseText = `Cuenta con un área de **${p.areaM2} m²**.`;
      }
      // Question F: Parqueadero / Garaje
      else if (
        textLower.includes('parqueadero') ||
        textLower.includes('garaje') ||
        textLower.includes('estacionamiento') ||
        textLower.includes('parqueaderos') ||
        textLower.includes('carro')
      ) {
        responseText = p.parkingSpots && p.parkingSpots > 0
          ? `Cuenta con **${p.parkingSpots} ${p.parkingSpots === 1 ? 'parqueadero privado' : 'parqueaderos privados'}**.`
          : `No cuenta con parqueadero privado asignado en la ficha pública.`;
      }
      // Question G: Estrato
      else if (textLower.includes('estrato')) {
        responseText = p.stratum
          ? `Es estrato **${p.stratum}**.`
          : `El estrato no se encuentra especificado en la ficha pública.`;
      }
      // Question H: Visitas / Citas / Agendamiento
      else if (
        textLower.includes('visit') ||
        textLower.includes('conocer') ||
        textLower.includes('cita') ||
        textLower.includes('agend') ||
        textLower.includes('ir a ver') ||
        textLower.includes('verlo') ||
        textLower.includes('cuándo puedo') ||
        textLower.includes('cuando puedo')
      ) {
        responseText = `¡Con gusto! Para coordinar una visita al inmueble **${p.code} (${p.title})**, haz clic en el botón **"Solicitar Asesoría Humana"** o déjanos tu nombre y número de teléfono para que un asesor comercial de **${org.name}** se comunique contigo y verifique los horarios disponibles.`;
      }
      // Question I: Características generales / Amenidades
      else if (
        textLower.includes('característica') ||
        textLower.includes('caracteristica') ||
        textLower.includes('amenidad') ||
        textLower.includes('balcón') ||
        textLower.includes('balcon') ||
        textLower.includes('piscina') ||
        textLower.includes('cocina') ||
        textLower.includes('acabado') ||
        textLower.includes('detalles')
      ) {
        const feats = p.features && p.features.length > 0 ? p.features.join(', ') : 'No se especifican características adicionales';
        responseText = `El inmueble **${p.code}** cuenta con las siguientes características confirmadas: ${feats}.\n\nDescripción: ${p.description}`;
      } else {
        // Fallback natural concise response on active property
        responseText = `El inmueble activo es **${p.title}** (${p.code}) en **${p.zone}, ${p.municipality}** por **${formattedPrice}** (${p.bedrooms} alcobas, ${p.bathrooms} baños, ${p.areaM2} m²).\n\n¿Deseas conocer algún detalle específico como barrio, precio, habitaciones o coordinar una visita?`;
      }

      // STRICT RULE: Do NOT attach visual cards on specific attribute questions
      matchedPropertiesToReturn = [];
      updatedCriteria.activePropertyCode = p.code;
      updatedCriteria.activeProperty = p;

    } else if (requestedCode && activeProperty) {
      // -----------------------------------------------------------------------------------
      // INTENT: INITIAL PROPERTY LOOKUP BY CODE (Show visual card once)
      // -----------------------------------------------------------------------------------
      const p = activeProperty;
      const formattedPrice = formatMoney(p.priceCOP);
      const opText = p.operation === 'arriendo' ? 'canon mensual' : 'precio de venta';

      responseText = `Con gusto te presento el inmueble **${p.title}** (${p.code}), ubicado en **${p.zone}, ${p.municipality}**:\n\n• **Precio:** ${formattedPrice} (${opText})\n• **Distribución:** ${p.bedrooms} alcobas | ${p.bathrooms} baños | ${p.areaM2} m²${p.parkingSpots ? ` | ${p.parkingSpots} parqueadero(s)` : ''}\n• **Descripción:** ${p.description}\n\n¿Te gustaría saber más sobre su ubicación, habitaciones, precio o agendar una visita?`;
      matchedPropertiesToReturn = [p];
      updatedCriteria.activePropertyCode = p.code;
      updatedCriteria.activeProperty = p;

    } else if (requestedCode && !activeProperty) {
      // Code not found
      responseText = `He consultado el catálogo oficial de **${org.name}** y actualmente no tenemos ningún inmueble disponible con el código **${requestedCode}**.\n\nPuedes consultar nuestro catálogo general o hacer clic en **"Solicitar Asesoría Humana"** para que un asesor te asista.`;
      matchedPropertiesToReturn = [];
      updatedCriteria.activePropertyCode = null;
      updatedCriteria.activeProperty = null;

    } else {
      // -----------------------------------------------------------------------------------
      // INTENT: GENERAL SEARCH OR CRITERIA MODIFICATION (e.g. "¿Tienes otros más económicos?")
      // -----------------------------------------------------------------------------------
      // Parse new criteria
      const searchCriteria: any = {};

      if (isNewSearchQuery) {
        // If user asks for cheaper options, look for lower budget than active property
        if (
          textLower.includes('más económico') ||
          textLower.includes('mas economico') ||
          textLower.includes('más barato') ||
          textLower.includes('mas barato') ||
          textLower.includes('menor precio')
        ) {
          const currentPrice = activeProperty ? activeProperty.priceCOP : (context.maxBudget || 3000000);
          searchCriteria.maxBudget = Math.max(500000, currentPrice - 100000);
          searchCriteria.operation = activeProperty ? activeProperty.operation : (context.operation || 'arriendo');
          searchCriteria.propertyType = activeProperty ? activeProperty.type : (context.propertyType || 'apartamento');
        }
      }

      // Parse Operation
      if (textLower.includes('arrendar') || textLower.includes('alquilar') || textLower.includes('arriendo') || textLower.includes('alquiler') || textLower.includes('rentar')) {
        searchCriteria.operation = 'arriendo';
      } else if (textLower.includes('comprar') || textLower.includes('compra') || textLower.includes('venta') || textLower.includes('en venta') || textLower.includes('inversión')) {
        searchCriteria.operation = 'compra';
      }

      // Parse Property Type
      if (textLower.includes('apartamento') || textLower.includes('apartaestudio') || textLower.includes('apto')) {
        searchCriteria.propertyType = 'apartamento';
      } else if (textLower.includes('casa campestre') || textLower.includes('casa')) {
        searchCriteria.propertyType = 'casa';
      } else if (textLower.includes('penthouse') || textLower.includes('ph')) {
        searchCriteria.propertyType = 'penthouse';
      } else if (textLower.includes('oficina')) {
        searchCriteria.propertyType = 'oficina';
      } else if (textLower.includes('local')) {
        searchCriteria.propertyType = 'local';
      }

      // Parse Municipalities & Zones
      if (textLower.includes('medellín') || textLower.includes('medellin')) {
        searchCriteria.municipality = 'Medellín';
      } else if (textLower.includes('envigado')) {
        searchCriteria.municipality = 'Envigado';
      } else if (textLower.includes('sabaneta')) {
        searchCriteria.municipality = 'Sabaneta';
      } else if (textLower.includes('rionegro')) {
        searchCriteria.municipality = 'Rionegro';
      }

      if (textLower.includes('poblado') || textLower.includes('castropol') || textLower.includes('provenza')) {
        searchCriteria.zone = 'El Poblado';
        searchCriteria.municipality = 'Medellín';
      } else if (textLower.includes('laureles') || textLower.includes('estadio')) {
        searchCriteria.zone = 'Laureles';
        searchCriteria.municipality = 'Medellín';
      } else if (textLower.includes('belén') || textLower.includes('belen')) {
        searchCriteria.zone = 'Belén';
        searchCriteria.municipality = 'Medellín';
      }

      // Parse Budget
      const formattedPesosMatch = textLower.match(/\$?\s*(\d{1,3}(?:[.,]\d{3}){1,3})/);
      if (formattedPesosMatch) {
        const cleanNumStr = formattedPesosMatch[1].replace(/[.,]/g, '');
        const parsedNum = parseInt(cleanNumStr, 10);
        if (parsedNum > 100000) searchCriteria.maxBudget = parsedNum;
      } else {
        const millionMatch = textLower.match(/(\d+[\.,]?\d*)\s*(millones|millón|millon|m|mdp)/);
        if (millionMatch) {
          const num = parseFloat(millionMatch[1].replace(',', '.'));
          searchCriteria.maxBudget = num * 1000000;
        }
      }

      // Merge with accumulated context
      const finalCriteria = {
        ...context,
        ...searchCriteria,
      };

      // Query database
      const matches = await UnifiedDataService.matchPropertiesForAssistant(finalCriteria, targetOrgId);

      // Exclude previous active property if searching for "otros"
      const filteredMatches = (isNewSearchQuery && activeProperty)
        ? matches.filter((m) => m.code !== activeProperty.code)
        : matches;

      if (filteredMatches.length > 0) {
        const countText = filteredMatches.length === 1 ? '1 opción disponible' : `${filteredMatches.length} opciones disponibles`;
        responseText = `He consultado el inventario de **${org.name}** y encontré ${countText} que se ajusta a tu búsqueda:\n\n` +
          filteredMatches.map((p, i) => `${i + 1}. **${p.title}** (${p.code}) en **${p.zone}, ${p.municipality}**\n   • **Precio:** ${formatMoney(p.priceCOP)} (${p.operation === 'arriendo' ? 'arriendo mensual' : 'venta'})\n   • **Distribución:** ${p.bedrooms} alcobas | ${p.bathrooms} baños | ${p.areaM2} m²`).join('\n\n') +
          `\n\n¿Te gustaría ver la ficha de alguno de estos inmuebles o agendar una visita?`;

        matchedPropertiesToReturn = filteredMatches;
        if (filteredMatches.length === 1) {
          updatedCriteria.activePropertyCode = filteredMatches[0].code;
          updatedCriteria.activeProperty = filteredMatches[0];
        } else {
          updatedCriteria.activePropertyCode = null;
          updatedCriteria.activeProperty = null;
        }
      } else if (isNewSearchQuery) {
        responseText = `He revisado nuestro catálogo en **${org.name}** y actualmente no tenemos otras opciones con esos parámetros exactos.\n\nPuedes ampliar los criterios de búsqueda o hacer clic en **"Solicitar Asesoría Humana"** para que un asesor te ayude a encontrar alternativas.`;
        matchedPropertiesToReturn = [];
      } else {
        responseText = org.aiAssistantWelcomeMessage || `¡Hola! Soy ${org.aiAssistantName} de ${org.name}. Con mucho gusto te ayudo a encontrar tu propiedad ideal en ${org.city || 'Medellín'}. Cuéntame:\n\n1. ¿Buscas **comprar** o **arrendar**?\n2. ¿Qué tipo de inmueble prefieres (apartamento, casa, apartaestudio)?\n3. ¿En qué zona o presupuesto aproximado?`;
        matchedPropertiesToReturn = [];
      }

      updatedCriteria = {
        ...finalCriteria,
        activePropertyCode: updatedCriteria.activePropertyCode,
        activeProperty: updatedCriteria.activeProperty,
      };
    }

    // 4. Return clean, structured JSON
    return NextResponse.json({
      success: true,
      mode: 'conversational_engine',
      modeNotice: `Asistente Oficial • ${org.name}`,
      response: responseText,
      matchedProperties: matchedPropertiesToReturn,
      updatedCriteria: updatedCriteria,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        city: org.city,
        aiAssistantName: org.aiAssistantName,
      },
    });
  } catch (error: any) {
    console.error('Error in AI assistant route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
