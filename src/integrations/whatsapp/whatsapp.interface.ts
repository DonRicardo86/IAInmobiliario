export interface WhatsAppInboundMessage {
  messageId: string;
  fromPhone: string;
  senderName: string;
  timestamp: string;
  text: string;
  metadata?: Record<string, any>;
}

export interface WhatsAppOutboundPayload {
  toPhone: string;
  templateName?: string;
  templateVariables?: Record<string, string>;
  customBody?: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IWhatsAppService {
  handleWebhook(payload: any): Promise<WhatsAppInboundMessage | null>;
  sendMessage(payload: WhatsAppOutboundPayload): Promise<WhatsAppSendResult>;
}
