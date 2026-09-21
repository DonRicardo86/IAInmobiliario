import { NextRequest, NextResponse } from 'next/server';
import { UnifiedDataService } from '@/core/database/supabase-adapter';
import {
  authenticateAdminRequest,
  unauthorizedResponse,
  forbiddenResponse,
  hasRequiredRole,
} from '@/core/auth/auth-guard';
import { DEFAULT_ORGANIZATION } from '@/core/types/organization';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view'); // 'public' | 'admin'
    const search = searchParams.get('search') || undefined;
    const operation = (searchParams.get('operation') as any) || undefined;
    const type = (searchParams.get('type') as any) || undefined;
    const municipality = searchParams.get('municipality') || undefined;
    const zone = searchParams.get('zone') || undefined;
    const status = (searchParams.get('status') as any) || undefined;
    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;

    const filters = {
      search,
      operation,
      type,
      municipality,
      zone,
      status,
      minPrice,
      maxPrice,
    };

    const targetOrgId = searchParams.get('organizationId') || undefined;

    // Public catalog view: only non-sensitive fields from public_properties
    if (view === 'public') {
      const publicProperties = await UnifiedDataService.getPublicProperties(filters, targetOrgId);
      return NextResponse.json({
        success: true,
        properties: publicProperties,
        organizationId: targetOrgId || DEFAULT_ORGANIZATION.id,
      });
    }

    // Admin view: requires authentication
    const authSession = await authenticateAdminRequest(req);
    const authHeader = req.headers.get('authorization') || undefined;
    const isProduction = process.env.NODE_ENV === 'production' && !process.env.TEST_MODE && !process.env.DEMO_MODE;

    if (!authSession && isProduction) {
      return unauthorizedResponse('Acceso restringido: Se requiere autenticación para consultar el inventario privado.');
    }

    const properties = await UnifiedDataService.getProperties(filters, authSession?.organizationId, authHeader);

    // If unauthenticated in demo mode, strictly sanitize private internal addresses
    if (!authSession) {
      const sanitizedForDemo = properties.map((p) => ({
        ...p,
        internalAddress: 'Dirección privada protegida (Modo Demostración)',
      }));
      return NextResponse.json({ success: true, properties: sanitizedForDemo, demoMode: true });
    }

    return NextResponse.json({ success: true, properties });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Authenticate admin request
    const authSession = await authenticateAdminRequest(req);
    const authHeader = req.headers.get('authorization') || undefined;
    if (!authSession) {
      return unauthorizedResponse('Operación administrativa restringida: Se requiere autenticación para registrar propiedades en el inventario.');
    }

    // Check RBAC permission: viewer cannot insert
    if (!hasRequiredRole(authSession, ['owner', 'admin', 'agent'])) {
      return forbiddenResponse('Tu rol de solo lectura (viewer) no tiene permisos para crear inmuebles.');
    }

    // Input validation & sanitization
    if (!body.title?.trim()) {
      return NextResponse.json({ success: false, error: 'El título del inmueble es obligatorio' }, { status: 400 });
    }
    if (!body.code?.trim()) {
      return NextResponse.json({ success: false, error: 'El código del inmueble es obligatorio' }, { status: 400 });
    }
    if (!body.priceCOP || Number(body.priceCOP) <= 0) {
      return NextResponse.json({ success: false, error: 'El precio debe ser mayor a cero' }, { status: 400 });
    }

    const created = await UnifiedDataService.createProperty({
      ...body,
      organizationId: authSession.organizationId,
    }, authHeader);

    return NextResponse.json({ success: true, property: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
