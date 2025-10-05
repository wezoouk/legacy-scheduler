// Supabase Edge Function: process-scheduled-messages
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { RateLimiter, createRateLimitResponse } from '../_shared/rate-limiter.ts'
import { 
  getCorsHeaders, 
  verifyServiceRoleAuth, 
  getClientIp, 
  getUserAgent,
  logAudit,
  createErrorResponse,
  createSuccessResponse 
} from '../_shared/security-utils.ts'

// Get CORS headers with allowed origin
const corsHeaders = getCorsHeaders()

// Rate limiter: max 10 requests per minute per IP
const rateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60000, // 1 minute
})

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    // Check for emergency release flag
    const body = await req.json().catch(() => ({}))
    const forceRelease = body?.emergency_release === true
    
    // SECURITY: Emergency releases require service role authentication
    if (forceRelease) {
      if (!verifyServiceRoleAuth(req)) {
        console.error('Unauthorized emergency release attempt from:', clientIp)
        return createErrorResponse('Unauthorized: Emergency release requires service role key', 401, corsHeaders)
      }
      console.log('🚨 Authorized emergency release request from:', clientIp)
    }
    
    // ALWAYS use service role key to bypass RLS for DMS processing
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration (URL or SERVICE_ROLE_KEY)')
    }

    console.log('🔑 Using service role key for DMS processing (bypasses RLS)')
    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date().toISOString()
    
    if (forceRelease) {
      console.log(`🚨 EMERGENCY RELEASE MODE - Forcing immediate release of ALL DMS messages`)
    } else {
      console.log(`📧 Processing scheduled messages and DMS cycles due before ${now}`)
    }

    // ========== STEP 1: Process DMS (Guardian Angel) Overdue Cycles ==========
    console.log('🛡️ Checking for overdue Guardian Angel cycles...')
    
    const { data: dmsConfigs, error: dmsConfigError } = await supabase
      .from('dms_configs')
      .select('*')
      .eq('status', 'ACTIVE')
    
    if (dmsConfigError) {
      console.error('Error fetching DMS configs:', dmsConfigError)
    } else {
      console.log(`Found ${dmsConfigs?.length || 0} active DMS configs`)
      
      for (const config of dmsConfigs || []) {
        // Get the current cycle for this config
        const { data: cycles, error: cyclesError } = await supabase
          .from('dms_cycles')
          .select('*')
          .eq('configId', config.id)
          .order('nextCheckinAt', { ascending: false })
          .limit(1)
        
        if (cyclesError || !cycles || cycles.length === 0) {
          console.log(`No cycle found for config ${config.id}`)
          continue
        }
        
        const cycle = cycles[0]
        const nextCheckin = new Date(cycle.nextCheckinAt)
        const currentTime = new Date()
        
        // Calculate grace deadline based on unit
        let graceMs = 0
        switch (config.graceUnit) {
          case 'minutes':
            graceMs = config.graceDays * 60 * 1000
            break
          case 'hours':
            graceMs = config.graceDays * 60 * 60 * 1000
            break
          case 'days':
          default:
            graceMs = config.graceDays * 24 * 60 * 60 * 1000
            break
        }
        
        const graceDeadline = new Date(nextCheckin.getTime() + graceMs)
        
        console.log(`DMS Config ${config.id}: Next check-in ${nextCheckin.toISOString()}, Grace deadline ${graceDeadline.toISOString()}, Current ${currentTime.toISOString()}`)
        
        // Check if we should release: either past deadline OR emergency release
        const shouldRelease = (forceRelease && cycle.state !== 'PENDING_RELEASE') || 
                             (currentTime > graceDeadline && cycle.state !== 'PENDING_RELEASE')
        
        if (shouldRelease) {
          if (forceRelease) {
            console.log(`🚨 EMERGENCY RELEASE: Forcing immediate release for config ${config.id}`)
            
            // Audit log for emergency release
            await logAudit({
              supabase,
              userId: config.userId,
              action: 'DMS_EMERGENCY_RELEASE',
              resourceType: 'dms_config',
              resourceId: config.id,
              metadata: { configId: config.id, cycleId: cycle.id },
              ipAddress: clientIp,
              userAgent: userAgent,
              status: 'SUCCESS',
            })
          } else {
            console.log(`🚨 DMS ${config.id} is OVERDUE! Releasing protected messages...`)
            
            // Audit log for automatic overdue release
            await logAudit({
              supabase,
              userId: config.userId,
              action: 'DMS_OVERDUE_RELEASE',
              resourceType: 'dms_config',
              resourceId: config.id,
              metadata: { 
                configId: config.id, 
                cycleId: cycle.id,
                graceDeadline: graceDeadline.toISOString(),
                currentTime: currentTime.toISOString(),
              },
              ipAddress: clientIp,
              userAgent: userAgent,
              status: 'SUCCESS',
            })
          }
          
          // Update cycle state to PENDING_RELEASE
          await supabase
            .from('dms_cycles')
            .update({ state: 'PENDING_RELEASE', updatedAt: now })
            .eq('id', cycle.id)
          
          // Find all DMS messages for this user and update them to SCHEDULED
          const { data: dmsMessages, error: dmsMessagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('userId', config.userId)
            .eq('scope', 'DMS')
            .eq('status', 'DRAFT')
          
          if (dmsMessagesError) {
            console.error(`Error fetching DMS messages for user ${config.userId}:`, dmsMessagesError)
          } else {
            console.log(`Found ${dmsMessages?.length || 0} DMS messages to release`)
            
            for (const dmsMsg of dmsMessages || []) {
              const { error: updateError } = await supabase
                .from('messages')
                .update({
                  status: 'SCHEDULED',
                  scheduledFor: now,
                  updatedAt: now
                })
                .eq('id', dmsMsg.id)
              
              if (updateError) {
                console.error(`Error scheduling DMS message ${dmsMsg.id}:`, updateError)
              } else {
                console.log(`✅ DMS message "${dmsMsg.title}" scheduled for immediate sending`)
              }
            }
            
            // Deactivate the DMS config after releasing all messages
            if (dmsMessages && dmsMessages.length > 0) {
              console.log(`🛑 Deactivating Guardian Angel config ${config.id} after releasing ${dmsMessages.length} message(s)`)
              await supabase
                .from('dms_configs')
                .update({
                  status: 'INACTIVE',
                  updatedAt: now
                })
                .eq('id', config.id)
              
              console.log(`✅ Guardian Angel deactivated - messages have been sent`)
            }
          }
        }
      }
    }

    // ========== STEP 2: Process Regular Scheduled Messages ==========
    console.log('📧 Processing regular scheduled messages...')
    
    // Get all scheduled messages that are due (bypasses RLS with service role)
    const { data: scheduledMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('status', 'SCHEDULED')
      .lte('scheduledFor', now)

    if (messagesError) {
      console.error('Error fetching scheduled messages:', messagesError)
      throw messagesError
    }

    console.log(`Found ${scheduledMessages?.length || 0} scheduled messages to process`)

    let processedCount = 0
    let errorCount = 0

    // Process each scheduled message
    for (const message of scheduledMessages || []) {
      try {
        console.log(`Processing message: ${message.title} (${message.id})`)

        // Get recipients for this message
        const { data: recipients, error: recipientsError } = await supabase
          .from('recipients')
          .select('*')
          .in('id', message.recipientIds || [])

        if (recipientsError) {
          console.error(`Error fetching recipients for message ${message.id}:`, recipientsError)
          continue
        }

        // Send email to each recipient
        for (const recipient of recipients || []) {
          try {
            // Process email content with placeholders
            const processedContent = message.content
              .replace(/\[Name\]/g, recipient.name || recipient.email)
              .replace(/\[Recipient Name\]/g, recipient.name || recipient.email)
              .replace(/\[Your Name\]/g, 'Legacy Scheduler')

            const processedSubject = message.title
              .replace(/\[Name\]/g, recipient.name || recipient.email)
              .replace(/\[Recipient Name\]/g, recipient.name || recipient.email)
              .replace(/\[Your Name\]/g, 'Legacy Scheduler')

            // Prepare attachments
            const attachments = []
            
            // Add audio attachment if present
            if (message.audioRecording) {
              attachments.push({
                filename: 'audio-message.mp3',
                content: `Audio recording: ${message.audioRecording}`,
                contentType: 'text/plain'
              })
            }

            // Call send-email function
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messageId: message.id,
                recipientEmail: recipient.email,
                recipientName: recipient.name || recipient.email,
                subject: processedSubject,
                content: processedContent,
                messageType: message.types?.[0] || 'EMAIL',
                attachments: attachments
              })
            })

            if (emailResponse.ok) {
              console.log(`✅ Email sent to ${recipient.email}`)
            } else {
              console.error(`❌ Failed to send email to ${recipient.email}`)
              errorCount++
            }

          } catch (emailError) {
            console.error(`Error sending email to ${recipient.email}:`, emailError)
            errorCount++
          }
        }

        // Update message status to SENT
        const { error: updateError } = await supabase
          .from('messages')
          .update({
            status: 'SENT',
            updatedAt: new Date().toISOString()
          })
          .eq('id', message.id)

        if (updateError) {
          console.error(`Error updating message status for ${message.id}:`, updateError)
        } else {
          console.log(`✅ Message ${message.id} marked as SENT`)
          processedCount++
        }

      } catch (messageError) {
        console.error(`Error processing message ${message.id}:`, messageError)
        errorCount++

        // Mark message as FAILED
        await supabase
          .from('messages')
          .update({
            status: 'FAILED',
            updatedAt: new Date().toISOString()
          })
          .eq('id', message.id)
      }
    }

    // Return summary
    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        errors: errorCount,
        total: scheduledMessages?.length || 0,
        timestamp: now
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Scheduled message processing error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
