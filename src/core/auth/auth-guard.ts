import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../database/supabase-adapter';
import { DEFAULT_ORGANIZATION } from '../types/organization';

export interface AuthSession {
  userId: string;
  organizationId: string;
  role: 'admin' | 'agent' | 'viewer';
  isDemoUser?: boolean;
}

/**
 * Server-Side Authentication & Authorization Guard:
 * Validates request headers for Supabase Auth JWT or Admin authorization.
 * Rejects unauthorized anonymous access to private/administrative endpoints.
 */
export async function authenticateAdminRequest(req: NextRequest): Promise<AuthSession | null> {
  const authHeader = req.headers.get('authorization') || req.headers.get('x-admin-token');

  // 1. Check for API Secret / Admin Key in development or integration
  const adminSecret = process.env.ADMIN_API_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'ia-admin-secret-dev';
  if (authHeader && authHeader.replace(/^Bearer\s+/i, '') === adminSecret) {
    return {
      userId: 'system-admin',
      organizationId: DEFAULT_ORGANIZATION.id,
      role: 'admin',
    };
  }

  // 2. Validate with Supabase Auth if Supabase client exists
  const supabase = getSupabaseClient();
  if (supabase && authHeader) {
    try {
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        return {
          userId: user.id,
          organizationId: user.user_metadata?.organization_id || DEFAULT_ORGANIZATION.id,
          role: (user.user_metadata?.role as any) || 'admin',
        };
      }
    } catch (e) {
      console.error('[AuthGuard] Token validation error:', e);
    }
  }

  return null;
}

export function unauthorizedResponse(message = 'Acceso denegado: Esta operación administrativa requiere autenticación en el servidor.'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'UNAUTHORIZED',
    },
    { status: 401 }
  );
}
