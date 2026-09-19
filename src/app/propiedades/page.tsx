'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { PropertyPublicView, PropertyFilters } from '@/core/types/property';
import { propertyService } from '@/core/services/property.service';
import { PROPERTY_TYPES, COLOMBIAN_CITIES } from '@/core/config/constants';
import { Building2, Search, MapPin, Maximize2, Bed, Bath, ArrowRight, Sparkles, MessageSquare, PhoneCall, Filter, Home, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

function PublicCatalogContent() {
  const [properties, setProperties] = useState<PropertyPublicView[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PropertyFilters>({
    search: '',
    operation: 'todos',
    type: 'todos',
    municipality: 'todos',
    sortBy: 'date_desc',
  });

  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);
      const data = await propertyService.getPublicCatalog(filters);
      setProperties(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      {/* Public Navbar */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(9, 13, 22, 0.95)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '1rem 2rem',
        }}
      >
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Building2 size={22} />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', display: 'block', letterSpacing: '-0.02em' }}>
                Inmobiliaria Premier
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Catálogo Exclusivo Colombia</span>
            </div>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link href="/propiedades" style={{ fontSize: '0.9rem', color: 'var(--secondary)', fontWeight: 600 }}>
              Propiedades
            </Link>
            <Link
              href="/asistente"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.9rem',
                color: '#fff',
                backgroundColor: 'rgba(79, 70, 229, 0.25)',
                border: '1px solid rgba(79, 70, 229, 0.4)',
                padding: '0.45rem 0.9rem',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Sparkles size={14} color="#38bdf8" />
              <span>Asistente IA</span>
            </Link>
            <Link href="/" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Acceso CRM
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          padding: '3.5rem 2rem 2.5rem',
          background: 'radial-gradient(circle at 50% 10%, rgba(79, 70, 229, 0.15) 0%, transparent 60%)',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '0.3rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: '1rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Inmuebles Verificados en Colombia
          </span>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            Encuentra tu Inmueble Ideal con Asesoría Experta
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', marginTop: '0.75rem', lineHeight: 1.6 }}>
            Explora apartamentos, casas, penthouses y oficinas de alta calidad con disponibilidad inmediata y precios transparentes.
          </p>

          {/* Quick interactive search box */}
          <div
            style={{
              marginTop: '2rem',
              padding: '1.25rem',
              backgroundColor: 'var(--bg-card-glass)',
              backdropFilter: 'blur(16px)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-card)',
              boxShadow: 'var(--shadow-lg)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
              alignItems: 'center',
            }}
          >
            {/* Operation */}
            <select
              value={filters.operation || 'todos'}
              onChange={(e) => setFilters((prev) => ({ ...prev, operation: e.target.value as any }))}
              style={{
                padding: '0.65rem 1rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            >
              <option value="todos">Venta y Arriendo</option>
              <option value="compra">En Venta / Compra</option>
              <option value="arriendo">En Arrendamiento</option>
            </select>

            {/* Type */}
            <select
              value={filters.type || 'todos'}
              onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value as any }))}
              style={{
                padding: '0.65rem 1rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            >
              <option value="todos">Todos los Tipos</option>
              {PROPERTY_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>{pt.label}</option>
              ))}
            </select>

            {/* City */}
            <select
              value={filters.municipality || 'todos'}
              onChange={(e) => setFilters((prev) => ({ ...prev, municipality: e.target.value }))}
              style={{
                padding: '0.65rem 1rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            >
              <option value="todos">Todas las Ciudades</option>
              {COLOMBIAN_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Text Search */}
            <input
              type="text"
              placeholder="Buscar por barrio o zona..."
              value={filters.search || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              style={{
                padding: '0.65rem 1rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </section>

      {/* Catalog Grid Section */}
      <section style={{ maxWidth: '1440px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', margin: 0 }}>
              Propiedades Disponibles ({properties.length})
            </h2>
            <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Actualizado en tiempo real desde el inventario de la inmobiliaria
            </span>
          </div>

          <Link
            href="/asistente"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: 'var(--secondary)',
              fontSize: '0.88rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Sparkles size={16} />
            <span>¿Buscas algo específico? Pregúntale a SofIA</span>
          </Link>
        </div>

        {properties.length === 0 ? (
          <div
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-card-glass)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-card)',
            }}
          >
            <Home size={38} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.15rem' }}>No encontramos inmuebles con estos criterios</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '500px', margin: '0.35rem auto 1.5rem' }}>
              Puedes ajustar los filtros o consultar directamente con nuestra asistente virtual para buscar opciones fuera de catálogo.
            </p>
            <Link
              href="/asistente"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--primary)',
                color: '#fff',
                padding: '0.65rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}
            >
              <Sparkles size={16} />
              <span>Consultar con el Asistente IA</span>
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {properties.map((prop) => {
              const formattedPrice = new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                maximumFractionDigits: 0,
              }).format(prop.priceCOP);

              return (
                <div
                  key={prop.id}
                  className="glass-panel"
                  style={{
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.4)';
                    e.currentTarget.style.boxShadow = '0 12px 25px rgba(0,0,0,0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--border-card)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                >
                  {/* Property Image & Badges */}
                  <div style={{ position: 'relative', height: '220px', backgroundColor: '#0f172a' }}>
                    {prop.images && prop.images.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={prop.images[0]}
                        alt={prop.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                        Sin imagen
                      </div>
                    )}
                    <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', display: 'flex', gap: '0.4rem' }}>
                      <span
                        style={{
                          backgroundColor: prop.operation === 'compra' ? '#10b981' : '#6366f1',
                          color: '#fff',
                          padding: '0.2rem 0.55rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {prop.operation === 'compra' ? 'Venta' : 'Arriendo'}
                      </span>
                      <span
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.75)',
                          backdropFilter: 'blur(6px)',
                          color: '#fff',
                          padding: '0.2rem 0.55rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}
                      >
                        {prop.type}
                      </span>
                    </div>

                    <div
                      style={{
                        position: 'absolute',
                        bottom: '0.75rem',
                        right: '0.75rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        color: 'var(--text-muted)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                      }}
                    >
                      Ref: {prop.code}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        <MapPin size={13} color="var(--secondary)" />
                        <span>{prop.municipality} • {prop.zone}</span>
                      </div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>
                        {prop.title}
                      </h3>
                    </div>

                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {prop.description}
                    </p>

                    {/* Specs Bar */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '0.35rem',
                        padding: '0.65rem 0.5rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        textAlign: 'center',
                        fontSize: '0.76rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <div>
                        <strong style={{ display: 'block', color: '#fff' }}>{prop.areaM2}</strong>
                        <span>m²</span>
                      </div>
                      <div>
                        <strong style={{ display: 'block', color: '#fff' }}>{prop.bedrooms}</strong>
                        <span>Alcobas</span>
                      </div>
                      <div>
                        <strong style={{ display: 'block', color: '#fff' }}>{prop.bathrooms}</strong>
                        <span>Baños</span>
                      </div>
                      <div>
                        <strong style={{ display: 'block', color: '#fff' }}>{prop.parkingSpots}</strong>
                        <span>Parq.</span>
                      </div>
                    </div>

                    {/* Footer: Price & CTA */}
                    <div
                      style={{
                        marginTop: 'auto',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                          {prop.operation === 'compra' ? 'Precio de Venta' : 'Canon Mensual'}
                        </span>
                        <strong style={{ fontSize: '1.15rem', color: 'var(--accent-emerald)', fontWeight: 800 }}>
                          {formattedPrice}
                        </strong>
                      </div>

                      <Link
                        href={`/propiedades/${prop.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          backgroundColor: 'var(--primary)',
                          color: '#fff',
                          padding: '0.45rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        <span>Ver Ficha</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function PublicCatalogPage() {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', color: '#fff', textAlign: 'center' }}>Cargando catálogo...</div>}>
      <PublicCatalogContent />
    </Suspense>
  );
}
