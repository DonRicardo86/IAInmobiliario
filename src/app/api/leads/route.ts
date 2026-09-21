import { NextRequest, NextResponse } from 'next/server';
import { UnifiedDataService } from '@/core/database/supabase-adapter';
import {
  authenticateAdminRequest,
  unauthorizedResponse,
  forbiddenResponse,
  rateLimitResponse,
  hasRequiredRole,
  checkRateLimit,
} from '@/core/auth/auth-guard';
import { DEFAULT_ORGANIZATION, KNOWN_ORGANIZATIONS } from '@/core/types/organization';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const status = (searchParams.get('status') as any) || undefined;
    const priority = (searchParams.get('priority') as any) || undefined;
    const operationType = (searchParams.get('operationType') as any) || undefined;
    const propertyType = (searchParams.get('propertyType') as any) || undefined;
    const municipality = searchParams.get('municipality') || undefined;
    const zone = searchParams.get('zone') || undefined;

    const filters = {
      search,
      status,
      priority,
      operationType,
      propertyType,
      municipality,
      zone,
    };

    const authSession = await authenticateAdminRequest(req);
    const authHeader = req.headers.get('authorization') || undefined;
    const isProduction = process.env.NODE_ENV === 'production' && !process.env.TEST_MODE && !process.env.DEMO_MODE;

    if (!authSession && isProduction) {
      return unauthorizedResponse('Acceso restringido: Se requiere autenticación para consultar prospectos comerciales.');
    }

    const orgId = authSession?.organizationId || DEFAULT_ORGANIZATION.id;

    const leads = await UnifiedDataService.getLeads(filters, orgId, authHeader);
    const stats = await UnifiedDataService.getStats(orgId, authHeader);

    // If unauthenticated in public demo mode, mask contact information
    const sanitizedLeads = !authSession
      ? leads.map((l) => ({
          ...l,
          phone: l.phone ? l.phone.slice(0, 7) + '****' : '+57 300 ****00',
          email: 'contacto-demo@inmobiliariapremier.co',
        }))
      : leads;

    return NextResponse.json({
      success: true,
      leads: sanitizedLeads,
      stats,
      demoMode: !authSession,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const authSession = await authenticateAdminRequest(req);
    const authHeader = req.headers.get('authorization') || undefined;

    // If authenticated: enforce RBAC role permissions
    if (authSession) {
      if (!hasRequiredRole(authSession, ['owner', 'admin', 'agent'])) {
        return forbiddenResponse('Tu rol de solo lectura (viewer) no tiene permisos para crear prospectos.');
      }
    } else {
      // If unauthenticated: apply anti-abuse rate limiter
      const clientIp = req.headers.get('x-forwarded-for') || 'anonymous-client';
      const isAllowed = await checkRateLimit(clientIp, 'api/leads', 15, 60);
      if (!isAllowed) {
        return rateLimitResponse('Has enviado demasiadas solicitudes. Por favor espera un minuto antes de reintentar.');
      }
    }

    // Protection & strict validation
    if (!body.name?.trim()) {
      return NextResponse.json({ success: false, error: 'El nombre es obligatorio' }, { status: 400 });
    }
    if (!body.phone?.trim()) {
      return NextResponse.json({ success: false, error: 'El teléfono es obligatorio' }, { status: 400 });
    }
    if (body.consentHabeasData === false) {
      return NextResponse.json(
        { success: false, error: 'Se requiere la autorización de tratamiento de datos personales (Ley Habeas Data).' },
        { status: 400 }
      );
    }

    // Determine target organization safely
    let targetOrgId = DEFAULT_ORGANIZATION.id;
    if (authSession) {
      targetOrgId = authSession.organizationId;
    } else if (body.organizationId && KNOWN_ORGANIZATIONS[body.organizationId]) {
      targetOrgId = body.organizationId;
    }

    // Check duplicate
    if (body.email || body.phone) {
      const existing = await UnifiedDataService.findDuplicateLead(body.email || '', body.phone || '', targetOrgId, authHeader);
      if (existing && !body.allowDuplicate) {
        const updated = await UnifiedDataService.addLeadActivity(
          existing.id,
          `Nueva interacción registrada desde captación web. Notas: ${body.notes || 'Consulta recurrente'}`,
          'contact_attempt',
          'Sistema',
          authHeader
        );
        return NextResponse.json(
          {
            success: true,
            lead: updated,
            duplicateDetected: true,
            demoMode: !authSession,
          },
          { status: 200 }
        );
      }
    }

    const newLead = await UnifiedDataService.createLead({
      ...body,
      organizationId: targetOrgId,
      consentHabeasData: body.consentHabeasData !== false,
      source: body.source || (authSession ? 'manual' : 'web_form'),
    }, authHeader);

    return NextResponse.json({ success: true, lead: newLead, demoMode: !authSession }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
