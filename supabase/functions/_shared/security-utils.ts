import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Security headers for all responses
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'",
};

/**
 * Get CORS headers with configurable origin
 */
export function getCorsHeaders(allowedOrigin?: string): Record<string, string> {
  const origin = allowedOrigin || Deno.env.get('ALLOWED_ORIGIN') || '*';
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Verify request is authenticated with service role key
 * This ensures only GitHub Actions or authorized services can call sensitive endpoints
 */
export function verifyServiceRoleAuth(req: Request): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  return token === serviceRoleKey;
}

/**
 * Verify request is authenticated with valid user token
 */
export async function verifyUserAuth(req: Request): Promise<{ userId: string | null; error: string | null }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return { userId: null, error: 'No authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { userId: null, error: 'Invalid token' };
  }
  
  return { userId: user.id, error: null };
}

/**
 * Sanitize HTML content to prevent XSS
 * Removes dangerous tags and attributes
 */
export function sanitizeHtml(html: string): string {
  // Allowed tags
  const allowedTags = ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'];
  
  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: URLs (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  // Remove style tags
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove iframe, object, embed tags
  sanitized = sanitized.replace(/<(iframe|object|embed|applet)[^>]*>.*?<\/\1>/gi, '');
  
  return sanitized;
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get client IP address from request
 */
export function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

/**
 * Get user agent from request
 */
export function getUserAgent(req: Request): string {
  return req.headers.get('user-agent') || 'unknown';
}

/**
 * Log audit event to database
 */
export async function logAudit(params: {
  supabase: any;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status?: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;
}): Promise<void> {
  try {
    const { error } = await params.supabase
      .from('audit_logs')
      .insert({
        user_id: params.userId || null,
        action: params.action,
        resource_type: params.resourceType || null,
        resource_id: params.resourceId || null,
        metadata: params.metadata || null,
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
        status: params.status || 'SUCCESS',
        error_message: params.errorMessage || null,
      });
    
    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (err) {
    console.error('Audit logging error:', err);
  }
}

/**
 * Create error response with security headers
 */
export function createErrorResponse(
  error: string,
  status: number = 400,
  corsHeaders: Record<string, string> = getCorsHeaders()
): Response {
  return new Response(
    JSON.stringify({ success: false, error }),
    {
      status,
      headers: {
        ...corsHeaders,
        ...securityHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Create success response with security headers
 */
export function createSuccessResponse(
  data: any,
  corsHeaders: Record<string, string> = getCorsHeaders()
): Response {
  return new Response(
    JSON.stringify({ success: true, ...data }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        ...securityHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}
