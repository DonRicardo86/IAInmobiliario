import { NextRequest, NextResponse } from 'next/server';
import { UnifiedDataService } from '@/core/database/supabase-adapter';
import { authenticateAdminRequest, unauthorizedResponse } from '@/core/auth/auth-guard';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lead = await UnifiedDataService.getLeadById(id);
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Prospecto no encontrado' }, { status: 404 });
    }

    const authSession = await authenticateAdminRequest(req);
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
    if (!authSession) {
      return unauthorizedResponse('Operación administrativa restringida: Se requiere autenticación para modificar prospectos.');
    }

    if (body.activity) {
      const updated = await UnifiedDataService.addLeadActivity(
        id,
        body.activity.description,
        body.activity.type || 'note_added',
        body.activity.author || 'Asesor'
      );
      return NextResponse.json({ success: true, lead: updated });
    }

    const updated = await UnifiedDataService.updateLead(id, body);
    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authSession = await authenticateAdminRequest(req);
    if (!authSession) {
      return unauthorizedResponse('Operación administrativa restringida: Se requiere autenticación para eliminar prospectos.');
    }

    const deleted = await UnifiedDataService.deleteLead(id);
    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
