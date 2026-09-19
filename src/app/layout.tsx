import type { Metadata } from 'next';
import '@/styles/globals.css';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'IA Inmobiliaria | Sistema SaaS de Gestión y Calificación de Prospectos',
  description: 'Plataforma SaaS profesional para inmobiliarias con gestión inteligente de prospectos, embudo de conversión y preparación para IA y WhatsApp.',
  keywords: 'inmobiliaria, CRM inmobiliario, SaaS, leads, prospectos, IA inmobiliaria, WhatsApp CRM',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
