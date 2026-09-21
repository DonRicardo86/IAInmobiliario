import { NextRequest, NextResponse } from 'next/server';
import { UnifiedDataService } from '@/core/database/supabase-adapter';
import { DEFAULT_ORGANIZATION, getOrganizationById } from '@/core/types/organization';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, userContext, leadCapture, organizationId } = body;
    const targetOrgId = organizationId || DEFAULT_ORGANIZATION.id;
    const org = getOrganizationById(targetOrgId);

    // 1. If this is a direct lead capture request from the assistant
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
          `Nueva interacción registrada desde el Asistente Web SofIA. Inmuebles de interés: ${(propertyIds || []).join(', ') || 'Búsqueda general'}. Notas: ${notes || 'Consulta reiterada'}`,
          'contact_attempt',
          org.aiAssistantName
        );

        return NextResponse.json({
          success: true,
          leadCreated: false,
          leadUpdated: true,
          leadId: existingLead.id,
          message: `¡Hola de nuevo, ${name.trim()}! Hemos actualizado tu requerimiento existente en el sistema comercial de ${org.name}. Uno de nuestros asesores te contactará a la brevedad.`,
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
        notes: `Captado por ${org.aiAssistantName}. Requerimiento: ${notes || 'Consulta de propiedades'}. Criterios: ${JSON.stringify(criteria || {})}`,
        status: 'nuevo',
        priority: 'alto',
        source: 'asistente_ia',
        consentHabeasData: true,
      });

      return NextResponse.json({
        success: true,
        leadCreated: true,
        leadId: createdLead.id,
        message: `¡Muchas gracias, ${name.trim()}! Hemos registrado tu solicitud en el CRM de ${org.name}. Un asesor comercial se comunicará contigo al ${phone} o ${email} para coordinar visitas a los inmuebles de tu interés.`,
      });
    }

    // 2. Conversational chat parsing
    const lastUserMessage = messages && messages.length > 0 ? messages[messages.length - 1].content : '';
    const textLower = lastUserMessage.toLowerCase();

    // Accumulate criteria from conversation
    const parsedCriteria: any = { ...userContext };

    // Detect operation
    if (textLower.includes('arrendar') || textLower.includes('alquilar') || textLower.includes('arriendo') || textLower.includes('alquiler') || textLower.includes('rentar')) {
      parsedCriteria.operation = 'arriendo';
    } else if (textLower.includes('comprar') || textLower.includes('compra') || textLower.includes('venta') || textLower.includes('inversión') || textLower.includes('invertir')) {
      parsedCriteria.operation = 'compra';
    }

    // Detect property type
    if (textLower.includes('apartamento') || textLower.includes('apartaestudio') || textLower.includes('apto')) {
      parsedCriteria.propertyType = 'apartamento';
    } else if (textLower.includes('casa')) {
      parsedCriteria.propertyType = 'casa';
    } else if (textLower.includes('penthouse') || textLower.includes('ph')) {
      parsedCriteria.propertyType = 'penthouse';
    } else if (textLower.includes('oficina')) {
      parsedCriteria.propertyType = 'oficina';
    } else if (textLower.includes('local')) {
      parsedCriteria.propertyType = 'local';
    } else if (textLower.includes('finca')) {
      parsedCriteria.propertyType = 'finca';
    } else if (textLower.includes('lote') || textLower.includes('terreno')) {
      parsedCriteria.propertyType = 'lote';
    } else if (textLower.includes('bodega')) {
      parsedCriteria.propertyType = 'bodega';
    }

    // Detect municipality or zone
    if (textLower.includes('medellín') || textLower.includes('medellin')) {
      parsedCriteria.municipality = 'Medellín';
    }
    if (textLower.includes('poblado')) {
      parsedCriteria.zone = 'El Poblado';
      parsedCriteria.municipality = 'Medellín';
    } else if (textLower.includes('laureles')) {
      parsedCriteria.zone = 'Laureles';
      parsedCriteria.municipality = 'Medellín';
    } else if (textLower.includes('belén') || textLower.includes('belen')) {
      parsedCriteria.zone = 'Belén';
      parsedCriteria.municipality = 'Medellín';
    } else if (textLower.includes('envigado') || textLower.includes('brujas')) {
      parsedCriteria.municipality = 'Envigado';
    } else if (textLower.includes('sabaneta')) {
      parsedCriteria.municipality = 'Sabaneta';
    } else if (textLower.includes('rionegro') || textLower.includes('llanogrande')) {
      parsedCriteria.municipality = 'Rionegro';
      parsedCriteria.zone = 'Llanogrande';
    } else if (textLower.includes('bogotá') || textLower.includes('bogota') || textLower.includes('chapinero') || textLower.includes('rosales') || textLower.includes('usaquén') || textLower.includes('usaquen') || textLower.includes('chicó') || textLower.includes('chico')) {
      parsedCriteria.municipality = 'Bogotá';
      if (textLower.includes('chapinero') || textLower.includes('rosales')) parsedCriteria.zone = 'Chapinero / Rosales';
      if (textLower.includes('usaquén') || textLower.includes('usaquen')) parsedCriteria.zone = 'Usaquén';
      if (textLower.includes('chicó') || textLower.includes('chico')) parsedCriteria.zone = 'Chicó';
    }

    // Detect bedrooms
    if (textLower.includes('1 habitacion') || textLower.includes('1 habitación') || textLower.includes('1 alcoba') || textLower.includes('una habitacion') || textLower.includes('un cuarto')) {
      parsedCriteria.minBedrooms = 1;
    } else if (textLower.includes('2 habitacion') || textLower.includes('2 habitación') || textLower.includes('dos habitacion') || textLower.includes('dos habitación') || textLower.includes('2 alcobas') || textLower.includes('dos alcobas') || textLower.includes('2 cuartos') || textLower.includes('dos cuartos')) {
      parsedCriteria.minBedrooms = 2;
    } else if (textLower.includes('3 habitacion') || textLower.includes('3 habitación') || textLower.includes('tres habitacion') || textLower.includes('tres habitación') || textLower.includes('3 alcobas') || textLower.includes('tres alcobas') || textLower.includes('3 cuartos') || textLower.includes('tres cuartos')) {
      parsedCriteria.minBedrooms = 3;
    } else if (textLower.includes('4 habitacion') || textLower.includes('4 habitación') || textLower.includes('cuatro habitacion') || textLower.includes('cuatro alcobas')) {
      parsedCriteria.minBedrooms = 4;
    }

    // Detect numbers/budget mentions (e.g. "$2.500.000", "2.500.000", "800 millones", "2.5 millones", "2 millones y medio")
    const formattedPesosMatch = textLower.match(/\$?\s*(\d{1,3}(?:[.,]\d{3}){1,3})/);
    if (formattedPesosMatch) {
      const cleanNumStr = formattedPesosMatch[1].replace(/[.,]/g, '');
      const parsedNum = parseInt(cleanNumStr, 10);
      if (parsedNum > 100000) {
        parsedCriteria.maxBudget = parsedNum;
      }
    } else {
      const millionMatch = textLower.match(/(\d+[\.,]?\d*)\s*(millones|millón|m|mdp)/);
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

    // 3. Check OpenAI API Key
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey && apiKey.startsWith('sk-')) {
      try {
        const matches = await UnifiedDataService.matchPropertiesForAssistant(parsedCriteria, targetOrgId);

        const systemPrompt = `Eres ${org.aiAssistantName}, la asesora virtual inmobiliaria de ${org.name} en Colombia.
Tu objetivo es orientar cordialmente a compradores y arrendatarios, consultar el inventario real y captar sus datos para que un asesor humano agende visitas.

REGLAS ESTRICTAS DE NEGOCIO Y HONESTIDAD:
1. NUNCA inventes inmuebles, códigos, precios, ubicaciones ni disponibilidades.
2. Estos son los inmuebles REALES y CONFIRMADOS en la base de datos de ${org.name} que coinciden con la búsqueda:
${JSON.stringify(matches, null, 2)}
3. Si hay propiedades coincidentes, preséntalas con precisión indicando código, zona, precio en COP, alcobas y baños.
4. Si no hay propiedades que coincidan (lista vacía), dilo con amabilidad e invita al usuario a dejar sus datos para que un asesor busque opciones no listadas en el catálogo público o proyectos en desarrollo.
5. Invita cordialmente al usuario a hacer clic en "Solicitar Asesoría Humana" o proporcionar su nombre, teléfono y correo para agendar una visita formal.
6. Comunícate en español de Colombia, con tono profesional, empático, cálido y conciso.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
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
            organizationId: targetOrgId,
          });
        }
      } catch (err) {
        console.error('OpenAI call failed, falling back to rule-based engine', err);
      }
    }

    // 4. Rule-based Natural Language Assistant Engine (Backup & Demo)
    const matches = await UnifiedDataService.matchPropertiesForAssistant(parsedCriteria, targetOrgId);

    let assistantResponse = '';
    const hasOperation = !!parsedCriteria.operation;
    const hasType = !!parsedCriteria.propertyType;
    const hasLocation = !!parsedCriteria.municipality || !!parsedCriteria.zone;
    const hasBudget = !!parsedCriteria.maxBudget;

    if (matches.length > 0) {
      const opText = parsedCriteria.operation === 'compra' ? 'en venta' : parsedCriteria.operation === 'arriendo' ? 'en arrendamiento' : 'disponibles';
      assistantResponse = `¡Excelente! He consultado el inventario de ${org.name} y encontré ${matches.length} ${matches.length === 1 ? 'inmueble confirmado' : 'inmuebles confirmados'} con tu búsqueda ${opText}:\n\n` +
        matches.map((p, i) => `${i + 1}. **${p.title}** (${p.code}) en **${p.municipality} - ${p.zone}**: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(p.priceCOP)} (${p.areaM2}m², ${p.bedrooms} alcobas, ${p.bathrooms} baños).`).join('\n') +
        `\n\n¿Te gustaría agendar una visita a alguno de estos inmuebles? Haz clic en "Solicitar Asesoría Humana" o déjame tu nombre y teléfono para coordinar con un asesor.`;
    } else if (hasOperation || hasType || hasLocation || hasBudget) {
      assistantResponse = `He revisado nuestro catálogo en tiempo real y actualmente no tenemos inmuebles que coincidan exactamente con esos parámetros de búsqueda en ${org.name}.\n\nSin embargo, nuestro equipo comercial cuenta con opciones privadas y proyectos sobre planos. ¿Te gustaría dejarme tu nombre, teléfono y correo para que un asesor te contacte con opciones personalizadas?`;
    } else {
      assistantResponse = `¡Hola! Soy ${org.aiAssistantName} de ${org.name}. Con mucho gusto te ayudo a encontrar tu propiedad ideal. Para recomendarte las mejores opciones de nuestro inventario, cuéntame:\n\n1. ¿Estás buscando **comprar** o **arrendar**?\n2. ¿Qué tipo de inmueble prefieres (apartamento, casa, apartaestudio, oficina, etc.)?\n3. ¿En qué ciudad o zona (ej. El Poblado, Laureles, Belén, Envigado, Chapinero)?\n4. ¿Cuál es tu presupuesto estimado?`;
    }

    return NextResponse.json({
      success: true,
      mode: 'rule_based_demo',
      modeNotice: 'Modo Asistente por Reglas / Demostración (Configure OPENAI_API_KEY en variables de entorno para activar GPT-4o)',
      response: assistantResponse,
      matchedProperties: matches,
      updatedCriteria: parsedCriteria,
      organizationId: targetOrgId,
    });
  } catch (error: any) {
    console.error('Error in AI assistant route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
