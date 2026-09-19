import { NextRequest, NextResponse } from 'next/server';
import { UnifiedDataService } from '@/core/database/supabase-adapter';
import { authenticateAdminRequest, unauthorizedResponse } from '@/core/auth/auth-guard';

export async function POST(req: NextRequest) {
  try {
    const authSession = await authenticateAdminRequest(req);
    if (!authSession) {
      return unauthorizedResponse('Operación administrativa restringida: Solo administradores autorizados pueden reiniciar los datos.');
    }

    UnifiedDataService.resetDatabase();
    return NextResponse.json({ success: true, message: 'Datos de demostración restablecidos correctamente.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
