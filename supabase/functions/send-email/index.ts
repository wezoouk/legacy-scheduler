// Supabase Edge Function: send-email
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get RESEND_API_KEY from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'RESEND_API_KEY environment variable not set'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // Get RESEND_FROM from environment (optional). Fallback to Resend test sender.
    const resendFrom = Deno.env.get('RESEND_FROM') || 'Legacy Scheduler <onboarding@resend.dev>'
    // Get REPLY_TO from environment (optional). Fallback to noreply@sugarbox.uk
    const replyTo = Deno.env.get('RESEND_REPLY_TO') || 'noreply@sugarbox.uk'

    // Parse request body
    const { 
      messageId, 
      recipientEmail, 
      recipientName, 
      subject, 
      content, 
      messageType,
      attachments 
    } = await req.json()

    // Validate required fields
    if (!recipientEmail || !subject || !content) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: recipientEmail, subject, content'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Normalize HTML: if plain text, convert newlines to <br>
    const htmlContent = /<[^>]*>/g.test(content)
      ? content
      : content.replace(/\n/g, '<br>')

    // Prepare email payload for Resend
    const emailPayload = {
      from: resendFrom,
      to: [recipientEmail],
      subject: subject,
      html: htmlContent,
      reply_to: replyTo,
      // Add attachments if provided
      ...(attachments && attachments.length > 0 && {
        attachments: attachments.map((att: any) => ({
          filename: att.filename,
          content: att.content,
          content_type: att.contentType,
        }))
      })
    }

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text()
      return new Response(
        JSON.stringify({
          success: false,
          error: `Resend API error: ${resendResponse.status} - ${errorData}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const resendResult = await resendResponse.json()

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        messageId: resendResult.id,
        deliveredAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Email sending error:', error)
    
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