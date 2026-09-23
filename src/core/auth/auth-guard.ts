import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseUserClient } from '../database/supabase-adapter';
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
 * Safely extracts real client IP behind proxies (Vercel, Cloudflare, AWS, Nginx).
 */
export function extractClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp && firstIp !== '::1' && firstIp !== 'unknown') {
      return firstIp;
    }
  }
  const realIp = req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Serverless-resilient rate limiter:
 * 1. Tries Supabase PostgreSQL RPC `check_distributed_rate_limit` when database is available.
 * 2. Gracefully falls back to sliding-window in-memory rate limiting if database RPC is unavailable.
 * 3. Never falsely locks out users due to database permission or network hiccups.
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
      if (error) {
        // Log warning and gracefully continue with in-memory sliding window
        console.warn(`[RateLimit] check_distributed_rate_limit fallback to memory for ${endpoint}:`, error.message);
      }
    } catch (e: any) {
      console.warn(`[RateLimit] check_distributed_rate_limit exception fallback to memory:`, e?.message);
    }
  }

  // Sliding window in-memory rate limiter
  const now = Date.now();
  const key = `${identifier}:${endpoint}`;
  const record = inMemoryRateLimitMap.get(key);

  // Periodic cleanup of expired records if map grows large
  if (inMemoryRateLimitMap.size > 1000) {
    for (const [k, v] of inMemoryRateLimitMap.entries()) {
      if (now > v.expiresAt) inMemoryRateLimitMap.delete(k);
    }
  }

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
  const isProduction = process.env.NODE_ENV === 'production' && !process.env.TEST_MODE && !process.env.DEMO_MODE;

  // 1. Check for API Secret in server integrations (strictly disallowed for simulated dev tokens in production)
  const adminSecret = process.env.ADMIN_API_SECRET || (!isProduction ? 'ia-admin-secret-dev' : undefined);

  if (authHeader && adminSecret) {
    const cleanToken = authHeader.replace(/^Bearer\s+/i, '').trim();

    // In production, reject default dev secrets unconditionally
    if (isProduction && cleanToken.startsWith('ia-admin-secret-dev')) {
      return null;
    }

    // Check if matching admin secret or scoped admin token (e.g. "secret:org_cardona_real_002:admin")
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

  // 2. Validate with Supabase Auth using the user's JWT client
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const userClient = getSupabaseUserClient(token);
    if (userClient) {
      try {
        const { data: { user }, error: userError } = await userClient.auth.getUser(token);
        if (!userError && user) {
          // Look up verified organization membership in organization_members table using the authenticated userClient
          let verifiedOrgId = user.app_metadata?.organization_id;
          let verifiedRole = (user.app_metadata?.role as UserRole) || undefined;

          if (!verifiedOrgId) {
            const { data: member, error: memberError } = await userClient
              .from('organization_members')
              .select('organization_id, role')
              .eq('user_id', user.id)
              .limit(1)
              .maybeSingle();

            if (member && !memberError) {
              verifiedOrgId = member.organization_id;
              verifiedRole = member.role as UserRole;
            }
          }

          // If not found in organization_members, check if the user belongs to an organization via public.organizations
          if (!verifiedOrgId) {
            const { data: orgs } = await userClient
              .from('organizations')
              .select('id')
              .limit(1);

            if (orgs && orgs.length > 0) {
              verifiedOrgId = orgs[0].id;
              verifiedRole = verifiedRole || 'owner';
            }
          }

          if (verifiedOrgId) {
            return {
              userId: user.id,
              organizationId: verifiedOrgId,
              role: verifiedRole || 'owner',
            };
          }

          // In production, reject if user has no valid organization in Supabase
          if (isProduction) {
            console.error('[AuthGuard] Authenticated Supabase user has no organization in Supabase:', user.id);
            return null;
          }

          return {
            userId: user.id,
            organizationId: DEFAULT_ORGANIZATION.id,
            role: verifiedRole || 'agent',
          };
        }
      } catch (e) {
        console.error('[AuthGuard] Token validation error:', e);
      }
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
