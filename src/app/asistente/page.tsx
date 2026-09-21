'use client';

import React, { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PropertyPublicView } from '@/core/types/property';
import { Organization, PILOT_ORGANIZATION } from '@/core/types/organization';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import {
  Sparkles,
  Send,
  Building2,
  MapPin,
  Maximize2,
  DollarSign,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  ShieldCheck,
  Bot,
  User,
  ExternalLink,
  MessageSquare,
  Info,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  matchedProperties?: PropertyPublicView[];
  mode?: string;
  timestamp: string;
}

function FormattedChatMessage({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} style={{ height: '0.35rem' }} />;
        }

        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
        const cleanLine = isBullet ? line.trim().replace(/^[•-]\s*/, '') : line;

        // Parse bold markers **text**
        const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);

        const rendered = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} style={{ color: '#ffffff', fontWeight: 700 }}>
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <span key={pIdx}>{part}</span>;
        });

        if (isBullet) {
          return (
            <div key={lineIdx} style={{ display: 'flex', gap: '0.45rem', paddingLeft: '0.4rem', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>•</span>
              <span style={{ flex: 1 }}>{rendered}</span>
            </div>
          );
        }

        return (
          <div key={lineIdx} style={{ margin: 0, lineHeight: 1.55 }}>
            {rendered}
          </div>
        );
      })}
    </div>
  );
}

function AsistenteIAContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const orgSlug = searchParams.get('org') || 'inmo-piloto';

  const [org, setOrg] = useState<Organization>(PILOT_ORGANIZATION);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentCriteria, setCurrentCriteria] = useState<any>({});
  const [modeNotice, setModeNotice] = useState<string>('Conectado al Inventario Real');

  // Lead Intake Form State
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadConsent, setLeadConsent] = useState(true);
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load organization details from backend
  useEffect(() => {
    async function loadOrg() {
      try {
        const res = await fetch(`/api/organizations?slug=${encodeURIComponent(orgSlug)}`);
        const data = await res.json();
        if (data.success && data.organization) {
          setOrg(data.organization);
          setMessages([
            {
              id: 'welcome-1',
              sender: 'bot',
              text: data.organization.aiAssistantWelcomeMessage || `¡Hola! Soy SofIA, tu asesora inmobiliaria virtual de ${data.organization.name} en ${data.organization.city || 'Medellín'}. 👋\n\n¿Estás buscando comprar o arrendar una propiedad? Cuéntame qué tipo de inmueble buscas, la zona de tu preferencia y tu presupuesto aproximado.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
          setModeNotice(`Asistente Oficial • ${data.organization.name}`);
        } else {
          // Fallback to pilot organization
          setMessages([
            {
              id: 'welcome-1',
              sender: 'bot',
              text: PILOT_ORGANIZATION.aiAssistantWelcomeMessage,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      } catch (err) {
        console.error('Error fetching org for assistant:', err);
      }
    }
    loadOrg();
  }, [orgSlug]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          userContext: currentCriteria,
          orgSlug: orgSlug,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.modeNotice) setModeNotice(data.modeNotice);
        if (data.updatedCriteria) setCurrentCriteria(data.updatedCriteria);

        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: data.response,
          matchedProperties: data.matchedProperties,
          mode: data.mode,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        showToast(data.error || 'Error en la comunicación con el asistente', 'error');
      }
    } catch (e: any) {
      console.error(e);
      showToast('Error de conexión con el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadPhone.trim() || !leadEmail.trim()) {
      showToast('Por favor ingrese todos los campos requeridos.', 'error');
      return;
    }
    if (!leadConsent) {
      showToast('Debe autorizar el tratamiento de datos personales (Habeas Data).', 'error');
      return;
    }

    try {
      setSubmittingLead(true);
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgSlug: orgSlug,
          leadCapture: {
            name: leadName.trim(),
            phone: leadPhone.trim(),
            email: leadEmail.trim(),
            criteria: currentCriteria,
            consentHabeasData: true,
            notes: `Captura desde Asistente SofIA (${org?.name || 'Inmobiliaria'}). Criterios: ${JSON.stringify(currentCriteria)}`,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLeadSuccess(true);
        setShowLeadForm(false);
        setLeadName('');
        setLeadPhone('');
        setLeadEmail('');
        showToast('¡Solicitud registrada con éxito en el CRM!', 'success');

        setMessages((prev) => [
          ...prev,
          {
            id: `bot-lead-${Date.now()}`,
            sender: 'bot',
            text: data.message || `¡Muchas gracias! Hemos recibido tus datos y un asesor se comunicará contigo pronto.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        const errorMsg = data.message || data.error || 'No fue posible registrar la solicitud en este momento.';
        showToast(errorMsg, 'error');
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-err-${Date.now()}`,
            sender: 'bot',
            text: `⚠️ No fue posible registrar automáticamente tu solicitud en este momento.\n\nPuedes contactarnos directamente para atenderte de inmediato:\n• **WhatsApp:** +57 304 360 5155\n• **Correo:** agenteinmobiliaria1986@gmail.com`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (e: any) {
      console.error('Error submitting lead form:', e);
      showToast('Error de conexión con el servidor', 'error');
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: `⚠️ Hubo un inconveniente de conexión. Por favor comunícate directamente con nuestro equipo comercial:\n• **WhatsApp:** +57 304 360 5155\n• **Correo:** agenteinmobiliaria1986@gmail.com`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setSubmittingLead(false);
    }
  };

  const quickPrompts = [
    'Consultar inmueble INM-585',
    'Busco apartamento en compra en Medellín',
    'Arriendo en El Poblado con 2 alcobas',
    'Casa campestre en Envigado',
    'Oficina corporativa en arriendo',
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(9, 13, 22, 0.95)',
          backdropFilter: 'blur(16px)',
          padding: '0.85rem 2rem',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href={`/propiedades?org=${encodeURIComponent(orgSlug)}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', display: 'block' }}>
                SofIA • {org?.name || 'Inmobiliaria Piloto'}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)' }}>● Conectada al inventario en tiempo real</span>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link
              href={`/propiedades?org=${encodeURIComponent(orgSlug)}`}
              style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}
            >
              Ver Catálogo ({org?.name || 'Piloto'})
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowLeadForm(true)}
              icon={<UserCheck size={14} />}
            >
              Solicitar Asesoría Humana
            </Button>
          </div>
        </div>
      </header>

      {/* Mode Transparency Banner */}
      <div
        style={{
          backgroundColor: 'rgba(79, 70, 229, 0.12)',
          borderBottom: '1px solid rgba(79, 70, 229, 0.25)',
          padding: '0.45rem 1.5rem',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
        }}
      >
        <Info size={14} color="var(--primary-light)" />
        <span>
          <strong>{modeNotice}</strong> — Consultando inventario verificado en Supabase PostgreSQL.
        </span>
      </div>

      {/* Main Chat Container */}
      <div style={{ flex: 1, maxWidth: '1000px', width: '100%', margin: '0 auto', padding: '1.5rem 1.5rem 6rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Messages Feed */}
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'flex-start',
                flexDirection: isBot ? 'row' : 'row-reverse',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: isBot ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0,
                  boxShadow: isBot ? '0 0 10px rgba(79, 70, 229, 0.4)' : 'none',
                }}
              >
                {isBot ? <Bot size={18} /> : <User size={18} />}
              </div>

              {/* Message Bubble */}
              <div
                style={{
                  maxWidth: '82%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
              >
                <div
                  style={{
                    backgroundColor: isBot ? 'var(--bg-card)' : 'var(--primary)',
                    border: isBot ? '1px solid var(--border-card)' : 'none',
                    borderRadius: isBot ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                    padding: '0.9rem 1.15rem',
                    color: '#fff',
                    fontSize: '0.92rem',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  <FormattedChatMessage content={msg.text} />
                </div>

                {/* Embedded Real Property Cards */}
                {msg.matchedProperties && msg.matchedProperties.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', marginTop: '0.4rem' }}>
                    {msg.matchedProperties.map((p) => {
                      const formattedPrice = new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        maximumFractionDigits: 0,
                      }).format(p.priceCOP);

                      return (
                        <div
                          key={p.id}
                          style={{
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-card)',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <div style={{ height: '120px', position: 'relative' }}>
                            {p.images && p.images.length > 0 ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.images[0]} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                Ficha Oficial
                              </div>
                            )}
                            <span
                              style={{
                                position: 'absolute',
                                top: '0.4rem',
                                left: '0.4rem',
                                backgroundColor: p.operation === 'compra' ? '#10b981' : '#6366f1',
                                color: '#fff',
                                padding: '0.15rem 0.45rem',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                              }}
                            >
                              {p.operation}
                            </span>
                          </div>

                          <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--secondary)', fontWeight: 600 }}>
                              {p.code} • {p.municipality} ({p.zone})
                            </span>
                            <strong style={{ fontSize: '0.85rem', color: '#fff', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {p.title}
                            </strong>
                            <span style={{ fontSize: '0.9rem', color: 'var(--accent-emerald)', fontWeight: 800 }}>
                              {formattedPrice}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {p.areaM2} m² • {p.bedrooms} alcobas • {p.bathrooms} baños
                            </span>

                            <Link
                              href={`/propiedades/${p.id}`}
                              target="_blank"
                              style={{
                                marginTop: 'auto',
                                paddingTop: '0.4rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                color: '#38bdf8',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                textDecoration: 'none',
                              }}
                            >
                              <span>Ver Ficha Completa</span>
                              <ExternalLink size={12} />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <span
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    alignSelf: isBot ? 'flex-start' : 'flex-end',
                    padding: '0 0.25rem',
                  }}
                >
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Bot size={18} />
            </div>
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: '4px 16px 16px 16px',
                padding: '0.75rem 1.25rem',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--secondary)', animation: 'pulseGlow 1s infinite' }} />
              <span>SofIA está consultando el catálogo en tiempo real...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Fixed Input & Quick Prompts Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(9, 13, 22, 0.95)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--border-subtle)',
          padding: '0.85rem 1.5rem',
          zIndex: 80,
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {/* Quick Prompts */}
          <div style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
            {quickPrompts.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-full)',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.76rem',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                + {p}
              </button>
            ))}
          </div>

          {/* Text Input Row */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            style={{ display: 'flex', gap: '0.65rem' }}
          >
            <input
              type="text"
              placeholder={`Escribe tu mensaje a SofIA (ej. 'Busco apartamento en compra en Medellín o código INM-585')...`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem 1.25rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-full)',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!inputMessage.trim() || loading}
              icon={<Send size={16} />}
            >
              Enviar
            </Button>
          </form>
        </div>
      </div>

      {/* Human Agent Lead Intake Modal */}
      {showLeadForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(5, 8, 15, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={20} color="var(--secondary)" />
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Solicitar Asesoría Humana</h3>
              </div>
              <button
                onClick={() => setShowLeadForm(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Deja tus datos de contacto para que un asesor inmobiliario de <strong>{org?.name || 'Inmobiliaria Piloto'}</strong> te contacte directamente para coordinar visitas.
            </p>

            <form onSubmit={handleLeadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input
                label="Nombre Completo"
                placeholder="Tu nombre y apellido"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                required
              />
              <Input
                label="Teléfono / WhatsApp"
                placeholder="+57 300 000 0000"
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
                required
              />
              <Input
                label="Correo Electrónico"
                type="email"
                placeholder="tu@correo.com"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                required
              />

              {/* Habeas Data */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="leadConsent"
                  checked={leadConsent}
                  onChange={(e) => setLeadConsent(e.target.checked)}
                  style={{ marginTop: '0.2rem', cursor: 'pointer' }}
                />
                <label htmlFor="leadConsent" style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4, cursor: 'pointer' }}>
                  Autorizo el tratamiento de mis datos personales según la Ley 1581 de 2012 (Habeas Data) para ser contactado por {org?.name || 'la inmobiliaria'}.
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                <Button variant="outline" type="button" onClick={() => setShowLeadForm(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" loading={submittingLead}>
                  Enviar Solicitud
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AsistenteIAPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Cargando Asistente Virtual SofIA...</div>}>
      <AsistenteIAContent />
    </Suspense>
  );
}
