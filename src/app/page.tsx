'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Sparkles,
  Bot,
  Users,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Calendar,
  MessageSquare,
  DollarSign,
  Layers,
  Lock,
  PhoneCall,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { leadService } from '@/core/services/lead.service';

export default function MarketingLandingPage() {
  const { showToast } = useToast();

  // Commercial Demo Request Form
  const [agencyName, setAgencyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [city, setCity] = useState('Medellín');
  const [inventorySize, setInventorySize] = useState('10-50 inmuebles');
  const [consent, setConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyName.trim() || !contactName.trim() || !contactPhone.trim() || !contactEmail.trim()) {
      showToast('Por favor diligencie todos los campos requeridos.', 'error');
      return;
    }
    if (!consent) {
      showToast('Debe autorizar el tratamiento de datos personales.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await leadService.createLead({
        name: `${contactName.trim()} (${agencyName.trim()})`,
        phone: contactPhone.trim(),
        email: contactEmail.trim(),
        operationType: 'compra',
        propertyType: 'oficina',
        municipality: city,
        zone: city,
        budget: 450000, // Monthly SaaS subscription estimate
        notes: `Solicitud de DEMO COMERCIAL SaaS IA Inmobiliaria. Inmobiliaria: ${agencyName}. Tamaño inventario: ${inventorySize}. Ciudad: ${city}`,
        status: 'nuevo',
        priority: 'alto',
        source: 'landing_demo',
        consentHabeasData: true,
        allowDuplicate: true,
      });

      setSubmitted(true);
      showToast('¡Solicitud de presentación recibida! Te contactaremos en breve.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al enviar solicitud', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      {/* Top Navigation */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(9, 13, 22, 0.9)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '1.1rem 2rem',
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 0 15px rgba(79, 70, 229, 0.4)',
              }}
            >
              <Building2 size={22} />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fff', letterSpacing: '-0.02em', display: 'block' }}>
                IA Inmobiliaria
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SaaS Comercial para Inmobiliarias</span>
            </div>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Link href="#funcionalidades" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>
              Funcionalidades
            </Link>
            <Link href="/propiedades" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>
              Catálogo Público
            </Link>
            <Link
              href="/asistente"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.88rem',
                color: '#38bdf8',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Sparkles size={15} />
              <span>Demo Asistente IA</span>
            </Link>
            <Link href="#planes" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>
              Planes
            </Link>
            <Link
              href="/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: 'var(--primary)',
                color: '#fff',
                padding: '0.5rem 1.1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)',
              }}
            >
              <span>Acceder al Panel CRM</span>
              <ArrowRight size={15} />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          padding: '5rem 2rem 4rem',
          background: 'radial-gradient(circle at 50% 0%, rgba(79, 70, 229, 0.22) 0%, transparent 60%)',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontSize: '0.84rem',
              fontWeight: 700,
              marginBottom: '1.5rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={14} />
            <span>Plataforma SaaS con Asistente Web IA para Inmobiliarias en Colombia</span>
          </div>

          <h1
            style={{
              fontSize: '3.2rem',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1.15,
              color: '#ffffff',
            }}
          >
            Capta, Califica y Convierte Prospectos Inmobiliarios con Inteligencia Artificial
          </h1>

          <p
            style={{
              fontSize: '1.2rem',
              color: 'var(--text-secondary)',
              marginTop: '1.25rem',
              lineHeight: 1.6,
              maxWidth: '820px',
              margin: '1.25rem auto 2.5rem',
            }}
          >
            Centraliza tu inventario de propiedades, atiende a compradores y arrendatarios 24/7 con un asistente conversacional conectado a tu base de datos y acelera el cierre comercial de tu equipo.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <Link
              href="/asistente"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--primary)',
                color: '#fff',
                padding: '0.85rem 1.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '1rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 18px rgba(79, 70, 229, 0.45)',
              }}
            >
              <Sparkles size={18} />
              <span>Probar Asistente Web con IA</span>
            </Link>

            <Link
              href="/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-card)',
                color: '#fff',
                padding: '0.85rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '1rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Building2 size={18} />
              <span>Ver Panel de Control CRM</span>
            </Link>

            <Link
              href="#solicitar-demo"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#34d399',
                padding: '0.85rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '1rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Calendar size={18} />
              <span>Solicitar Demostración</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Core Modules Grid */}
      <section id="funcionalidades" style={{ maxWidth: '1360px', margin: '0 auto', padding: '4rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Arquitectura Completa para tu Inmobiliaria
          </span>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.4rem' }}>
            Todo lo que tu Agencia Necesita para Escalar
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
          {/* Card 1: Asistente IA */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(79, 70, 229, 0.2)', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Asistente Web IA 24/7</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Atiende solicitudes en lenguaje natural, consulta tu inventario en tiempo real, recomienda hasta 3 propiedades verificadas y captura prospectos con autorización de Habeas Data (Ley 1581).
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              <li>✓ Filtro estricto contra base de datos (sin inventar propiedades)</li>
              <li>✓ Modo GPT-4o con OpenAI y modo de reglas para contingencias</li>
              <li>✓ Captura automática en el CRM</li>
            </ul>
          </div>

          {/* Card 2: CRM & Kanban */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', margin: 0 }}>CRM & Pipeline Comercial</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Administra prospectos con vista dual (Tabla interactiva y Tablero Kanban), historial cronológico de notas, scoring automático (Alto, Medio, Bajo) y contacto directo a WhatsApp con 1 clic.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              <li>✓ Prevención de prospectos duplicados por teléfono y email</li>
              <li>✓ Seguimiento de visitas agendadas y estados comerciales</li>
              <li>✓ Enlaces con plantillas pre-redactadas de WhatsApp</li>
            </ul>
          </div>

          {/* Card 3: Inventario */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Gestión de Inventario</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Control privado de inmuebles, valores en COP, comisiones y direcciones confidenciales para tu equipo, con sincronización automática al catálogo público web.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              <li>✓ Separación estricta entre datos públicos y privados CRM</li>
              <li>✓ Códigos internos de referencia (ej. APT-101)</li>
              <li>✓ Estados: Disponible, Reservado, Vendido, Arrendado</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Multi-Tenant Security & Supabase Architecture Notice */}
      <section style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', padding: '3.5rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2.5rem', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              <ShieldCheck size={16} />
              <span>Arquitectura Segura y Multi-Inmobiliaria</span>
            </div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0.35rem 0 1rem', lineHeight: 1.25 }}>
              Aislamiento de Información por Inmobiliaria con PostgreSQL Row Level Security (RLS)
            </h2>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Cada agencia cuenta con su propio espacio aislado (`organization_id`). Las políticas RLS de Supabase garantizan que ningún usuario ni asistente público pueda acceder a datos confidenciales de otra agencia ni a las direcciones privadas de propietarios.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.86rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8' }}>
              <Lock size={16} />
              <strong>Esquema de Seguridad Implementado:</strong>
            </div>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              • Tabla <code>organizations</code> con llaves foráneas estrictas.<br />
              • Vistas públicas sanitizadas para el Asistente IA.<br />
              • Soporte nativo para Supabase PostgreSQL y variables de entorno.<br />
              • Scripts SQL listos para despliegue productivo.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing / Commercial Plans */}
      <section id="planes" style={{ maxWidth: '1200px', margin: '0 auto', padding: '4.5rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase' }}>
            Planes Comerciales
          </span>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.4rem' }}>
            Escala tu Agencia con Tarifas Claras
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Plan 1 */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Plan Inicial</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Para agencias boutique</p>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
              $290.000 <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>COP / mes</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              <li>✓ Hasta 40 inmuebles en inventario</li>
              <li>✓ Asistente Web IA con captura de leads</li>
              <li>✓ CRM de prospectos con Kanban</li>
              <li>✓ 2 Asesores comerciales</li>
            </ul>
            <Link href="#solicitar-demo" style={{ marginTop: 'auto', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none' }}>
              Solicitar Plan
            </Link>
          </div>

          {/* Plan 2: Destacado */}
          <div
            className="glass-panel"
            style={{
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              border: '2px solid var(--primary-light)',
              background: 'linear-gradient(135deg, rgba(19, 27, 46, 0.95) 0%, rgba(79, 70, 229, 0.15) 100%)',
              position: 'relative',
            }}
          >
            <div style={{ position: 'absolute', top: '-12px', right: '1.5rem', backgroundColor: 'var(--primary)', color: '#fff', padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
              Recomendado
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Plan Inmobiliaria Pro</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Para agencias en crecimiento</p>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
              $590.000 <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>COP / mes</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              <li>✓ Inmuebles ilimitados</li>
              <li>✓ Asistente Web IA con GPT-4o y lead scoring</li>
              <li>✓ Agenda de visitas y bitácora completa</li>
              <li>✓ Hasta 8 Asesores comerciales</li>
              <li>✓ Integración WhatsApp Business (preparada)</li>
            </ul>
            <Link href="#solicitar-demo" style={{ marginTop: 'auto', textAlign: 'center', backgroundColor: 'var(--primary)', color: '#fff', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)' }}>
              Solicitar Demostración Pro
            </Link>
          </div>

          {/* Plan 3 */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Plan Corporativo</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Grandes redes y franquicias</p>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
              Personalizado
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              <li>✓ Múltiples sucursales y ciudades</li>
              <li>✓ Base de datos Supabase dedicada</li>
              <li>✓ Asistentes de IA personalizados por zona</li>
              <li>✓ Soporte técnico prioritario y SLA</li>
            </ul>
            <Link href="#solicitar-demo" style={{ marginTop: 'auto', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none' }}>
              Contactar Ventas
            </Link>
          </div>
        </div>
      </section>

      {/* Demo Request Form Section */}
      <section id="solicitar-demo" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 2rem 5rem' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(79, 70, 229, 0.35)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase' }}>
              Comienza en 10 días
            </span>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.35rem' }}>
              Agenda una Demostración Comercial Personalizada
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
              Conoce cómo IA Inmobiliaria se integra a tu inventario y potencia las ventas de tu equipo.
            </p>
          </div>

          {submitted ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <CheckCircle2 size={48} color="var(--accent-emerald)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.35rem', color: '#fff', fontWeight: 800 }}>¡Solicitud de Demostración Recibida!</h3>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.6, maxWidth: '600px', margin: '0.5rem auto 1.5rem' }}>
                Hemos registrado tu solicitud comercial para <strong>{agencyName}</strong>. Puedes conectar de inmediato con nuestro especialista de producto o esperar nuestro contacto por WhatsApp/correo.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <a
                  href={`https://wa.me/573001234567?text=${encodeURIComponent(`Hola, soy ${contactName} de la inmobiliaria ${agencyName} en ${city}. Deseo agendar una demostración comercial de IA Inmobiliaria para nuestro inventario de ${inventorySize}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: '#25D366',
                    color: '#fff',
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(37, 211, 102, 0.4)',
                  }}
                >
                  <MessageSquare size={18} />
                  <span>Chatear por WhatsApp Ahora</span>
                </a>
                <Button variant="outline" size="md" onClick={() => setSubmitted(false)}>
                  Enviar otra solicitud
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleDemoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input
                  label="Nombre de la Inmobiliaria"
                  placeholder="Ej. Inmobiliaria Santa Fe"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  required
                />
                <Input
                  label="Nombre del Responsable / Asesor"
                  placeholder="Ej. Juan Carlos Restrepo"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input
                  label="Teléfono Celular / WhatsApp"
                  placeholder="+57 300 123 4567"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                />
                <Input
                  label="Correo Electrónico Corporativo"
                  type="email"
                  placeholder="contacto@inmobiliaria.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Ciudad Principal</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{ padding: '0.65rem 1rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                  >
                    <option value="Medellín">Medellín / Valle de Aburrá</option>
                    <option value="Bogotá">Bogotá D.C.</option>
                    <option value="Cali">Cali</option>
                    <option value="Barranquilla">Barranquilla</option>
                    <option value="Cartagena">Cartagena</option>
                    <option value="Bucaramanga">Bucaramanga</option>
                    <option value="Eje Cafetero">Eje Cafetero</option>
                    <option value="Otra">Otra ciudad</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tamaño del Inventario</label>
                  <select
                    value={inventorySize}
                    onChange={(e) => setInventorySize(e.target.value)}
                    style={{ padding: '0.65rem 1rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                  >
                    <option value="1-10 inmuebles">1 - 10 inmuebles</option>
                    <option value="10-50 inmuebles">10 - 50 inmuebles</option>
                    <option value="50-200 inmuebles">50 - 200 inmuebles</option>
                    <option value="Mas de 200 inmuebles">Más de 200 inmuebles</option>
                  </select>
                </div>
              </div>

              {/* Habeas Data Consent */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="consentMarketing"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  style={{ marginTop: '0.2rem', cursor: 'pointer' }}
                />
                <label htmlFor="consentMarketing" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, cursor: 'pointer' }}>
                  Autorizo a IA Inmobiliaria para el tratamiento de mis datos de contacto conforme a la Ley 1581 de 2012 para agendamiento de demostraciones y propuestas comerciales.
                </label>
              </div>

              <Button
                variant="primary"
                type="submit"
                loading={submitting}
                style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: '0.5rem' }}
              >
                Solicitar Demostración Comercial
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', backgroundColor: '#070b13', padding: '2.5rem 2rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={16} color="var(--primary-light)" />
            <strong style={{ color: '#fff' }}>IA Inmobiliaria Colombia</strong> — SaaS de Calificación y Gestión
          </div>

          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <Link href="/propiedades" style={{ color: 'var(--text-secondary)' }}>Propiedades</Link>
            <Link href="/asistente" style={{ color: 'var(--text-secondary)' }}>Asistente IA</Link>
            <Link href="/dashboard" style={{ color: 'var(--text-secondary)' }}>Panel CRM</Link>
          </div>

          <div>
            Cumplimiento Ley 1581 de 2012 (Habeas Data) • © 2026 Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
