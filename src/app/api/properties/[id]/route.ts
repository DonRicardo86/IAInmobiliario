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
    const property = await UnifiedDataService.getPropertyById(id);
    if (!property) {
      return NextResponse.json({ success: false, error: 'Inmueble no encontrado' }, { status: 404 });
    }

    const authSession = await authenticateAdminRequest(req);
    if (!authSession) {
      return NextResponse.json({
        success: true,
        property: {
          ...property,
          internalAddress: 'Dirección privada protegida (Modo Demostración)',
        },
      });
    }

    return NextResponse.json({ success: true, property });
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
      return unauthorizedResponse('Operación administrativa restringida: Se requiere autenticación para modificar inmuebles.');
    }

    // RBAC: viewer cannot update
    if (!hasRequiredRole(authSession, ['owner', 'admin', 'agent'])) {
      return forbiddenResponse('Tu rol de solo lectura (viewer) no tiene permisos para modificar inmuebles.');
    }

    const updated = await UnifiedDataService.updateProperty(id, body);
    return NextResponse.json({ success: true, property: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authSession = await authenticateAdminRequest(req);
    if (!authSession) {
      return unauthorizedResponse('Operación administrativa restringida: Se requiere autenticación para eliminar inmuebles.');
    }

    // RBAC: only owner and admin can delete properties
    if (!hasRequiredRole(authSession, ['owner', 'admin'])) {
      return forbiddenResponse('Solo los roles owner y admin tienen permisos para eliminar inmuebles.');
    }

    const deleted = await UnifiedDataService.deleteProperty(id);
    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
