// Supabase Edge Function: process-scheduled-messages
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth header to determine which key to use
    const authHeader = req.headers.get('Authorization')
    const isServiceRole = authHeader?.includes('Bearer ') && Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    // Create Supabase client with service role key (bypasses RLS) OR anon key for testing
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    let supabaseKey: string
    
    if (isServiceRole) {
      // Production: Use service role key (from cron jobs)
      supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      console.log('Using service role key (production mode)')
    } else {
      // Testing: Use anon key (from admin panel)
      supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
      console.log('Using anon key (testing mode)')
    }
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date().toISOString()
    console.log(`📧 Processing scheduled messages due before ${now}`)

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
                'Authorization': `Bearer ${supabaseServiceKey}`,
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
