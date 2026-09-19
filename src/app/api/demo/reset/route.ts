import { NextRequest, NextResponse } from 'next/server';
import { UnifiedDataService } from '@/core/database/supabase-adapter';

export async function POST(req: NextRequest) {
  try {
    UnifiedDataService.resetDatabase();
    return NextResponse.json({ success: true, message: 'Datos de demostración restablecidos correctamente.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
