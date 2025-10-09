// Supabase Edge Function: send-email (WITH SECURITY)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS helper function - restrict to allowed origins
function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'https://www.rembr.co.uk',
    'https://rembr.co.uk'
  ];
  
  const origin = requestOrigin && allowedOrigins.includes(requestOrigin) 
    ? requestOrigin 
    : allowedOrigins[0]; // Default to localhost for development
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
  };
}

// Simple rate limiter
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(ip: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(ip) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(ip, validRequests);
    return true;
  }
}

const rateLimiter = new RateLimiter(50, 60000); // 50 requests per minute

// Email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Simple HTML sanitization - remove script tags
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, ''); // Remove inline event handlers
}

// Get client IP
function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
         req.headers.get('x-real-ip') ||
         'unknown';
}

serve(async (req) => {
  // Get CORS headers based on request origin
  const requestOrigin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(requestOrigin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const clientIp = getClientIp(req);

  try {
    // SECURITY 1: Rate limiting
    if (!rateLimiter.isAllowed(clientIp)) {
      console.warn(`[SECURITY] Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get RESEND_API_KEY
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not set');
      return new Response(
        JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { recipientEmail, recipientName, subject, content, senderName, userId } = await req.json();
    
    console.log('[v4.0-SECURE] Processing email:', { recipientEmail, subject, userId });

    // SECURITY 2: Validate email format
    if (!isValidEmail(recipientEmail)) {
      console.error('[SECURITY] Invalid email format:', recipientEmail);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase for recipient validation and audit logging
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // SECURITY 3: Recipient validation (if userId provided)
    if (userId) {
      const { data: recipient, error: recipientError } = await supabase
        .from('recipients')
        .select('id, email')
        .eq('email', recipientEmail)
        .eq('userId', userId)
        .maybeSingle();
      
      if (recipientError || !recipient) {
        console.error('[SECURITY] Unauthorized recipient:', recipientEmail, 'for user:', userId);
        
        // AUDIT LOG: Unauthorized email attempt
        await supabase.from('audit_logs').insert({
          user_id: userId,
          action: 'EMAIL_SEND_UNAUTHORIZED',
          resource_type: 'email',
          metadata: { recipientEmail, subject },
          ip_address: clientIp,
          status: 'FAILED',
          error_message: 'Recipient not authorized'
        });
        
        return new Response(
          JSON.stringify({ success: false, error: 'Recipient not authorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // SECURITY 4: Sanitize HTML content
    const sanitizedContent = sanitizeHtml(content);

    // Build from address - hardcoded to avoid formatting issues
    const from = 'Rembr <noreply@sugarbox.uk>';

    console.log('[v4.0-SECURE] Sending from:', from, 'API Key:', resendApiKey.substring(0, 10));

    // Send via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [recipientEmail],
        subject,
        html: sanitizedContent,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('[v4.0-SECURE] Resend error:', resendData);
      
      // AUDIT LOG: Email send failed
      if (userId) {
        await supabase.from('audit_logs').insert({
          user_id: userId,
          action: 'EMAIL_SEND_FAILED',
          resource_type: 'email',
          metadata: { recipientEmail, subject, error: resendData },
          ip_address: clientIp,
          status: 'FAILED',
          error_message: `Resend API error: ${resendResponse.status}`
        });
      }
      
      return new Response(
        JSON.stringify({ success: false, error: `Resend API error: ${resendResponse.status} - ${JSON.stringify(resendData)}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[v4.0-SECURE] Email sent successfully:', resendData.id);

    // AUDIT LOG: Email sent successfully
    if (userId) {
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'EMAIL_SENT',
        resource_type: 'email',
        metadata: { recipientEmail, subject, messageId: resendData.id },
        ip_address: clientIp,
        status: 'SUCCESS'
      });
    }

    return new Response(
      JSON.stringify({ success: true, messageId: resendData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[v4.0-SECURE] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});