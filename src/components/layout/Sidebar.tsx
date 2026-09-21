'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  Sparkles,
  MessageSquare,
  BarChart3,
  Settings,
  PlusCircle,
  TrendingUp,
  Globe,
  ExternalLink,
  Bot,
  LogIn,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/core/auth/supabase-browser';

interface SidebarProps {
  onNewLeadClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNewLeadClick }) => {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setCurrentUser(session.user);
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setCurrentUser(session?.user || null);
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, []);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Prospectos (CRM)', href: '/leads', icon: Users, badge: 'Activo' },
    { label: 'Pipeline / Embudo', href: '/leads?view=kanban', icon: TrendingUp },
    { label: 'Inventario Inmuebles', href: '/properties', icon: Building2 },
  ];

  const publicLinks = [
    { label: 'Asistente Web con IA', href: '/asistente', icon: Bot, isExternal: true },
    { label: 'Catálogo de Inmuebles', href: '/propiedades', icon: Globe, isExternal: true },
  ];

  const comingSoonItems = [
    { label: 'WhatsApp Bot API', href: '#', icon: MessageSquare, tag: 'Fase 2' },
    { label: 'Reportes Avanzados', href: '#', icon: BarChart3, tag: 'Fase 2' },
  ];

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Brand Logo Header */}
      <div
        style={{
          padding: '1.5rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(79, 70, 229, 0.4)',
          }}
        >
          <Building2 size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
              IA Inmobiliaria
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Panel Comercial v1.2
          </span>
        </div>
      </div>

      {/* Quick Action Button */}
      <div style={{ padding: '1rem 1.25rem 0.5rem' }}>
        <button
          onClick={onNewLeadClick}
          style={{
            width: '100%',
            padding: '0.65rem 1rem',
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--primary-light)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--primary)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <PlusCircle size={18} />
          <span>Nuevo Prospecto</span>
        </button>
      </div>

      {/* Navigation List */}
      <div
        style={{
          flex: 1,
          padding: '0.75rem 0.75rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Main Admin Nav */}
        <div>
          <span
            style={{
              display: 'block',
              padding: '0 0.6rem 0.5rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
            }}
          >
            Gestión CRM
          </span>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href.includes('kanban') && pathname === '/leads');
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'rgba(79, 70, 229, 0.18)' : 'transparent',
                    border: isActive ? '1px solid rgba(79, 70, 229, 0.3)' : '1px solid transparent',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.88rem',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <Icon size={18} color={isActive ? 'var(--secondary)' : 'currentColor'} />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Public & Customer Facing Views */}
        <div>
          <span
            style={{
              display: 'block',
              padding: '0 0.6rem 0.5rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
            }}
          >
            Vistas Públicas (Clientes)
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {publicLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.84rem',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = '#38bdf8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </div>
                  <ExternalLink size={13} color="var(--text-muted)" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Future Integrations / Stubs */}
        <div>
          <span
            style={{
              display: 'block',
              padding: '0 0.6rem 0.5rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
            }}
          >
            Módulos Preparados
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {comingSoonItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-disabled)',
                    fontSize: '0.82rem',
                    opacity: 0.75,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      padding: '0.15rem 0.4rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    {item.tag}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* User / Agency Footer */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: 'rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: currentUser ? '#10b981' : 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.85rem',
            color: '#ffffff',
          }}
        >
          {currentUser ? 'IP' : 'DEMO'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser ? 'Inmobiliaria Piloto' : 'Inmobiliaria Premier'}
          </p>
          <p style={{ fontSize: '0.72rem', color: currentUser ? 'var(--accent-emerald)' : 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser ? `● ${currentUser.email}` : '● Modo Demo / Local'}
          </p>
        </div>
      </div>
    </aside>
  );
};
