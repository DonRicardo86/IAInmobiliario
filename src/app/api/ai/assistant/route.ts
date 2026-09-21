import { NextRequest, NextResponse } from 'next/server';
import { UnifiedDataService } from '@/core/database/supabase-adapter';
import { DEFAULT_ORGANIZATION } from '@/core/types/organization';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, userContext, leadCapture, organizationId, orgSlug } = body;

    // 1. Resolve organization safely from slug or ID against Supabase / database
    const identifier = orgSlug || organizationId || req.nextUrl.searchParams.get('org') || DEFAULT_ORGANIZATION.slug;
    const org = await UnifiedDataService.getPublicOrganizationBySlugOrId(identifier);

    if (!org) {
      return NextResponse.json(
        { success: false, error: `Organización "${identifier}" no encontrada en el sistema.` },
        { status: 404 }
      );
    }

    const targetOrgId = org.id;

    // 2. Direct lead capture request from the assistant
    if (leadCapture) {
      const { name, phone, email, criteria, propertyIds, notes, consentHabeasData } = leadCapture;
      if (!name?.trim() || !phone?.trim() || !email?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Faltan datos de contacto obligatorios (nombre, teléfono y correo).' },
          { status: 400 }
        );
      }
      if (!consentHabeasData) {
        return NextResponse.json(
          { success: false, error: 'Se requiere la autorización expresa de tratamiento de datos personales según la Ley 1581 de 2012 (Habeas Data).' },
          { status: 400 }
        );
      }

      // Check duplicate
      const existingLead = await UnifiedDataService.findDuplicateLead(email.trim(), phone.trim(), targetOrgId);
      if (existingLead) {
        await UnifiedDataService.addLeadActivity(
          existingLead.id,
          `Nueva consulta desde SofIA Web (${org.name}). Inmuebles: ${(propertyIds || []).join(', ') || 'Búsqueda general'}. Notas: ${notes || 'Consulta reiterada'}`,
          'contact_attempt',
          org.aiAssistantName
        );

        return NextResponse.json({
          success: true,
          leadCreated: false,
          leadUpdated: true,
          leadId: existingLead.id,
          message: `¡Hola de nuevo, ${name.trim()}! Hemos actualizado tu requerimiento en el sistema comercial de ${org.name}. Un asesor se comunicará contigo al ${phone} a la brevedad.`,
        });
      }

      const createdLead = await UnifiedDataService.createLead({
        organizationId: targetOrgId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        operationType: criteria?.operation || 'compra',
        propertyType: criteria?.propertyType || 'apartamento',
        municipality: criteria?.municipality || org.city || 'Medellín',
        zone: criteria?.zone || 'El Poblado',
        budget: criteria?.maxBudget || 800000000,
        interestedPropertyIds: propertyIds || [],
        notes: `Captado por ${org.aiAssistantName} (${org.name}). Requerimiento: ${notes || 'Consulta de propiedades'}. Criterios: ${JSON.stringify(criteria || {})}`,
        status: 'nuevo',
        priority: 'alto',
        source: 'asistente_ia',
        consentHabeasData: true,
      });

      return NextResponse.json({
        success: true,
        leadCreated: true,
        leadId: createdLead.id,
        message: `¡Muchas gracias, ${name.trim()}! Hemos registrado tu solicitud en el CRM de ${org.name}. Un asesor comercial se comunicará contigo al ${phone} o ${email} para coordinar la atención y agendar visitas.`,
      });
    }

    // 3. Conversational natural language parsing in Colombian Spanish
    const lastUserMessage = messages && messages.length > 0 ? messages[messages.length - 1].content : '';
    const textLower = lastUserMessage.toLowerCase();

    // Accumulate criteria from previous context (preserves conversation history)
    const parsedCriteria: any = { ...(userContext || {}) };

    // 3.1 Detect explicit property code (e.g. INM-585, INM585, INM-968, 585)
    const codeMatch = textLower.match(/\b(inm-?\d{1,6}|pilot-?\d{1,6}|prem-?\d{1,6})\b/i);
    if (codeMatch) {
      parsedCriteria.code = codeMatch[1].toUpperCase().replace(/\s+/g, '');
      parsedCriteria.searchQuery = parsedCriteria.code;
    } else {
      const bareCodeMatch = textLower.match(/(?:inmueble|código|codigo|propiedad|ref)\s*[:#]?\s*(\d{2,6})/i);
      if (bareCodeMatch) {
        parsedCriteria.code = `INM-${bareCodeMatch[1]}`;
        parsedCriteria.searchQuery = parsedCriteria.code;
      }
    }

    // 3.2 Detect operation
    if (textLower.includes('arrendar') || textLower.includes('alquilar') || textLower.includes('arriendo') || textLower.includes('alquiler') || textLower.includes('rentar') || textLower.includes('en renta')) {
      parsedCriteria.operation = 'arriendo';
    } else if (textLower.includes('comprar') || textLower.includes('compra') || textLower.includes('venta') || textLower.includes('en venta') || textLower.includes('adquirir') || textLower.includes('inversión') || textLower.includes('invertir')) {
      parsedCriteria.operation = 'compra';
    }

    // 3.3 Detect property type
    if (textLower.includes('apartamento') || textLower.includes('apartaestudio') || textLower.includes('apto') || textLower.includes('loft')) {
      parsedCriteria.propertyType = 'apartamento';
    } else if (textLower.includes('casa campestre') || textLower.includes('casa')) {
      parsedCriteria.propertyType = 'casa';
    } else if (textLower.includes('penthouse') || textLower.includes('ph') || textLower.includes('ático') || textLower.includes('atico')) {
      parsedCriteria.propertyType = 'penthouse';
    } else if (textLower.includes('oficina') || textLower.includes('consultorio')) {
      parsedCriteria.propertyType = 'oficina';
    } else if (textLower.includes('local') || textLower.includes('local comercial')) {
      parsedCriteria.propertyType = 'local';
    } else if (textLower.includes('finca') || textLower.includes('hacienda') || textLower.includes('parcela')) {
      parsedCriteria.propertyType = 'finca';
    } else if (textLower.includes('lote') || textLower.includes('terreno')) {
      parsedCriteria.propertyType = 'lote';
    } else if (textLower.includes('bodega') || textLower.includes('galpón') || textLower.includes('galpon')) {
      parsedCriteria.propertyType = 'bodega';
    }

    // 3.4 Detect municipalities and Colombian zones / barrios
    if (textLower.includes('medellín') || textLower.includes('medellin')) {
      parsedCriteria.municipality = 'Medellín';
    }
    if (textLower.includes('envigado')) {
      parsedCriteria.municipality = 'Envigado';
    }
    if (textLower.includes('sabaneta')) {
      parsedCriteria.municipality = 'Sabaneta';
    }
    if (textLower.includes('itagüí') || textLower.includes('itagui')) {
      parsedCriteria.municipality = 'Itagüí';
    }
    if (textLower.includes('bello')) {
      parsedCriteria.municipality = 'Bello';
    }
    if (textLower.includes('rionegro')) {
      parsedCriteria.municipality = 'Rionegro';
    }
    if (textLower.includes('llanogrande')) {
      parsedCriteria.municipality = 'Rionegro';
      parsedCriteria.zone = 'Llanogrande';
    }
    if (textLower.includes('bogotá') || textLower.includes('bogota')) {
      parsedCriteria.municipality = 'Bogotá';
    }

    // Zones & Neighborhoods
    if (textLower.includes('poblado') || textLower.includes('castropol') || textLower.includes('manila') || textLower.includes('provenza') || textLower.includes('san fernando') || textLower.includes('asturias') || textLower.includes('patio bonito') || textLower.includes('lalinde') || textLower.includes('los balsos') || textLower.includes('el tesoro') || textLower.includes('las palmas')) {
      parsedCriteria.zone = 'El Poblado';
      parsedCriteria.municipality = 'Medellín';
    } else if (textLower.includes('laureles') || textLower.includes('estadio') || textLower.includes('conquistadores') || textLower.includes('florida nueva') || textLower.includes('san joaquín') || textLower.includes('san joaquin')) {
      parsedCriteria.zone = 'Laureles';
      parsedCriteria.municipality = 'Medellín';
    } else if (textLower.includes('belén') || textLower.includes('belen') || textLower.includes('la mota') || textLower.includes('loma de los bernal') || textLower.includes('fátima') || textLower.includes('fatima')) {
      parsedCriteria.zone = 'Belén';
      parsedCriteria.municipality = 'Medellín';
    } else if (textLower.includes('chapinero') || textLower.includes('rosales') || textLower.includes('chicó') || textLower.includes('chico') || textLower.includes('usaquén') || textLower.includes('usaquen') || textLower.includes('cedritos') || textLower.includes('santa bárbara')) {
      parsedCriteria.municipality = 'Bogotá';
      if (textLower.includes('chapinero') || textLower.includes('rosales')) parsedCriteria.zone = 'Chapinero / Rosales';
      if (textLower.includes('usaquén') || textLower.includes('usaquen')) parsedCriteria.zone = 'Usaquén';
      if (textLower.includes('chicó') || textLower.includes('chico')) parsedCriteria.zone = 'Chicó';
      if (textLower.includes('cedritos')) parsedCriteria.zone = 'Cedritos';
    }

    // 3.5 Detect bedrooms / alcobas
    if (textLower.includes('1 habitacion') || textLower.includes('1 habitación') || textLower.includes('1 alcoba') || textLower.includes('una habitacion') || textLower.includes('un cuarto') || textLower.includes('una alcoba')) {
      parsedCriteria.minBedrooms = 1;
    } else if (textLower.includes('2 habitacion') || textLower.includes('2 habitaciones') || textLower.includes('dos habitacion') || textLower.includes('dos habitaciones') || textLower.includes('2 alcobas') || textLower.includes('dos alcobas') || textLower.includes('2 cuartos') || textLower.includes('dos cuartos')) {
      parsedCriteria.minBedrooms = 2;
    } else if (textLower.includes('3 habitacion') || textLower.includes('3 habitaciones') || textLower.includes('tres habitacion') || textLower.includes('tres habitaciones') || textLower.includes('3 alcobas') || textLower.includes('tres alcobas') || textLower.includes('3 cuartos') || textLower.includes('tres cuartos')) {
      parsedCriteria.minBedrooms = 3;
    } else if (textLower.includes('4 habitacion') || textLower.includes('4 habitaciones') || textLower.includes('cuatro habitacion') || textLower.includes('cuatro alcobas') || textLower.includes('4 alcobas')) {
      parsedCriteria.minBedrooms = 4;
    }

    // 3.6 Detect bathrooms
    if (textLower.includes('1 baño') || textLower.includes('un baño')) {
      parsedCriteria.minBathrooms = 1;
    } else if (textLower.includes('2 baños') || textLower.includes('dos baños') || textLower.includes('2 banos')) {
      parsedCriteria.minBathrooms = 2;
    } else if (textLower.includes('3 baños') || textLower.includes('tres baños') || textLower.includes('3 banos')) {
      parsedCriteria.minBathrooms = 3;
    }

    // 3.7 Detect budget (pesos colombianos)
    const formattedPesosMatch = textLower.match(/\$?\s*(\d{1,3}(?:[.,]\d{3}){1,3})/);
    if (formattedPesosMatch) {
      const cleanNumStr = formattedPesosMatch[1].replace(/[.,]/g, '');
      const parsedNum = parseInt(cleanNumStr, 10);
      if (parsedNum > 100000) {
        parsedCriteria.maxBudget = parsedNum;
      }
    } else {
      const millionMatch = textLower.match(/(\d+[\.,]?\d*)\s*(millones|millón|millon|m|mdp)/);
      if (millionMatch) {
        const num = parseFloat(millionMatch[1].replace(',', '.'));
        parsedCriteria.maxBudget = num * 1000000;
      } else if (textLower.includes('dos millones y medio') || textLower.includes('2 millones y medio')) {
        parsedCriteria.maxBudget = 2500000;
      } else {
        const rawNumberMatch = textLower.match(/\$?\s*(\d{7,11})/);
        if (rawNumberMatch) {
          parsedCriteria.maxBudget = parseInt(rawNumberMatch[1], 10);
        }
      }
    }

    // 4. Query matching public properties from Supabase PostgreSQL
    const matches = await UnifiedDataService.matchPropertiesForAssistant(parsedCriteria, targetOrgId);

    // 5. OpenAI Live Model (if configured)
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey.startsWith('sk-')) {
      try {
        const systemPrompt = `Eres ${org.aiAssistantName}, la asesora virtual inmobiliaria oficial de ${org.name} en Colombia.
Tu objetivo es orientar con calidez y precisión a compradores y arrendatarios, consultar el catálogo público oficial y captar sus datos para que un asesor humano agende visitas.

REGLAS ESTRICTAS DE NEGOCIO Y HONESTIDAD:
1. NUNCA inventes inmuebles, códigos, precios, ubicaciones ni disponibilidades.
2. Estos son los inmuebles REALES y CONFIRMADOS en la base de datos de ${org.name} que coinciden con la búsqueda:
${JSON.stringify(matches, null, 2)}
3. Si hay propiedades coincidentes, preséntalas con precisión indicando código, zona, precio en COP, alcobas y baños.
4. Si la lista está vacía (no hay coincidencias), dilo cordialmente e invita al usuario a ampliar sus criterios de búsqueda (ej. zona o presupuesto) o a hacer clic en "Solicitar Asesoría Humana" para recibir atención personalizada de un agente.
5. NO afirmes que existen proyectos privados u opciones adicionales si no tienes información verificada para ofrecerlas.
6. Comunícate en español de Colombia, con tono profesional, empático, cálido y conciso.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: systemPrompt }, ...(messages || [])],
            temperature: 0.7,
            max_tokens: 500,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const aiText = data.choices[0].message.content;
          return NextResponse.json({
            success: true,
            mode: 'openai_live',
            aiModel: 'gpt-4o-mini',
            response: aiText,
            matchedProperties: matches,
            updatedCriteria: parsedCriteria,
            organization: {
              id: org.id,
              name: org.name,
              slug: org.slug,
              city: org.city,
              aiAssistantName: org.aiAssistantName,
            },
          });
        }
      } catch (err) {
        console.error('OpenAI call failed, falling back to rule-based engine', err);
      }
    }

    // 6. Rule-based Natural Language Assistant Engine
    let assistantResponse = '';
    const hasOperation = !!parsedCriteria.operation;
    const hasType = !!parsedCriteria.propertyType;
    const hasLocation = !!parsedCriteria.municipality || !!parsedCriteria.zone;
    const hasBudget = !!parsedCriteria.maxBudget;
    const hasCode = !!parsedCriteria.code;

    if (matches.length > 0) {
      const opText = parsedCriteria.operation === 'compra' ? 'en venta' : parsedCriteria.operation === 'arriendo' ? 'en arrendamiento' : 'disponibles';
      assistantResponse = `¡Excelente! He consultado el inventario en tiempo real de **${org.name}** y encontré ${matches.length} ${matches.length === 1 ? 'inmueble confirmado' : 'inmuebles confirmados'} que ${matches.length === 1 ? 'coincide' : 'coinciden'} con tu búsqueda ${opText}:\n\n` +
        matches.map((p, i) => `${i + 1}. **${p.title}** (Código: **${p.code}**) en **${p.municipality} — ${p.zone}**\n   • **Precio:** ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(p.priceCOP)}\n   • **Detalles:** ${p.areaM2} m² | ${p.bedrooms} alcobas | ${p.bathrooms} baños${p.parkingSpots ? ` | ${p.parkingSpots} parqueadero(s)` : ''}\n   • **Descripción:** ${p.description}`).join('\n\n') +
        `\n\n¿Te gustaría agendar una visita a este inmueble? Haz clic en el botón **"Solicitar Asesoría Humana"** o déjame tu nombre y teléfono para que un asesor comercial de ${org.name} te contacte directamente.`;
    } else if (hasCode) {
      assistantResponse = `He consultado el catálogo de **${org.name}** y no encontramos ningún inmueble disponible con el código **${parsedCriteria.code}**.\n\nPuedes revisar nuestro catálogo general o hacer clic en **"Solicitar Asesoría Humana"** para que un asesor te ayude a localizar el inmueble.`;
    } else if (hasOperation || hasType || hasLocation || hasBudget) {
      assistantResponse = `He consultado el catálogo en tiempo real de **${org.name}** y actualmente no tenemos inmuebles disponibles que coincidan exactamente con todos los criterios indicados.\n\nTe sugerimos ampliar la zona de búsqueda o ajustar el rango de presupuesto. También puedes hacer clic en **"Solicitar Asesoría Humana"** o dejarnos tus datos de contacto para que un asesor te oriente de manera personalizada.`;
    } else {
      assistantResponse = org.aiAssistantWelcomeMessage || `¡Hola! Soy ${org.aiAssistantName} de ${org.name}. Con mucho gusto te ayudo a encontrar tu propiedad ideal en ${org.city || 'Colombia'}. Para recomendarte las mejores opciones de nuestro inventario, cuéntame:\n\n1. ¿Estás buscando **comprar** o **arrendar**?\n2. ¿Qué tipo de inmueble prefieres (apartamento, casa, apartaestudio, oficina, etc.)?\n3. ¿En qué zona de tu interés?\n4. ¿Cuál es tu presupuesto estimado?`;
    }

    return NextResponse.json({
      success: true,
      mode: 'rule_based_engine',
      modeNotice: `Asistente Oficial • ${org.name}`,
      response: assistantResponse,
      matchedProperties: matches,
      updatedCriteria: parsedCriteria,
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
