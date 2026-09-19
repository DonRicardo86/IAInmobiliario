import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/integrations/whatsapp/whatsapp.service';

/**
 * WhatsApp Webhook Endpoint
 * GET: Meta verification handshake
 * POST: Inbound messages / status updates
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verify token check (stub)
  if (mode === 'subscribe' && token === (process.env.WHATSAPP_VERIFY_TOKEN || 'inmo_ia_secret_token')) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ status: 'active', message: 'WhatsApp Webhook Endpoint Ready' });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const inbound = await whatsappService.handleWebhook(payload);

    return NextResponse.json({
      success: true,
      processed: true,
      data: inbound,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
