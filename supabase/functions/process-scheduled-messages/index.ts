// Supabase Edge Function: process-scheduled-messages (WITH SECURITY)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
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
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(ip, validRequests);
    return true;
  }
}

const rateLimiter = new RateLimiter(20, 60000); // 20 requests per minute

// Get client IP
function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
         req.headers.get('x-real-ip') ||
         'unknown';
}

interface ScheduledMessage {
  id: string;
  userId: string;
  title: string;
  content: string;
  types: string[];
  status: string;
  scheduledFor: string;
  recipientIds: string[];
  cipherBlobUrl?: string;
  thumbnailUrl?: string;
  videoRecording?: string;
  audioRecording?: string;
  attachments?: any;
  backgroundColor?: string;
}

interface Recipient {
  id: string;
  email: string;
  name: string;
}

serve(async (req) => {
  const requestOrigin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const clientIp = getClientIp(req);

  try {
    console.log('[v4.0-SECURE] Request received from:', clientIp);

    // SECURITY 1: Rate limiting
    if (!rateLimiter.isAllowed(clientIp)) {
      console.warn(`[SECURITY] Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Too many requests' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for emergency release flag
    let body: any = {};
    try {
      body = await req.json();
      console.log('[v4.0-SECURE] Request body:', body);
    } catch (e) {
      console.log('[v4.0-SECURE] No body or invalid JSON, using defaults');
    }
    const forceRelease = body?.emergency_release === true

    // Environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || ''
    
    // SECURITY 2: Emergency releases require either service-role auth (global) or a valid user JWT (scoped)
    let scopedUserId: string | null = null
    if (forceRelease) {
      const authHeader = req.headers.get('authorization') || '';
      const serviceRoleKeyHeaderMatch = supabaseKey && authHeader.includes(supabaseKey)
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

      if (serviceRoleKeyHeaderMatch) {
        console.log('[v4.0-SECURE] Authorized EMERGENCY by service role key from:', clientIp)
      } else if (bearer) {
        try {
          const adminClient = createClient(supabaseUrl, supabaseKey)
          const { data: userData, error: userError } = await adminClient.auth.getUser(bearer)
          if (userError || !userData?.user) {
            console.error('[SECURITY] Invalid JWT for emergency release:', userError)
            return new Response(
              JSON.stringify({ success: false, error: 'Unauthorized: Invalid token' }),
              { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          scopedUserId = userData.user.id
          console.log('[v4.0-SECURE] Authorized EMERGENCY for user:', scopedUserId)
        } catch (e) {
          console.error('[SECURITY] Error validating JWT for emergency release:', e)
          return new Response(
            JSON.stringify({ success: false, error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        console.error('[SECURITY] Missing authorization for emergency release from:', clientIp)
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized: Emergency release requires authentication' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    
    // Simple email validation
    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    // Minimal HTML sanitization
    const sanitizeHtml = (html: string) => html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    
    // Convert Quill classes to inline styles for email compatibility
    const convertQuillClassesToInlineStyles = (html: string): string => {
      console.log('[v4.0-SECURE] 🔧 Converting Quill classes to inline styles...');
      console.log('[v4.0-SECURE] 📝 Original HTML:', html);
      
      // Convert Quill alignment classes to inline styles
      html = html.replace(/class="([^"]*ql-align-center[^"]*)"/g, (match, classes) => {
        const otherClasses = classes.replace(/ql-align-center/g, '').trim();
        return otherClasses ? `class="${otherClasses}" style="text-align: center !important;"` : 'style="text-align: center !important;"';
      });
      html = html.replace(/class="ql-align-center"/g, 'style="text-align: center !important;"');
      
      html = html.replace(/class="([^"]*ql-align-right[^"]*)"/g, (match, classes) => {
        const otherClasses = classes.replace(/ql-align-right/g, '').trim();
        return otherClasses ? `class="${otherClasses}" style="text-align: right !important;"` : 'style="text-align: right !important;"';
      });
      html = html.replace(/class="ql-align-right"/g, 'style="text-align: right !important;"');
      
      html = html.replace(/class="([^"]*ql-align-left[^"]*)"/g, (match, classes) => {
        const otherClasses = classes.replace(/ql-align-left/g, '').trim();
        return otherClasses ? `class="${otherClasses}" style="text-align: left !important;"` : 'style="text-align: left !important;"';
      });
      html = html.replace(/class="ql-align-left"/g, 'style="text-align: left !important;"');
      
      html = html.replace(/class="([^"]*ql-align-justify[^"]*)"/g, (match, classes) => {
        const otherClasses = classes.replace(/ql-align-justify/g, '').trim();
        return otherClasses ? `class="${otherClasses}" style="text-align: justify !important; text-align-last: justify !important;"` : 'style="text-align: justify !important; text-align-last: justify !important;"';
      });
      html = html.replace(/class="ql-align-justify"/g, 'style="text-align: justify !important; text-align-last: justify !important;"');

      // Convert Quill size classes to inline styles
      html = html.replace(/class="([^"]*ql-size-small[^"]*)"/g, (match, classes) => {
        const otherClasses = classes.replace(/ql-size-small/g, '').trim();
        return otherClasses ? `class="${otherClasses}" style="font-size: 0.75em !important;"` : 'style="font-size: 0.75em !important;"';
      });
      
      html = html.replace(/class="([^"]*ql-size-large[^"]*)"/g, (match, classes) => {
        const otherClasses = classes.replace(/ql-size-large/g, '').trim();
        return otherClasses ? `class="${otherClasses}" style="font-size: 1.5em !important;"` : 'style="font-size: 1.5em !important;"';
      });
      
      html = html.replace(/class="([^"]*ql-size-huge[^"]*)"/g, (match, classes) => {
        const otherClasses = classes.replace(/ql-size-huge/g, '').trim();
        return otherClasses ? `class="${otherClasses}" style="font-size: 2.5em !important;"` : 'style="font-size: 2.5em !important;"';
      });

      // Convert Quill color classes to inline styles
      const colorMap: { [key: string]: string } = {
        'ql-color-white': 'color: white !important;',
        'ql-color-red': 'color: #e60000 !important;',
        'ql-color-orange': 'color: #f90 !important;',
        'ql-color-yellow': 'color: #ff0 !important;',
        'ql-color-green': 'color: #008a00 !important;',
        'ql-color-blue': 'color: #06c !important;',
        'ql-color-purple': 'color: #93f !important;',
        'ql-color-black': 'color: #000 !important;'
      };

      Object.entries(colorMap).forEach(([className, style]) => {
        html = html.replace(new RegExp(`class="([^"]*${className}[^"]*)"`, 'g'), (match, classes) => {
          const otherClasses = classes.replace(new RegExp(className, 'g'), '').trim();
          return otherClasses ? `class="${otherClasses}" style="${style}"` : `style="${style}"`;
        });
      });

      // Convert Quill background color classes to inline styles
      const bgColorMap: { [key: string]: string } = {
        'ql-bg-white': 'background-color: white !important;',
        'ql-bg-red': 'background-color: #e60000 !important;',
        'ql-bg-orange': 'background-color: #f90 !important;',
        'ql-bg-yellow': 'background-color: #ff0 !important;',
        'ql-bg-green': 'background-color: #008a00 !important;',
        'ql-bg-blue': 'background-color: #06c !important;',
        'ql-bg-purple': 'background-color: #93f !important;',
        'ql-bg-black': 'background-color: #000 !important;'
      };

      Object.entries(bgColorMap).forEach(([className, style]) => {
        html = html.replace(new RegExp(`class="([^"]*${className}[^"]*)"`, 'g'), (match, classes) => {
          const otherClasses = classes.replace(new RegExp(className, 'g'), '').trim();
          return otherClasses ? `class="${otherClasses}" style="${style}"` : `style="${style}"`;
        });
      });

      // Convert Quill formatting classes to inline styles
      html = html.replace(/class="([^"]*ql-bold[^"]*)"/g, (match, classes) => {
        const otherClasses = classes.replace(/ql-bold/g, '').trim();
        return otherClasses ? `class="${otherClasses}" style="font-weight: bold !important;"` : 'style="font-weight: bold !important;"';
      });
      
      html = html.replace(/class="([^"]*ql-italic[^"]*)"/g, (match, classes) => {
        const otherClasses = classes.replace(/ql-italic/g, '').trim();
        return otherClasses ? `class="${otherClasses}" style="font-style: italic !important;"` : 'style="font-style: italic !important;"';
      });
      
      html = html.replace(/class="([^"]*ql-underline[^"]*)"/g, (match, classes) => {
        const otherClasses = classes.replace(/ql-underline/g, '').trim();
        return otherClasses ? `class="${otherClasses}" style="text-decoration: underline !important;"` : 'style="text-decoration: underline !important;"';
      });
      
      html = html.replace(/class="([^"]*ql-strike[^"]*)"/g, (match, classes) => {
        const otherClasses = classes.replace(/ql-strike/g, '').trim();
        return otherClasses ? `class="${otherClasses}" style="text-decoration: line-through !important;"` : 'style="text-decoration: line-through !important;"';
      });

      // Ensure images have proper styling
      html = html.replace(/<img([^>]*)>/g, (match, attrs) => {
        if (!attrs.includes('style=')) {
          return `<img${attrs} style="max-width: 100% !important; height: auto !important; max-height: 300px !important; object-fit: contain !important;">`;
        }
        return match;
      });

      // Convert header tags to inline styles
      html = html.replace(/<h1([^>]*)>/g, '<h1$1 style="font-size: 2em !important; font-weight: bold !important; margin: 16px 0 !important;">');
      html = html.replace(/<h2([^>]*)>/g, '<h2$1 style="font-size: 1.5em !important; font-weight: bold !important; margin: 14px 0 !important;">');
      html = html.replace(/<h3([^>]*)>/g, '<h3$1 style="font-size: 1.17em !important; font-weight: bold !important; margin: 12px 0 !important;">');

      // Ensure strong and em tags have proper styling
      html = html.replace(/<strong([^>]*)>/g, '<strong$1 style="font-weight: bold !important;">');
      html = html.replace(/<b([^>]*)>/g, '<b$1 style="font-weight: bold !important;">');
      html = html.replace(/<em([^>]*)>/g, '<em$1 style="font-style: italic !important;">');
      html = html.replace(/<i([^>]*)>/g, '<i$1 style="font-style: italic !important;">');
      html = html.replace(/<u([^>]*)>/g, '<u$1 style="text-decoration: underline !important;">');
      html = html.replace(/<s([^>]*)>/g, '<s$1 style="text-decoration: line-through !important;">');

      console.log('[v4.0-SECURE] ✅ Quill classes converted to inline styles');
      console.log('[v4.0-SECURE] 📝 Converted HTML:', html);
      return html;
    }
    // Use anon JWT if available; otherwise fall back to service-role JWT so the gateway accepts the request
    const authJwt = supabaseAnon || supabaseKey
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }

    console.log('[v4.0-SECURE] Using service role key for DMS processing')
    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date().toISOString()
    
    if (forceRelease) {
      console.log(`[v4.0-SECURE] 🚨 EMERGENCY RELEASE MODE - Forcing immediate release of ALL DMS messages`)
    } else {
      console.log(`[v4.0-SECURE] 📧 Processing scheduled messages and DMS cycles due before ${now}`)
    }

    // ========== STEP 1: Process DMS (Guardian Angel) Overdue Cycles ==========
    console.log('[v4.0-SECURE] 🛡️ Checking for overdue Guardian Angel cycles...')
    
    const { data: dmsConfigs, error: dmsConfigError } = await supabase
      .from('dms_configs')
      .select('*')
      .match(scopedUserId ? { userId: scopedUserId } : {})

    if (dmsConfigError) {
      console.error('Error fetching DMS configs:', dmsConfigError)
      throw dmsConfigError
    }

    console.log(`Found ${dmsConfigs?.length || 0} active DMS configurations`)

    let overdueCount = 0
    let emergencyCount = 0

    if (dmsConfigs && dmsConfigs.length > 0) {
      for (const config of dmsConfigs) {
        const { data: currentCycle, error: cycleError } = await supabase
          .from('dms_cycles')
          .select('*')
          .eq('configId', config.id)
          .order('updatedAt', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (cycleError) {
          console.error(`Error fetching cycle for config ${config.id}:`, cycleError)
          continue
        }

        if (!currentCycle) {
          console.log(`No active cycle for config ${config.id}`)
          continue
        }

        const nextCheckinAt = new Date(currentCycle.nextCheckinAt)
        const graceUnit = (config as any).graceUnit || 'days'
        const graceMs = graceUnit === 'minutes' ? 60 * 1000 : graceUnit === 'hours' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000
        const graceDeadline = new Date(nextCheckinAt.getTime() + config.graceDays * graceMs)
        const currentTime = new Date()

        const isOverdue = currentTime > graceDeadline
        const shouldRelease = forceRelease || isOverdue

        if (shouldRelease) {
          if (forceRelease) {
            console.log(`🚨 EMERGENCY: Releasing messages for config ${config.id}`)
            emergencyCount++
          } else {
            console.log(`⏰ OVERDUE: Config ${config.id} missed check-in. Grace deadline: ${graceDeadline.toISOString()}, Current: ${currentTime.toISOString()}`)
            overdueCount++
          }

          // Audit log
          await supabase.from('audit_logs').insert({
            user_id: config.userId,
            action: forceRelease ? 'DMS_EMERGENCY_RELEASE' : 'DMS_OVERDUE_RELEASE',
            resource_type: 'dms_config',
            resource_id: config.id,
            metadata: {
              configId: config.id,
              cycleId: currentCycle.id,
              graceDeadline: graceDeadline.toISOString(),
              currentTime: currentTime.toISOString()
            },
            ip_address: clientIp,
            status: 'SUCCESS'
          });

          // Get assigned messages (DMS messages are identified by scope='DMS')
          console.log(`[DEBUG] Looking for messages with userId: ${config.userId}, scope: DMS`);
          
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('userId', config.userId)
            .eq('scope', 'DMS')
            .neq('status', 'SENT')

          if (messagesError) {
            console.error('Error fetching messages:', messagesError)
            continue
          }

          console.log(`[DEBUG] Found ${messages?.length || 0} Guardian Angel messages to release`);
          if (messages && messages.length > 0) {
            console.log(`[DEBUG] Message IDs:`, messages.map(m => m.id));
            console.log(`[DEBUG] Message statuses:`, messages.map(m => m.status));
            console.log(`[DEBUG] Message types:`, messages.map(m => m.types));
            console.log(`[DEBUG] Message recipientIds:`, messages.map(m => m.recipientIds));
          }

          // Send each message (via Resend) and only mark SENT if all recipients succeeded
          if (messages && messages.length > 0) {
            for (const message of messages) {
              console.log(`Sending message ${message.id}: ${message.title}`)

              let allSent = true
              for (const recipientId of message.recipientIds || []) {
                const { data: recipient, error: recipientError } = await supabase
                  .from('recipients')
                  .select('*')
                  .eq('id', recipientId)
                  .maybeSingle()
                
                if (recipientError || !recipient) {
                  console.error(`Error fetching recipient ${recipientId}:`, recipientError)
                  allSent = false
                  continue
                }

                try {
                  if (!resendApiKey) {
                    console.error('[v4.0-SECURE] RESEND_API_KEY not configured');
                    allSent = false
                    continue
                  }
                  if (!isValidEmail(recipient.email)) {
                    console.error('[v4.0-SECURE] Invalid recipient email:', recipient.email)
                    allSent = false
                    continue
                  }
                  const from = 'Rembr <noreply@sugarbox.uk>'
                  const sanitized = sanitizeHtml(message.content || '')
                  
                  // Prepare attachments
                  const attachments: any[] = []
                  
                  // Add video attachment if present
                  if (message.cipherBlobUrl || message.videoRecording) {
                    const videoUrl = message.cipherBlobUrl || message.videoRecording
                    console.log('Video message with URL:', videoUrl)
                    if (videoUrl.startsWith('http')) {
                      try {
                        const response = await fetch(videoUrl)
                        const arrayBuffer = await response.arrayBuffer()
                        const bytes = new Uint8Array(arrayBuffer)
                        let binary = ''
                        for (let i = 0; i < bytes.length; i++) {
                          binary += String.fromCharCode(bytes[i])
                        }
                        const base64 = btoa(binary)
                        attachments.push({
                          filename: 'video-message.mp4',
                          content: base64,
                          contentType: 'video/mp4'
                        })
                      } catch (error) {
                        console.warn('Failed to fetch video attachment:', error)
                        attachments.push({
                          filename: 'video-message.mp4',
                          content: `Video recording available at: ${videoUrl}`,
                          contentType: 'text/plain'
                        })
                      }
                    } else {
                      // It's already base64 data URL
                      attachments.push({
                        filename: 'video-message.mp4',
                        content: videoUrl.split(',')[1],
                        contentType: 'video/mp4'
                      })
                    }
                  }
                  
                  // Add audio attachment if present
                  if (message.audioRecording) {
                    if (message.audioRecording.startsWith('http')) {
                      try {
                        const response = await fetch(message.audioRecording)
                        const arrayBuffer = await response.arrayBuffer()
                        const bytes = new Uint8Array(arrayBuffer)
                        let binary = ''
                        for (let i = 0; i < bytes.length; i++) {
                          binary += String.fromCharCode(bytes[i])
                        }
                        const base64 = btoa(binary)
                        attachments.push({
                          filename: 'audio-message.mp3',
                          content: base64,
                          contentType: 'audio/mpeg'
                        })
                      } catch (error) {
                        console.warn('Failed to fetch audio attachment:', error)
                        attachments.push({
                          filename: 'audio-message.mp3',
                          content: `Audio recording available at: ${message.audioRecording}`,
                          contentType: 'text/plain'
                        })
                      }
                    } else {
                      // It's already base64 data URL
                      attachments.push({
                        filename: 'audio-message.mp3',
                        content: message.audioRecording.split(',')[1],
                        contentType: 'audio/mpeg'
                      })
                    }
                  }
                  
                  const emailPayload: any = {
                    from,
                    to: [recipient.email],
                    subject: message.title || 'Message',
                    html: sanitized,
                  }
                  
                  // Add attachments if any
                  if (attachments.length > 0) {
                    emailPayload.attachments = attachments
                  }
                  
                  const resendResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${resendApiKey}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(emailPayload),
                  })
                  const resendData = await resendResponse.json().catch(() => ({}))
                  if (resendResponse.ok) {
                    console.log(`✅ Email sent to ${recipient.email}`)
                    // Increment persistent stats (best effort)
                    try {
                      const { error: statsErr } = await supabase.rpc('increment_user_sent', { p_user_id: message.userId || config.userId, p_amount: 1 })
                      if (statsErr) console.error('[v4.0-SECURE] increment_user_sent error:', statsErr)
                    } catch (e) {
                      console.error('[v4.0-SECURE] Failed to increment user stats:', e)
                    }
                  } else {
                    console.error(`[v4.0-SECURE] ❌ Resend error for ${recipient.email}:`, resendResponse.status, resendData)
                    allSent = false
                  }
                } catch (error) {
                  console.error(`[v4.0-SECURE] Error sending email to ${recipient.email}:`, error)
                  allSent = false
                }
              }

              if (allSent) {
                const { error: updateError } = await supabase
                  .from('messages')
                  .update({ 
                    status: 'SENT',
                    updatedAt: new Date().toISOString()
                  })
                  .eq('id', message.id)
                if (updateError) {
                  console.error(`Error updating message ${message.id} status:`, updateError)
                } else {
                  console.log(`✅ Message ${message.id} marked as SENT`)
                }
              } else {
                console.log(`⚠️ Message ${message.id} not marked as SENT due to email failures`)
              }
            }
          }

          // Mark cycle as completed
          await supabase
            .from('dms_cycles')
            .update({ status: 'OVERDUE', completedAt: new Date().toISOString() })
            .eq('id', currentCycle.id)
        }
      }
    }

    // ========== STEP 2: Process Regular Scheduled Messages ==========
    console.log('[v4.0-SECURE] 📧 Checking for regular scheduled messages...')
    
    const { data: scheduledMessages, error: scheduledError } = await supabase
      .from('messages')
      .select('*')
      .eq('status', 'SCHEDULED')
      .lte('scheduledFor', now)
    
    let scheduledCount = 0
    
    if (scheduledError) {
      console.error('Error fetching scheduled messages:', scheduledError)
    } else if (scheduledMessages && scheduledMessages.length > 0) {
      console.log(`[v4.0-SECURE] Found ${scheduledMessages.length} scheduled messages ready to send`)
      
      for (const message of scheduledMessages) {
        console.log(`[v4.0-SECURE] Processing scheduled message ${message.id}: ${message.title}`)
        
        // Send emails to all recipients first
        let emailSuccess = true
        for (const recipientId of message.recipientIds || []) {
          const { data: recipient, error: recipientError } = await supabase
            .from('recipients')
            .select('*')
            .eq('id', recipientId)
            .maybeSingle()
          
          if (recipientError || !recipient) {
            console.error(`Error fetching recipient ${recipientId}:`, recipientError)
            continue
          }
          
          try {
            if (!resendApiKey) {
              console.error('[v4.0-SECURE] RESEND_API_KEY not configured');
              emailSuccess = false
              continue
            }
            if (!isValidEmail(recipient.email)) {
              console.error('[v4.0-SECURE] Invalid recipient email:', recipient.email)
              emailSuccess = false
              continue
            }
            const from = 'Rembr <noreply@sugarbox.uk>'
            let sanitized = sanitizeHtml(message.content || '')
            
            console.log('[v4.0-SECURE] 📝 STEP 1 - Original message content:', message.content);
            console.log('[v4.0-SECURE] 📝 STEP 1 - Content length:', message.content?.length || 0);
            console.log('[v4.0-SECURE] 📝 STEP 1 - Contains HTML tags:', /<[^>]*>/g.test(message.content || ''));
            
            // Process content to replace placeholders (edge function version)
            const siteName = 'Rembr'; // Default site name for edge function
            sanitized = sanitized
              .replace(/\[Name\]/g, recipient.name)
              .replace(/\[Recipient Name\]/g, recipient.name)
              .replace(/\[Your Name\]/g, siteName)
              .replace(/\{\{siteName\}\}/g, siteName)
              .replace(/\{\{recipientName\}\}/g, recipient.name);
              
            console.log('[v4.0-SECURE] 📝 STEP 2 - After variable replacement:', sanitized);
            
            console.log('[v4.0-SECURE] 🔧 Before Quill conversion:', sanitized);
            sanitized = convertQuillClassesToInlineStyles(sanitized)
            console.log('[v4.0-SECURE] 🔧 After Quill conversion:', sanitized);
            
        // Always wrap content with background color and container (default to white if not provided)
        const bgColor = message.backgroundColor || '#ffffff';
        console.log('[v4.0-SECURE] 🎨 STEP 3 - Background color (with default):', bgColor);
        console.log('[v4.0-SECURE] 🎨 STEP 3 - Background color type:', typeof bgColor);
        
        // Ensure content has HTML tags - wrap plain text if needed
        let htmlContent = sanitized;
        const hasHtmlTags = /<[^>]*>/g.test(sanitized);
        console.log('[v4.0-SECURE] 📝 STEP 4 - Has HTML tags:', hasHtmlTags);
        
        if (!hasHtmlTags) {
          console.log('[v4.0-SECURE] 📝 STEP 4 - Plain text detected, wrapping in <p> tags');
          htmlContent = `<p>${sanitized.replace(/\n/g, '</p><p>')}</p>`;
          console.log('[v4.0-SECURE] 📝 STEP 4 - Wrapped HTML:', htmlContent);
        } else {
          console.log('[v4.0-SECURE] 📝 STEP 4 - Already has HTML tags, using as-is');
        }
        
        const isHtmlContent = true; // Always treat as HTML now
        console.log('[v4.0-SECURE] 📧 Processing as HTML content');
        if (isHtmlContent) {
            sanitized = `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb !important; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                <tr>
                  <td style="padding: 20px !important;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${bgColor} !important; border-radius: 12px !important; overflow: hidden !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                      <tr>
                        <td style="padding: 20px !important; mso-line-height-rule: exactly;">
                          ${htmlContent}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            `;
        }
        
        console.log('[v4.0-SECURE] 📧 STEP 6 - Final processed content length:', sanitized.length);
        console.log('[v4.0-SECURE] 📧 STEP 6 - Final content preview:', sanitized.substring(0, 200) + '...');
            const resendResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from,
                to: [recipient.email],
                subject: (message.title || 'Message')
                  .replace(/\[Name\]/g, recipient.name)
                  .replace(/\[Recipient Name\]/g, recipient.name)
                  .replace(/\[Your Name\]/g, siteName)
                  .replace(/\{\{siteName\}\}/g, siteName)
                  .replace(/\{\{recipientName\}\}/g, recipient.name),
                html: sanitized,
              }),
            })
            const resendData = await resendResponse.json().catch(() => ({}))
            if (resendResponse.ok) {
              console.log(`[v4.0-SECURE] ✅ Email sent to ${recipient.email}`)
              scheduledCount++
            } else {
              console.error(`[v4.0-SECURE] ❌ Resend error for ${recipient.email}:`, resendResponse.status, resendData)
              emailSuccess = false
            }
          } catch (error) {
            console.error(`[v4.0-SECURE] Error sending email to ${recipient.email}:`, error)
            emailSuccess = false
          }
        }
        
        // Only update status to SENT if all emails were sent successfully
        if (emailSuccess) {
          const { error: updateError } = await supabase
            .from('messages')
            .update({ 
              status: 'SENT',
              updatedAt: new Date().toISOString()
            })
            .eq('id', message.id)
          
          if (updateError) {
            console.error(`[v4.0-SECURE] Error updating message ${message.id} status:`, updateError)
          } else {
            console.log(`[v4.0-SECURE] ✅ Message ${message.id} marked as SENT`)
          }
        } else {
          console.log(`[v4.0-SECURE] ⚠️ Message ${message.id} not marked as SENT due to email failures`)
        }
      }
    } else {
      console.log('[v4.0-SECURE] No scheduled messages ready to send')
    }

    const summary = forceRelease 
      ? `Emergency release: ${emergencyCount} configurations processed`
      : `Processed ${overdueCount} overdue DMS cycles, ${scheduledCount} scheduled emails sent`

    console.log(`[v4.0-SECURE] ✅ ${summary}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: summary,
        overdueCount: forceRelease ? emergencyCount : overdueCount,
        scheduledCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[v4.0-SECURE] Error:', error);
    console.error('[v4.0-SECURE] Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error',
        stack: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})