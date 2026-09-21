'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/core/auth/supabase-browser';
import { Building2, Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setCurrentUser(session.user);
        }
      });
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor introduce tu correo y contraseña.');
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setErrorMsg('La conexión con Supabase no está configurada en el cliente (revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY).');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMsg('Credenciales inválidas: Verifica tu correo y contraseña de Supabase Auth.');
        } else if (error.message.includes('Email not confirmed')) {
          setErrorMsg('Tu correo no ha sido confirmado en Supabase Auth.');
        } else {
          setErrorMsg(error.message || 'Error al iniciar sesión.');
        }
        return;
      }

      if (data.session) {
        setSuccessMsg('¡Autenticación exitosa! Conectando con tu inmobiliaria...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inesperado durante la autenticación.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setSuccessMsg('Sesión cerrada correctamente.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem 1rem',
        background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #090d16 60%, #030712 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, rgba(14, 165, 233, 0.05) 50%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 10 }}>
        {/* Back Link */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <ArrowLeft size={16} />
            <span>Volver al Inicio</span>
          </Link>
        </div>

        {/* Card */}
        <div
          className="glass-panel"
          style={{
            padding: '2.5rem 2rem',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 50px rgba(79, 70, 229, 0.15)',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                margin: '0 auto 1rem',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 25px rgba(79, 70, 229, 0.5)',
              }}
            >
              <Building2 size={28} color="#ffffff" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
              IA Inmobiliaria
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.35rem', margin: 0 }}>
              Acceso a la Organización Inmobiliaria Piloto
            </p>
          </div>

          {/* Active Session Badge */}
          {currentUser ? (
            <div
              style={{
                padding: '1.25rem',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                textAlign: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#34d399', marginBottom: '0.4rem' }}>
                <CheckCircle2 size={18} />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Sesión Activa</span>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '0 0 1rem' }}>
                Conectado como: <strong>{currentUser.email}</strong>
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <Button variant="primary" size="md" onClick={() => router.push('/dashboard')}>
                  Ir al Dashboard <ArrowRight size={16} />
                </Button>
                <Button variant="secondary" size="md" onClick={handleSignOut}>
                  Cerrar Sesión
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Error Alert */}
              {errorMsg && (
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem',
                    color: '#f87171',
                    fontSize: '0.85rem',
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Success Alert */}
              {successMsg && (
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    color: '#34d399',
                    fontSize: '0.85rem',
                  }}
                >
                  <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Email field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Correo Electrónico (Supabase Auth)
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="propietario@inmobiliariapiloto.com"
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.85rem 0.7rem 2.5rem',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.85rem 0.7rem 2.5rem',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                style={{ width: '100%', marginTop: '0.5rem' }}
                icon={loading ? undefined : <ArrowRight size={18} />}
              >
                {loading ? 'Validando Credenciales...' : 'Iniciar Sesión'}
              </Button>
            </form>
          )}

          {/* Security Guarantee */}
          <div
            style={{
              marginTop: '2rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: 'var(--text-muted)',
              fontSize: '0.76rem',
            }}
          >
            <ShieldCheck size={15} color="var(--accent-emerald)" />
            <span>Autenticación Segura vía Supabase Auth & JWT RLS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
