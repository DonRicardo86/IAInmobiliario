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
  
  if (authHeader) {
    const cleanToken = authHeader.replace(/^Bearer\s+/i, '').trim();

    // Check if matching admin secret or scoped admin token (e.g. "ia-admin-secret-dev:org_cardona_real_002")
    if (cleanToken.startsWith(adminSecret)) {
      const parts = cleanToken.split(':');
      const scopedOrg = parts.length > 1 ? parts[1] : DEFAULT_ORGANIZATION.id;
      return {
        userId: 'system-admin',
        organizationId: scopedOrg,
        role: 'admin',
      };
    }
  }

  // 2. Validate with Supabase Auth if Supabase client exists
  const supabase = getSupabaseClient();
  if (supabase && authHeader) {
    try {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        return {
          userId: user.id,
          organizationId: user.app_metadata?.organization_id || user.user_metadata?.organization_id || DEFAULT_ORGANIZATION.id,
          role: (user.app_metadata?.role || user.user_metadata?.role || 'admin') as any,
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
