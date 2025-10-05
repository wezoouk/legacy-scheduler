// Supabase Edge Function: process-scheduled-messages (WITH SECURITY)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS helper function - restrict to allowed origins
function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
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
    
    // SECURITY 2: Emergency releases require service role authentication
    if (forceRelease) {
      const authHeader = req.headers.get('authorization');
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!authHeader || !authHeader.includes(serviceRoleKey || '')) {
        console.error('[SECURITY] Unauthorized emergency release attempt from:', clientIp);
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized: Emergency release requires service role key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('[v4.0-SECURE] Authorized emergency release request from:', clientIp);
    }
    
    // Use service role key to bypass RLS for DMS processing
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
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
          .order('cycleNumber', { ascending: false })
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

          // Get assigned messages
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('*, recipients(*)')
            .eq('userId', config.userId)
            .eq('status', 'SCHEDULED')
            .contains('types', ['GUARDIAN_ANGEL'])

          if (messagesError) {
            console.error('Error fetching messages:', messagesError)
            continue
          }

          console.log(`Found ${messages?.length || 0} Guardian Angel messages to release`)

          // Send each message
          if (messages && messages.length > 0) {
            for (const message of messages) {
              console.log(`Sending message ${message.id}: ${message.title}`)

              // Update message status
              await supabase
                .from('messages')
                .update({ 
                  status: 'SENT',
                  sentAt: new Date().toISOString()
                })
                .eq('id', message.id)

              // Call send-email function for each recipient
              for (const recipientId of message.recipientIds || []) {
                const recipient = message.recipients?.find((r: any) => r.id === recipientId)
                if (!recipient) continue

                try {
                  const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${supabaseKey}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      messageId: message.id,
                      recipientEmail: recipient.email,
                      recipientName: recipient.name,
                      subject: message.title,
                      content: message.content,
                      messageType: 'EMAIL',
                      userId: config.userId
                    }),
                  })

                  if (emailResponse.ok) {
                    console.log(`✅ Email sent to ${recipient.email}`)
                  } else {
                    console.error(`❌ Failed to send email to ${recipient.email}`)
                  }
                } catch (error) {
                  console.error(`Error sending email to ${recipient.email}:`, error)
                }
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

    const summary = forceRelease 
      ? `Emergency release: ${emergencyCount} configurations processed`
      : `Processed ${overdueCount} overdue DMS cycles`

    console.log(`[v4.0-SECURE] ✅ ${summary}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: summary,
        overdueCount: forceRelease ? emergencyCount : overdueCount
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