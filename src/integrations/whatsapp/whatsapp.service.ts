import {
  IWhatsAppService,
  WhatsAppInboundMessage,
  WhatsAppOutboundPayload,
  WhatsAppSendResult,
} from './whatsapp.interface';

/**
 * WhatsApp Service Stub
 * Prepared for plug-and-play integration with Meta Cloud API, Twilio, or Baileys.
 */
export class WhatsAppService implements IWhatsAppService {
  async handleWebhook(payload: any): Promise<WhatsAppInboundMessage | null> {
    // Parser for incoming webhook payloads
    if (!payload) return null;

    return {
      messageId: payload.id || `wa-${Date.now()}`,
      fromPhone: payload.from || '+573000000000',
      senderName: payload.name || 'Cliente WhatsApp',
      timestamp: new Date().toISOString(),
      text: payload.text || '',
      metadata: payload,
    };
  }

  async sendMessage(payload: WhatsAppOutboundPayload): Promise<WhatsAppSendResult> {
    console.log('[WhatsAppService] Outbound message scheduled:', payload);
    return {
      success: true,
      messageId: `msg_${Date.now()}`,
    };
  }

  getWhatsAppDirectLink(phone: string, text?: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedText = text ? encodeURIComponent(text) : '';
    return `https://wa.me/${cleanPhone}${encodedText ? `?text=${encodedText}` : ''}`;
  }
}

export const whatsappService = new WhatsAppService();
