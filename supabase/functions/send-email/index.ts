// Supabase Edge Function: send-email
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { RateLimiter, createRateLimitResponse } from '../_shared/rate-limiter.ts'
import { 
  getCorsHeaders, 
  sanitizeHtml,
  isValidEmail,
  getClientIp, 
  getUserAgent,
  logAudit,
  createErrorResponse,
  createSuccessResponse 
} from '../_shared/security-utils.ts'

// Get CORS headers with allowed origin
const corsHeaders = getCorsHeaders()

// Rate limiter: max 20 emails per minute per IP (more lenient for email sending)
const rateLimiter = new RateLimiter({
  maxRequests: 20,
  windowMs: 60000, // 1 minute
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Get client info for rate limiting and audit logging
  const clientIp = getClientIp(req)
  const userAgent = getUserAgent(req)

  try {
    // Rate limiting check
    if (!rateLimiter.isAllowed(clientIp)) {
      console.warn(`Rate limit exceeded for IP: ${clientIp}`)
      return createRateLimitResponse(rateLimiter.getResetTime(clientIp))
    }

    // Get RESEND_API_KEY from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return createErrorResponse('RESEND_API_KEY environment variable not set', 500, corsHeaders)
    }

    // Initialize Supabase client for recipient validation and audit logging
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Build From header: Rembr - {user name}
    const defaultFrom = 'Rembr <onboarding@resend.dev>';
    const envFrom = Deno.env.get('RESEND_FROM');
    const replyTo = Deno.env.get('RESEND_REPLY_TO') || 'noreply@sugarbox.uk';

    // Parse request body
    const { 
      messageId, 
      recipientEmail, 
      recipientName, 
      subject, 
      content, 
      messageType,
      attachments,
      senderName,
      userId
    } = await req.json();

    console.log('Processing email request:', { recipientEmail, subject, messageId });

    // Validate required fields
    if (!recipientEmail || !subject || !content) {
      return createErrorResponse('Missing required fields: recipientEmail, subject, content', 400, corsHeaders)
    }

    // SECURITY: Validate email format
    if (!isValidEmail(recipientEmail)) {
      console.error('Invalid email format:', recipientEmail)
      return createErrorResponse('Invalid email address format', 400, corsHeaders)
    }

    // SECURITY: Validate recipient is authorized (if userId provided)
    if (userId) {
      const { data: recipient, error: recipientError } = await supabase
        .from('recipients')
        .select('id, email')
        .eq('email', recipientEmail)
        .eq('userId', userId)
        .maybeSingle()
      
      if (recipientError || !recipient) {
        console.error('Unauthorized recipient:', recipientEmail, 'for user:', userId)
        
        // Audit log for unauthorized attempt
        await logAudit({
          supabase,
          userId: userId,
          action: 'EMAIL_SEND_UNAUTHORIZED',
          resourceType: 'email',
          metadata: { recipientEmail, messageId },
          ipAddress: clientIp,
          userAgent: userAgent,
          status: 'FAILURE',
          errorMessage: 'Recipient not authorized for this user',
        })
        
        return createErrorResponse('Recipient not authorized', 403, corsHeaders)
      }
    }

    // SECURITY: Sanitize HTML content to prevent XSS
    const htmlContent = /<[^>]*>/g.test(content)
      ? sanitizeHtml(content)
      : content.replace(/\n/g, '<br>').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Determine From header
    const fromHeader = senderName
      ? `Rembr - ${senderName} <onboarding@resend.dev>`
      : (envFrom || defaultFrom);

    // Prepare email payload for Resend
    const emailPayload = {
      from: fromHeader,
      to: [recipientEmail],
      subject: subject,
      html: htmlContent,
      reply_to: replyTo,
      // Add attachments if provided
      ...(attachments && attachments.length > 0 && {
        attachments: attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
          content_type: att.contentType,
        }))
      })
    };

    console.log('Sending email via Resend:', { from: fromHeader, to: recipientEmail });

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error('Resend API error:', resendResponse.status, errorData);
      
      // Audit log for failed email
      await logAudit({
        supabase,
        userId: userId || null,
        action: 'EMAIL_SEND_FAILED',
        resourceType: 'email',
        resourceId: messageId,
        metadata: { recipientEmail, subject, resendError: errorData },
        ipAddress: clientIp,
        userAgent: userAgent,
        status: 'FAILURE',
        errorMessage: `Resend API error: ${resendResponse.status}`,
      })
      
      return createErrorResponse(`Resend API error: ${resendResponse.status} - ${errorData}`, 500, corsHeaders)
    }

    const resendResult = await resendResponse.json();
    console.log('Email sent successfully:', resendResult.id);

    // Audit log for successful email
    await logAudit({
      supabase,
      userId: userId || null,
      action: 'EMAIL_SENT',
      resourceType: 'email',
      resourceId: messageId,
      metadata: { recipientEmail, subject, resendId: resendResult.id },
      ipAddress: clientIp,
      userAgent: userAgent,
      status: 'SUCCESS',
    })

    // Return success response
    return createSuccessResponse({
      messageId: resendResult.id,
      deliveredAt: new Date().toISOString(),
    }, corsHeaders);

  } catch (error) {
    console.error('Email sending error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});