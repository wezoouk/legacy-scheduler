export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { recipientEmail, recipientName, subject, content, attachments } = req.body;

    // Validate required fields
    if (!recipientEmail || !subject || !content) {
      return res.status(400).json({ 
        error: 'Missing required fields: recipientEmail, subject, content' 
      });
    }

    // Get Resend API key from environment
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return res.status(500).json({ 
        error: 'Resend API key not configured' 
      });
    }

    // Prepare email content
    let emailContent = content;
    
    // Add attachments info to content if present
    if (attachments && attachments.length > 0) {
      emailContent += '\n\n--- Attachments ---\n';
      attachments.forEach(attachment => {
        emailContent += `\n📎 ${attachment.filename} (${attachment.contentType})\n`;
      });
      emailContent += '\nNote: Media files are stored securely and can be accessed through the Legacy Scheduler platform.';
    }

    // Prepare email data for Resend API
    const emailData = {
      from: 'Legacy Scheduler <onboarding@resend.dev>',
      reply_to: process.env.REPLY_TO_EMAIL || 'noreply@sugarbox.uk',
      to: [recipientEmail],
      subject: subject,
      html: emailContent.replace(/\n/g, '<br>'),
      attachments: attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        type: att.contentType,
      })) || []
    };

    console.log('Sending email via Resend API:', {
      recipient: recipientEmail,
      subject: subject,
      hasAttachments: attachments?.length > 0
    });

    // Send email via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend API error:', errorText);
      return res.status(response.status).json({ 
        error: `Resend API error: ${response.status} - ${errorText}` 
      });
    }

    const result = await response.json();
    console.log('Email sent successfully:', result.id);

    // Return success response
    res.status(200).json({
      success: true,
      messageId: result.id,
      deliveredAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to send email' 
    });
  }
}



