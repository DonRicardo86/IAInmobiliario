import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../database/supabase-adapter';
import { DEFAULT_ORGANIZATION } from '../types/organization';

export type UserRole = 'owner' | 'admin' | 'agent' | 'viewer';

export interface AuthSession {
  userId: string;
  organizationId: string;
  role: UserRole;
  isDemoUser?: boolean;
}

// In-memory fallback sliding-window rate limiter
const inMemoryRateLimitMap = new Map<string, { count: number; expiresAt: number }>();

/**
 * Serverless-resilient rate limiter:
 * Uses Supabase PostgreSQL RPC `check_distributed_rate_limit` when available,
 * with graceful in-memory fallback.
 */
export async function checkRateLimit(
  identifier: string,
  endpoint = 'api/leads',
  maxRequests = 15,
  windowSeconds = 60
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('check_distributed_rate_limit', {
        p_client_key: identifier,
        p_endpoint: endpoint,
        p_max_requests: maxRequests,
        p_window_seconds: windowSeconds,
      });
      if (!error && typeof data === 'boolean') {
        return data;
      }
    } catch (e) {
      // Fallback to local memory on connection issue
    }
  }

  // Local fallback
  const now = Date.now();
  const key = `${identifier}:${endpoint}`;
  const record = inMemoryRateLimitMap.get(key);

  if (!record || now > record.expiresAt) {
    inMemoryRateLimitMap.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count += 1;
  return true;
}

/**
 * Server-Side Authentication & Authorization Guard:
 * Validates request headers for Supabase Auth JWT or Admin authorization.
 * Resolves user roles and organizations securely from organization_members or verified app_metadata.
 */
export async function authenticateAdminRequest(req: NextRequest): Promise<AuthSession | null> {
  const authHeader = req.headers.get('authorization') || req.headers.get('x-admin-token');

  // 1. Check for API Secret / Service Key in server integrations
  const adminSecret = process.env.ADMIN_API_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'ia-admin-secret-dev';

  if (authHeader) {
    const cleanToken = authHeader.replace(/^Bearer\s+/i, '').trim();

    // Check if matching admin secret or scoped admin token (e.g. "ia-admin-secret-dev:org_cardona_real_002:admin")
    if (cleanToken.startsWith(adminSecret)) {
      const parts = cleanToken.split(':');
      const scopedOrg = parts.length > 1 && parts[1] ? parts[1] : DEFAULT_ORGANIZATION.id;
      const scopedRole = (parts.length > 2 && parts[2] ? parts[2] : 'owner') as UserRole;
      return {
        userId: 'system-admin',
        organizationId: scopedOrg,
        role: scopedRole,
      };
    }
  }

  // 2. Validate with Supabase Auth if Supabase client is configured
  const supabase = getSupabaseClient();
  if (supabase && authHeader) {
    try {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        // Look up verified organization membership in organization_members table
        let verifiedOrgId = user.app_metadata?.organization_id;
        let verifiedRole = (user.app_metadata?.role as UserRole) || 'agent';

        if (!verifiedOrgId) {
          const { data: member } = await supabase
            .from('organization_members')
            .select('organization_id, role')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();

          if (member) {
            verifiedOrgId = member.organization_id;
            verifiedRole = member.role as UserRole;
          }
        }

        return {
          userId: user.id,
          organizationId: verifiedOrgId || DEFAULT_ORGANIZATION.id,
          role: verifiedRole || 'agent',
        };
      }
    } catch (e) {
      console.error('[AuthGuard] Token validation error:', e);
    }
  }

  return null;
}

/**
 * Checks if the user session has one of the required roles.
 */
export function hasRequiredRole(session: AuthSession | null, allowedRoles: UserRole[]): boolean {
  if (!session) return false;
  return allowedRoles.includes(session.role);
}

export function unauthorizedResponse(
  message = 'Acceso denegado: Esta operación administrativa requiere autenticación en el servidor.'
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'UNAUTHORIZED',
    },
    { status: 401 }
  );
}

export function forbiddenResponse(
  message = 'Acceso prohibido: Tu rol de usuario no tiene permisos para realizar esta operación.'
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'FORBIDDEN',
    },
    { status: 403 }
  );
}

export function rateLimitResponse(
  message = 'Límite de solicitudes excedido. Por favor intenta de nuevo en un momento.'
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'TOO_MANY_REQUESTS',
    },
    { status: 429 }
  );
}
