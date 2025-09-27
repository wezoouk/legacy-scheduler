// Supabase Edge Function: process-scheduled-messages
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as b64encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"

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

async function fetch_to_base64(url: string): Promise<{ base64: string; content_type: string; filename: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const content_type = res.headers.get('content-type') || 'application/octet-stream'
  const buf = new Uint8Array(await res.arrayBuffer())
  const base64 = b64encode(buf)
  const filename = url.split('/').pop()?.split('?')[0] || 'file'
  return { base64, content_type, filename }
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
            let processedContent = message.content
              .replace(/\[Name\]/g, recipient.name || recipient.email)
              .replace(/\[Recipient Name\]/g, recipient.name || recipient.email)
              .replace(/\[Your Name\]/g, 'Legacy Scheduler')

            const processedSubject = message.title
              .replace(/\[Name\]/g, recipient.name || recipient.email)
              .replace(/\[Recipient Name\]/g, recipient.name || recipient.email)
              .replace(/\[Your Name\]/g, 'Legacy Scheduler')

            // Generate viewer links for media
            const appBaseUrl = Deno.env.get('APP_URL') || Deno.env.get('PUBLIC_APP_URL') || ''
            const mediaUrlToViewer: Record<string, string> = {}

            // Helper to create a link row and map viewer URL
            const createViewerLink = async (
              link_type: 'VIDEO' | 'VOICE' | 'FILE',
              target_url: string,
              thumbnail_url?: string
            ) => {
              if (!target_url || !/^https?:\/\//i.test(target_url)) return
              try {
                const token = crypto.randomUUID()
                const { error: linkErr } = await supabase
                  .from('message_links')
                  .insert({
                    message_id: message.id,
                    recipient_id: recipient.id,
                    link_type,
                    target_url,
                    thumbnail_url: thumbnail_url || null,
                    view_token: token
                  })
                if (linkErr) {
                  console.warn('Failed to insert message_link:', linkErr)
                  return
                }
                const viewerUrl = appBaseUrl ? `${appBaseUrl}/view?token=${token}` : target_url
                mediaUrlToViewer[target_url] = viewerUrl
              } catch (e) {
                console.warn('createViewerLink failed:', e)
              }
            }

            // Video link
            const videoUrl = message.cipherBlobUrl || message.videoRecording
            if (videoUrl) {
              await createViewerLink('VIDEO', videoUrl, message.thumbnailUrl || undefined)
            }

            // Audio link (only if URL; data URIs will be attached below instead)
            if (message.audioRecording && /^https?:\/\//i.test(message.audioRecording)) {
              await createViewerLink('VOICE', message.audioRecording)
            }

            // File links from attachments metadata
            let filesMetaForLinks: any[] = []
            try {
              if (typeof message.attachments === 'string') {
                filesMetaForLinks = JSON.parse(message.attachments)
              } else if (Array.isArray(message.attachments)) {
                filesMetaForLinks = message.attachments
              }
            } catch (_) {
              filesMetaForLinks = []
            }
            for (const f of filesMetaForLinks) {
              if (f?.url) {
                await createViewerLink('FILE', f.url)
              }
            }

            // Rewrite content URLs to viewer URLs when available
            if (Object.keys(mediaUrlToViewer).length > 0) {
              for (const [originalUrl, viewerUrl] of Object.entries(mediaUrlToViewer)) {
                processedContent = processedContent.split(originalUrl).join(viewerUrl)
              }
            }

            // If video exists and no viewer link in content, append CTA
            if (videoUrl) {
              const viewerForVideo = mediaUrlToViewer[videoUrl]
              if (viewerForVideo && !processedContent.includes(viewerForVideo)) {
                processedContent += `\n\n<a href="${viewerForVideo}" target="_blank" rel="noopener noreferrer">🎬 Watch the video in your secure viewer</a>`
              }
            }

            // Prepare attachments (small audio/files only). Videos remain as links.
            const attachments: Array<{ filename: string; content: string; contentType?: string }> = []
            
            // Audio attachment
            if (message.audioRecording) {
              try {
                if (message.audioRecording.startsWith('data:')) {
                  const header = message.audioRecording.slice(5, message.audioRecording.indexOf(','))
                  const base64 = message.audioRecording.split(',')[1] || ''
                  const ct = header.split(';')[0] || 'audio/mpeg'
                  attachments.push({
                    filename: 'audio-message' + (ct.includes('webm') ? '.webm' : ct.includes('wav') ? '.wav' : '.mp3'),
                    content: base64,
                    contentType: ct
                  })
                } else if (/^https?:\/\//i.test(message.audioRecording)) {
                  const { base64, content_type, filename } = await fetch_to_base64(message.audioRecording)
                  attachments.push({
                    filename: filename || 'audio-message',
                    content: base64,
                    contentType: content_type
                  })
                }
              } catch (e) {
                console.warn('Skipping audio attachment, fetch/parse failed:', e)
              }
            }

            // File attachments (from metadata with url)
            let filesMeta: any[] = []
            try {
              if (typeof message.attachments === 'string') {
                filesMeta = JSON.parse(message.attachments)
              } else if (Array.isArray(message.attachments)) {
                filesMeta = message.attachments
              }
            } catch (_) {
              filesMeta = []
            }

            for (const f of filesMeta) {
              if (!f?.url) continue
              try {
                const { base64, content_type } = await fetch_to_base64(f.url)
                // Optional size guard could be added here if needed
                attachments.push({
                  filename: f.name || 'attachment',
                  content: base64,
                  contentType: f.type || content_type || 'application/octet-stream'
                })
              } catch (e) {
                console.warn('Skipping file attachment (fetch failed):', f?.name, e)
              }
            }

            // Call send-email function
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                // Use the same key chosen above (service role in prod, anon in test)
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
              const errorText = await emailResponse.text()
              console.error(`❌ Failed to send email to ${recipient.email} [${emailResponse.status}]: ${errorText}`)
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
