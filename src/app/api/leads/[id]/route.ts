import { NextRequest, NextResponse } from 'next/server';
import { UnifiedDataService } from '@/core/database/supabase-adapter';
import {
  authenticateAdminRequest,
  unauthorizedResponse,
  forbiddenResponse,
  hasRequiredRole,
} from '@/core/auth/auth-guard';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization') || undefined;
    const lead = await UnifiedDataService.getLeadById(id, authHeader);
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Prospecto no encontrado' }, { status: 404 });
    }

    const authSession = await authenticateAdminRequest(req);
    const isProduction = process.env.NODE_ENV === 'production' && !process.env.TEST_MODE && !process.env.DEMO_MODE;

    if (!authSession && isProduction) {
      return unauthorizedResponse('Acceso restringido: Se requiere autenticación para consultar prospectos.');
    }

    if (!authSession) {
      return NextResponse.json({
        success: true,
        lead: {
          ...lead,
          phone: lead.phone ? lead.phone.slice(0, 7) + '****' : 'Protegido (Demo)',
          email: 'contacto-demo@inmobiliariapremier.co',
        },
        demoMode: true,
      });
    }

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const authSession = await authenticateAdminRequest(req);
    const authHeader = req.headers.get('authorization') || undefined;
    if (!authSession) {
      return unauthorizedResponse('Operación administrativa restringida: Se requiere autenticación para modificar prospectos.');
    }

    // RBAC: viewer cannot update leads
    if (!hasRequiredRole(authSession, ['owner', 'admin', 'agent'])) {
      return forbiddenResponse('Tu rol de solo lectura (viewer) no tiene permisos para modificar prospectos.');
    }

    if (body.activity) {
      await UnifiedDataService.addLeadActivity(
        id,
        body.activity.description,
        body.activity.type || 'note_added',
        body.activity.author || 'Asesor',
        authHeader
      );
    }

    const { activity, ...updates } = body;
    let updatedLead = null;
    if (Object.keys(updates).length > 0) {
      updatedLead = await UnifiedDataService.updateLead(id, updates, authHeader);
    } else {
      updatedLead = await UnifiedDataService.getLeadById(id, authHeader);
    }

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authSession = await authenticateAdminRequest(req);
    const authHeader = req.headers.get('authorization') || undefined;
    if (!authSession) {
      return unauthorizedResponse('Operación administrativa restringida: Se requiere autenticación para eliminar prospectos.');
    }

    // RBAC: only owner and admin can delete leads
    if (!hasRequiredRole(authSession, ['owner', 'admin'])) {
      return forbiddenResponse('Solo los roles owner y admin tienen permisos para eliminar prospectos.');
    }

    const deleted = await UnifiedDataService.deleteLead(id, authHeader);
    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
