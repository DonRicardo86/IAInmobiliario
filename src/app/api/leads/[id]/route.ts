import { NextRequest, NextResponse } from 'next/server';
import { UnifiedDataService } from '@/core/database/supabase-adapter';
import { authenticateAdminRequest } from '@/core/auth/auth-guard';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lead = await UnifiedDataService.getLeadById(id);
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Prospecto no encontrado' }, { status: 404 });
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

    if (body.activity) {
      const updated = await UnifiedDataService.addLeadActivity(
        id,
        body.activity.description,
        body.activity.type || 'note_added',
        body.activity.author || 'Asesor'
      );
      return NextResponse.json({ success: true, lead: updated, demoMode: !authSession });
    }

    const updated = await UnifiedDataService.updateLead(id, body);
    return NextResponse.json({ success: true, lead: updated, demoMode: !authSession });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authSession = await authenticateAdminRequest(req);
    const deleted = await UnifiedDataService.deleteLead(id);
    return NextResponse.json({ success: deleted, demoMode: !authSession });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
