'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, RotateCcw, Sparkles, LogIn, LogOut, User, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { getSupabaseBrowserClient } from '@/core/auth/supabase-browser';

interface HeaderProps {
  onNewLeadClick: () => void;
  onResetDataClick?: () => void;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onNewLeadClick,
  onResetDataClick,
  searchTerm,
  onSearchChange,
  title,
}) => {
  const router = useRouter();
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

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
      setCurrentUser(null);
      router.push('/login');
    }
  };

  return (
    <header
      style={{
        height: '70px',
        backgroundColor: 'rgba(9, 13, 22, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 90,
      }}
    >
      {/* Title / Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              {title || 'Panel Comercial Inmobiliario'}
            </h1>
            {currentUser ? (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#34d399',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-full)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <CheckCircle2 size={11} />
                Inmobiliaria Piloto (Owner)
              </span>
            ) : (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#38bdf8',
                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-full)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <Sparkles size={11} />
                Demostración Guiada
              </span>
            )}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {currentUser
              ? `Sesión activa: ${currentUser.email}`
              : 'Inmobiliaria Premier (Entorno Demo) — Datos aislados de muestra'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {onSearchChange && (
          <div
            style={{
              position: 'relative',
              width: '240px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Buscar prospecto, zona..."
              value={searchTerm || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text-primary)',
                fontSize: '0.84rem',
                outline: 'none',
              }}
            />
          </div>
        )}

        {onResetDataClick && !currentUser && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetDataClick}
            title="Restablecer datos iniciales de prueba"
            style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}
          >
            <RotateCcw size={15} />
            <span>Reiniciar Demo</span>
          </Button>
        )}

        <Button
          variant="primary"
          size="md"
          onClick={onNewLeadClick}
          icon={<Plus size={16} />}
        >
          Nuevo Prospecto
        </Button>

        {/* Auth / Profile Link */}
        {currentUser ? (
          <button
            onClick={handleSignOut}
            title={`Cerrar sesión (${currentUser.email})`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.75rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#f87171',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
            }}
          >
            <LogOut size={14} />
            <span>Salir</span>
          </button>
        ) : (
          <Link
            href="/login"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.75rem',
              backgroundColor: 'rgba(79, 70, 229, 0.15)',
              border: '1px solid rgba(79, 70, 229, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#818cf8',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(79, 70, 229, 0.25)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(79, 70, 229, 0.15)';
              e.currentTarget.style.color = '#818cf8';
            }}
          >
            <LogIn size={14} />
            <span>Iniciar Sesión</span>
          </Link>
        )}
      </div>
    </header>
  );
};
