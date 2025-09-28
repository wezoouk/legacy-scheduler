// Supabase Edge Function: send-email
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get RESEND_API_KEY from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
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
      );
    }

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
      senderName
    } = await req.json();

    console.log('Processing email request:', { recipientEmail, subject });

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
      );
    }

    // Normalize HTML: if plain text, convert newlines to <br>
    const htmlContent = /<[^>]*>/g.test(content)
      ? content
      : content.replace(/\n/g, '<br>');

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

    console.log('Sending email via Resend:', { from: resendFrom, to: recipientEmail });

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
      return new Response(
        JSON.stringify({
          success: false,
          error: `Resend API error: ${resendResponse.status} - ${errorData}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const resendResult = await resendResponse.json();
    console.log('Email sent successfully:', resendResult.id);

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
    );

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