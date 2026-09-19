import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/integrations/ai/ai.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.leadText) {
      return NextResponse.json(
        { success: false, error: 'Se requiere el campo leadText para análisis de IA' },
        { status: 400 }
      );
    }

    const qualification = await aiService.qualifyLead({
      leadText: body.leadText,
      sourceContext: body.sourceContext,
    });

    return NextResponse.json({ success: true, qualification });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
