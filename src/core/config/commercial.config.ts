/**
 * Configuración Comercial Centralizada para IA Inmobiliaria
 *
 * Permite definir los canales oficiales de contacto y ventas mediante variables de entorno
 * públicas sin exponer números ficticios al público.
 */

export const COMMERCIAL_CONFIG = {
  // Número de WhatsApp oficial para ventas (formato internacional ej. 573001112233)
  whatsappNumber: process.env.NEXT_PUBLIC_COMMERCIAL_WHATSAPP || '',

  // Correo electrónico corporativo oficial para propuestas y demos
  salesEmail: process.env.NEXT_PUBLIC_COMMERCIAL_EMAIL || 'comercial@iainmobiliaria.co',

  // Nombre del equipo comercial
  salesTeamName: 'Equipo Comercial IA Inmobiliaria Colombia',

  // Enlace a reunión / Calendly (opcional)
  bookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL || '',

  /**
   * Determina si existe un canal de WhatsApp real configurado
   */
  hasRealWhatsApp(): boolean {
    const num = this.whatsappNumber.replace(/[^0-9]/g, '');
    return num.length >= 10 && !num.includes('1234567');
  },

  /**
   * Genera el enlace seguro de WhatsApp con mensaje personalizado
   */
  getWhatsAppLink(message: string): string | null {
    if (!this.hasRealWhatsApp()) return null;
    const cleanNum = this.whatsappNumber.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanNum}?text=${encodeURIComponent(message)}`;
  },

  /**
   * Genera el enlace de correo mailto
   */
  getMailtoLink(subject: string, body: string): string {
    return `mailto:${this.salesEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  },
};
