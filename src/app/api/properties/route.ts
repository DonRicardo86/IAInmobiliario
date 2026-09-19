import { NextRequest, NextResponse } from 'next/server';
import { UnifiedDataService } from '@/core/database/supabase-adapter';
import { authenticateAdminRequest, unauthorizedResponse } from '@/core/auth/auth-guard';

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

    if (view === 'public') {
      const publicProperties = await UnifiedDataService.getPublicProperties(filters);
      return NextResponse.json({ success: true, properties: publicProperties });
    }

    // Admin view: Check if authenticated or in public demo tour
    const authSession = await authenticateAdminRequest(req);
    const properties = await UnifiedDataService.getProperties(filters, authSession?.organizationId);

    // If anonymous in public demo, sanitize private internal addresses
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

    // Authenticate admin request
    const authSession = await authenticateAdminRequest(req);
    if (!authSession) {
      return unauthorizedResponse('Operación administrativa restringida: Se requiere autenticación para registrar propiedades en el inventario.');
    }

    const created = await UnifiedDataService.createProperty({
      ...body,
      organizationId: authSession.organizationId,
    });

    return NextResponse.json({ success: true, property: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
