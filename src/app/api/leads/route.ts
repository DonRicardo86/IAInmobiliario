import { NextRequest, NextResponse } from 'next/server';
import { UnifiedDataService } from '@/core/database/supabase-adapter';
import { authenticateAdminRequest } from '@/core/auth/auth-guard';
import { DEFAULT_ORGANIZATION } from '@/core/types/organization';

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
    const orgId = authSession?.organizationId || DEFAULT_ORGANIZATION.id;

    const leads = await UnifiedDataService.getLeads(filters, orgId);
    const stats = await UnifiedDataService.getStats(orgId);

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

    // Protection & strict validation
    if (!body.name?.trim()) {
      return NextResponse.json({ success: false, error: 'El nombre es obligatorio' }, { status: 400 });
    }
    if (!body.phone?.trim()) {
      return NextResponse.json({ success: false, error: 'El teléfono es obligatorio' }, { status: 400 });
    }
    if (body.consentHabeasData === false) {
      return NextResponse.json({ success: false, error: 'Se requiere la autorización de tratamiento de datos personales.' }, { status: 400 });
    }

    const authSession = await authenticateAdminRequest(req);
    const targetOrgId = authSession?.organizationId || body.organizationId || DEFAULT_ORGANIZATION.id;

    // Check duplicate
    if (body.email || body.phone) {
      const existing = await UnifiedDataService.findDuplicateLead(body.email || '', body.phone || '', targetOrgId);
      if (existing && !body.allowDuplicate) {
        const updated = await UnifiedDataService.addLeadActivity(
          existing.id,
          `Nueva interacción registrada desde formulario web. Notas: ${body.notes || 'Consulta recurrente'}`,
          'contact_attempt',
          'Sistema'
        );
        return NextResponse.json({
          success: true,
          lead: updated,
          duplicateDetected: true,
          demoMode: !authSession,
        }, { status: 200 });
      }
    }

    const newLead = await UnifiedDataService.createLead({
      ...body,
      organizationId: targetOrgId,
      consentHabeasData: body.consentHabeasData !== false,
    });

    return NextResponse.json({ success: true, lead: newLead, demoMode: !authSession }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
