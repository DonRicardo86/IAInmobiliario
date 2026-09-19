'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PropertyPublicView } from '@/core/types/property';
import { propertyService } from '@/core/services/property.service';
import { leadService } from '@/core/services/lead.service';
import { useToast } from '@/components/ui/Toast';
import {
  Building2,
  MapPin,
  Maximize2,
  Bed,
  Bath,
  Car,
  Calendar,
  DollarSign,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { whatsappService } from '@/integrations/whatsapp/whatsapp.service';

export default function PublicPropertyDetailPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const { showToast } = useToast();

  const [property, setProperty] = useState<PropertyPublicView | null>(null);
  const [loading, setLoading] = useState(true);

  // Lead capture form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [habeasData, setHabeasData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const all = await propertyService.getPublicCatalog();
        const found = all.find((p) => p.id === propertyId);
        setProperty(found || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (propertyId) load();
  }, [propertyId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)', color: '#fff' }}>
        Cargando detalles del inmueble...
      </div>
    );
  }

  if (!property) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)', color: '#fff', gap: '1rem' }}>
        <h2>Inmueble no encontrado o no disponible públicamente</h2>
        <Link href="/propiedades" style={{ color: 'var(--secondary)' }}>
          ← Volver al catálogo de propiedades
        </Link>
      </div>
    );
  }

  const formattedPrice = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(property.priceCOP);

  const formattedAdmin = property.adminFeeCOP
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(property.adminFeeCOP)
    : 'Incluida en el valor';

  const waMsg = `Hola, estoy interesado en el inmueble Ref ${property.code}: ${property.title} en ${property.zone}. ¿Cuándo podemos agendar una visita?`;
  const waLink = whatsappService.getWhatsAppDirectLink('+573009123456', waMsg);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim()) {
      showToast('Por favor complete su nombre, teléfono y correo.', 'error');
      return;
    }
    if (!habeasData) {
      showToast('Debe autorizar el tratamiento de datos para continuar.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await leadService.createLead({
        name,
        phone,
        email,
        operationType: property.operation,
        propertyType: property.type,
        municipality: property.municipality,
        zone: property.zone,
        budget: property.priceCOP,
        interestedPropertyIds: [property.id],
        notes: `Solicitud de visita para ${property.code} (${property.title}). Fecha preferida: ${preferredDate || 'Por coordinar'}. Notas: ${notes}`,
        status: preferredDate ? 'visita_agendada' : 'interesado',
        priority: 'alto',
        source: 'web_form',
        consentHabeasData: true,
        allowDuplicate: true,
      });

      setSubmitted(true);
      showToast('¡Solicitud enviada con éxito! Un asesor se comunicará contigo.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Error al enviar solicitud', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      {/* Top Navbar */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(9, 13, 22, 0.95)',
          padding: '1rem 2rem',
          position: 'sticky',
          top: 0,
          zIndex: 90,
        }}
      >
        <div style={{ maxWidth: '1360px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/propiedades" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
            <ArrowLeft size={16} />
            <span>Volver a Catálogo</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#25D366',
                color: '#fff',
                padding: '0.45rem 0.9rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.84rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <MessageSquare size={16} />
              <span>WhatsApp Directo</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1360px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '2rem', alignItems: 'start' }}>
          {/* Left Column: Photos, Info, Specs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {/* Gallery */}
            <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', height: '420px', backgroundColor: '#0f172a', position: 'relative' }}>
              {property.images && property.images.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={property.images[0]} alt={property.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  Sin fotografía disponible
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  top: '1rem',
                  left: '1rem',
                  display: 'flex',
                  gap: '0.5rem',
                }}
              >
                <span
                  style={{
                    backgroundColor: property.operation === 'compra' ? '#10b981' : '#6366f1',
                    color: '#fff',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {property.operation === 'compra' ? 'Venta' : 'Arriendo'}
                </span>
                <span
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(6px)',
                    color: '#fff',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                >
                  {property.type}
                </span>
              </div>
            </div>

            {/* Title & Location */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--secondary)', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                <MapPin size={15} />
                <span>{property.municipality} • {property.zone}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>Ref: {property.code}</span>
              </div>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, lineHeight: 1.3 }}>
                {property.title}
              </h1>
            </div>

            {/* Main Specs Grid */}
            <div
              className="glass-panel"
              style={{
                padding: '1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1rem',
                textAlign: 'center',
              }}
            >
              <div>
                <Maximize2 size={20} color="var(--primary-light)" style={{ margin: '0 auto 0.25rem' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Área Total</span>
                <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{property.areaM2} m²</strong>
              </div>
              <div>
                <Bed size={20} color="var(--primary-light)" style={{ margin: '0 auto 0.25rem' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Habitaciones</span>
                <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{property.bedrooms}</strong>
              </div>
              <div>
                <Bath size={20} color="var(--primary-light)" style={{ margin: '0 auto 0.25rem' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Baños</span>
                <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{property.bathrooms}</strong>
              </div>
              <div>
                <Car size={20} color="var(--primary-light)" style={{ margin: '0 auto 0.25rem' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Parqueaderos</span>
                <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{property.parkingSpots}</strong>
              </div>
            </div>

            {/* Description */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Descripción del Inmueble</h3>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>
                {property.description}
              </p>
            </div>

            {/* Features */}
            {property.features && property.features.length > 0 && (
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Amenidades y Comodidades</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  {property.features.map((feat) => (
                    <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={16} color="var(--accent-emerald)" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Pricing & Contact Booking Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '90px' }}>
            {/* Price Box */}
            <div
              className="glass-panel"
              style={{
                padding: '1.75rem',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                background: 'linear-gradient(135deg, rgba(19, 27, 46, 0.95) 0%, rgba(16, 185, 129, 0.06) 100%)',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {property.operation === 'compra' ? 'Precio de Venta' : 'Canon Mensual'}
              </span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.2rem', letterSpacing: '-0.02em' }}>
                {formattedPrice}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.4rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem' }}>
                Administración: <strong style={{ color: '#fff' }}>{formattedAdmin}</strong>
              </div>
            </div>

            {/* Visit Booking Form */}
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Calendar size={18} color="var(--secondary)" />
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Agendar Visita o Asesoría</h3>
              </div>

              {submitted ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                  <CheckCircle2 size={44} color="var(--accent-emerald)" style={{ margin: '0 auto 0.75rem' }} />
                  <h4 style={{ fontSize: '1.1rem', color: '#fff' }}>¡Solicitud Registrada!</h4>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '0.4rem', lineHeight: 1.5 }}>
                    Hemos asignado tu requerimiento a nuestro equipo comercial para coordinar tu visita a {property.code}.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setSubmitted(false)} style={{ marginTop: '1rem' }}>
                    Enviar otra solicitud
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Input
                    label="Nombre Completo"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <Input
                    label="Teléfono / WhatsApp"
                    placeholder="+57 300 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  <Input
                    label="Correo Electrónico"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    label="Fecha y Hora Preferida (Opcional)"
                    type="datetime-local"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                  />

                  {/* Habeas Data Checkbox */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <input
                      type="checkbox"
                      id="habeasData"
                      checked={habeasData}
                      onChange={(e) => setHabeasData(e.target.checked)}
                      style={{ marginTop: '0.2rem', cursor: 'pointer' }}
                    />
                    <label htmlFor="habeasData" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, cursor: 'pointer' }}>
                      Autorizo el tratamiento de mis datos personales según la Ley 1581 de 2012 para recibir información inmobiliaria y agendamiento de visitas.
                    </label>
                  </div>

                  <Button variant="primary" type="submit" loading={submitting} style={{ width: '100%', marginTop: '0.5rem' }}>
                    Solicitar Visita al Inmueble
                  </Button>

                  <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>O contáctanos directamente:</span>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        color: '#25D366',
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        marginTop: '0.35rem',
                        textDecoration: 'none',
                      }}
                    >
                      <MessageSquare size={15} />
                      <span>Escribir por WhatsApp</span>
                    </a>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
