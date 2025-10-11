import { supabase } from './supabase';

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveredAt?: string;
  status?: 'PENDING' | 'DELIVERED' | 'BOUNCED' | 'OPENED' | 'FAILED';
  bounceReason?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded or URL
  contentType: string;
}

export interface SendEmailRequest {
  messageId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  content: string;
  messageType: 'EMAIL' | 'VIDEO' | 'VOICE' | 'FILE';
  attachments?: EmailAttachment[];
  senderName?: string;
  backgroundColor?: string;
}

export class EmailService {
  private static convertQuillClassesToInlineStyles(html: string): string {
    console.log('🔧 Converting Quill classes to inline styles...');
    console.log('📝 Original HTML:', html);
    
    // Convert Quill alignment classes to inline styles
    html = html.replace(/class="([^"]*ql-align-center[^"]*)"/g, (match, classes) => {
      const otherClasses = classes.replace(/ql-align-center/g, '').trim();
      return otherClasses ? `class="${otherClasses}" style="text-align: center !important;"` : 'style="text-align: center !important;"';
    });
    
    // Also handle cases where class might be the only attribute
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

    console.log('✅ Quill classes converted to inline styles');
    console.log('📝 Converted HTML:', html);
    return html;
  }

  static async updateDeliveryStatus(messageId: string, recipientId: string, status: {
    status: 'PENDING' | 'DELIVERED' | 'BOUNCED' | 'OPENED' | 'FAILED';
    deliveredAt?: Date;
    bouncedAt?: Date;
    openedAt?: Date;
    errorMessage?: string;
  }) {
    // This would typically update the database, but for local mode we'll update localStorage
    try {
      const user = JSON.parse(localStorage.getItem('legacyScheduler_user') || '{}');
      if (!user.id) return;
      
      const stored = localStorage.getItem(`messages_${user.id}`);
      if (!stored) return;
      
      const messages = JSON.parse(stored);
      const messageIndex = messages.findIndex((m: any) => m.id === messageId);
      
      if (messageIndex !== -1) {
        if (!messages[messageIndex].deliveryStatus) {
          messages[messageIndex].deliveryStatus = {};
        }
        
        messages[messageIndex].deliveryStatus[recipientId] = {
          ...messages[messageIndex].deliveryStatus[recipientId],
          ...status,
          deliveredAt: status.deliveredAt?.toISOString(),
          bouncedAt: status.bouncedAt?.toISOString(),
          openedAt: status.openedAt?.toISOString(),
        };
        
        localStorage.setItem(`messages_${user.id}`, JSON.stringify(messages));
      }
    } catch (error) {
      console.error('Error updating delivery status:', error);
    }
  }

  private static async processAttachments(request: SendEmailRequest): Promise<SendEmailRequest> {
    if (!request.attachments || request.attachments.length === 0) {
      return request;
    }

    const processedAttachments: EmailAttachment[] = [];

    for (const attachment of request.attachments) {
      try {
        // If content is a URL, fetch the file and convert to base64
        if (attachment.content.startsWith('http')) {
          console.log('Fetching attachment from URL:', attachment.content);
          const response = await fetch(attachment.content);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            processedAttachments.push({
              ...attachment,
              content: base64
            });
          } else {
            console.warn('Failed to fetch attachment:', attachment.content);
            // Keep original content as fallback
            processedAttachments.push(attachment);
          }
        } else {
          // Content is already base64 or text
          processedAttachments.push(attachment);
        }
      } catch (error) {
        console.error('Error processing attachment:', attachment.filename, error);
        // Keep original content as fallback
        processedAttachments.push(attachment);
      }
    }

    return {
      ...request,
      attachments: processedAttachments
    };
  }

  private static async callEdgeFunction(functionName: string, payload: any): Promise<any> {
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const url = `${supabaseUrl}/functions/v1/${functionName}`;
    console.log('🔗 Calling edge function:', url);
    console.log('📦 Payload:', { ...payload, content: '[REDACTED]' });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin,
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Edge function error response:', errorText);
        throw new Error(`Edge function error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Edge function result:', result);
      return result;
    } catch (error) {
      console.error('❌ Edge function call failed:', error);
      console.error('❌ Error type:', error instanceof TypeError ? 'TypeError' : typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  static async sendEmail(request: SendEmailRequest): Promise<EmailDeliveryResult> {
    try {
      console.log('Sending email via edge function:', request);
      
      // Get site name from localStorage (same as useAdmin hook)
      let siteName = 'Rembr'; // default
      try {
        const stored = localStorage.getItem('legacyScheduler_siteSettings');
        if (stored) {
          const parsedSettings = JSON.parse(stored);
          siteName = parsedSettings.siteName || 'Rembr';
        }
      } catch (error) {
        console.warn('Could not load site settings, using default:', error);
      }

      // Process content to replace placeholders
      console.log('📝 STEP 1 - Original content from request:', request.content);
      console.log('📝 STEP 1 - Content length:', request.content.length);
      console.log('📝 STEP 1 - Contains HTML tags:', /<[^>]*>/g.test(request.content));
      
      let processedContent = request.content
        .replace(/\[Name\]/g, request.recipientName)
        .replace(/\[Recipient Name\]/g, request.recipientName)
        .replace(/\[Your Name\]/g, siteName)
        .replace(/\{\{siteName\}\}/g, siteName)
        .replace(/\{\{recipientName\}\}/g, request.recipientName);
        
      console.log('📝 STEP 2 - After variable replacement:', processedContent);

      // Convert Quill classes to inline styles for email compatibility
      console.log('🔧 Before Quill conversion:', processedContent);
      processedContent = this.convertQuillClassesToInlineStyles(processedContent);
      console.log('🔧 After Quill conversion:', processedContent);

      // Always wrap content with background color and container (default to white if not provided)
      const bgColor = request.backgroundColor || '#ffffff';
      console.log('🎨 STEP 3 - Background color (with default):', bgColor);
      console.log('🎨 STEP 3 - Background color type:', typeof bgColor);
      
      // Ensure content has HTML tags - wrap plain text if needed
      let htmlContent = processedContent;
      const hasHtmlTags = /<[^>]*>/g.test(processedContent);
      console.log('📝 STEP 4 - Has HTML tags:', hasHtmlTags);
      
      if (!hasHtmlTags) {
        console.log('📝 STEP 4 - Plain text detected, wrapping in <p> tags');
        htmlContent = `<p>${processedContent.replace(/\n/g, '</p><p>')}</p>`;
        console.log('📝 STEP 4 - Wrapped HTML:', htmlContent);
      } else {
        console.log('📝 STEP 4 - Already has HTML tags, using as-is');
      }
      
      const isHtmlContent = true; // Always treat as HTML now
      console.log('📧 STEP 5 - Processing as HTML content');
      if (isHtmlContent) {
          processedContent = `
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
      
      console.log('📧 STEP 6 - Final processed content length:', processedContent.length);
      console.log('📧 STEP 6 - Final content preview:', processedContent.substring(0, 200) + '...');

      const processedSubject = request.subject
        .replace(/\[Name\]/g, request.recipientName)
        .replace(/\[Recipient Name\]/g, request.recipientName)
        .replace(/\[Your Name\]/g, siteName)
        .replace(/\{\{siteName\}\}/g, siteName)
        .replace(/\{\{recipientName\}\}/g, request.recipientName);

      // Create request with processed content
      const contentProcessedRequest = {
        ...request,
        // Include senderName from siteSettings if available, else derive
        senderName: request.senderName || (() => {
          try {
            const user = JSON.parse(localStorage.getItem('legacyScheduler_user') || '{}');
            const siteSettings = JSON.parse(localStorage.getItem('legacyScheduler_siteSettings') || '{}');
            if (siteSettings?.email_from_display) return siteSettings.email_from_display;
            return user?.profile?.name || user?.name || (user?.email ? String(user.email).split('@')[0] : undefined);
          } catch {
            return undefined;
          }
        })(),
        // SECURITY: Include userId for recipient validation
        userId: (() => {
          try {
            const user = JSON.parse(localStorage.getItem('legacyScheduler_user') || '{}');
            return user?.id;
          } catch {
            return undefined;
          }
        })(),
        subject: processedSubject,
        content: processedContent
      };
      
      // Process attachments to fetch file content from URLs
      const processedRequest = await this.processAttachments(contentProcessedRequest);
      
      // Optional override: force using development sender for testing scheduled emails
      const forceDev = (import.meta as any).env?.VITE_FORCE_DEV_EMAIL === 'true';
      if (forceDev) {
        return await this.sendEmailDirect(processedRequest);
      }
      
      const result = await this.callEdgeFunction('send-email', processedRequest);
      
      // Update delivery status to pending
      if (result.success && result.messageId) {
        await this.updateDeliveryStatus(request.messageId, request.recipientEmail, {
          status: 'PENDING',
        });
      }
      
      console.log('Email delivery result:', result);
      return result;
    } catch (error) {
      console.error('Email service error:', error);
      
      // Check if the error is specifically about missing RESEND_API_KEY
      const isConfigError = error instanceof Error && 
        (error.message.includes('RESEND_API_KEY environment variable not set') ||
         error.message.includes('RESEND_API_KEY') ||
         error.message.includes('configuration'));
      
      if (isConfigError) {
        // Configuration error - don't try fallback, show clear error
        return {
          success: false,
          error: 'Missing email API key on server. Please set RESEND_API_KEY in Supabase edge functions.',
        };
      }
      
      // Check if we have a development fallback URL configured
      const devResendUrl = (import.meta as any).env?.VITE_DEV_RESEND_URL;
      
      // If edge function fails for other reasons and we have a dev fallback, try it
      if (error instanceof Error && (
        error.message.includes('Edge function error') || 
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError')
      )) {
        if (devResendUrl) {
          console.log('Edge function failed, trying development fallback...');
          return await this.sendEmailDirect(request);
        } else {
          // No fallback configured, return clear error
          return {
            success: false,
            error: 'Email service unavailable. Please configure RESEND_API_KEY in Supabase edge functions.',
          };
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error',
      };
    }
  }

  private static async sendEmailDirect(request: SendEmailRequest): Promise<EmailDeliveryResult> {
    try {
      const devResendUrl = (import.meta as any).env?.VITE_DEV_RESEND_URL;
      
      if (!devResendUrl) {
        throw new Error('Development Resend URL not configured');
      }

      console.log('Sending email via development API:', {
        recipient: request.recipientEmail,
        subject: request.subject,
        hasAttachments: Array.isArray(request.attachments) && request.attachments.length > 0,
        url: devResendUrl
      });

      // Use configured development API endpoint
      const response = await fetch(devResendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail: request.recipientEmail,
          recipientName: request.recipientName,
          subject: request.subject,
          content: request.content,
          attachments: request.attachments || [],
        }),
      });

      console.log('Development API response status:', response.status);
      console.log('Development API response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Development API error response:', errorData);
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Email sent successfully via development API:', result);
      
      // Update delivery status
      await this.updateDeliveryStatus(request.messageId, request.recipientEmail, {
        status: 'PENDING',
      });

      return {
        success: true,
        messageId: result.messageId,
        deliveredAt: result.deliveredAt,
      };
    } catch (error) {
      console.error('Development API email sending error:', error);
      console.error('Error type:', typeof error);
      console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async sendBulkEmails(requests: SendEmailRequest[]): Promise<EmailDeliveryResult[]> {
    const results: EmailDeliveryResult[] = [];
    
    // Send emails sequentially to avoid rate limiting
    for (const request of requests) {
      try {
        const result = await this.sendEmail(request);
        results.push(result);
        
        // Add small delay between emails to be respectful to the email service
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send email',
        });
      }
    }
    
    return results;
  }

  static validateEmailConfiguration(): { isValid: boolean; missingKeys: string[] } {
    const requiredKeys = ['RESEND_API_KEY'];
    const missingKeys: string[] = [];

    for (const key of requiredKeys) {
      const envObj: any = (import.meta as any).env || {};
      const value = key === 'RESEND_API_KEY' ? 
        envObj.VITE_RESEND_API_KEY || (typeof process !== 'undefined' ? (process as any).env?.RESEND_API_KEY : undefined) :
        envObj[key];
      if (!value || value.includes('placeholder')) {
        missingKeys.push(key);
      }
    }

    return {
      isValid: missingKeys.length === 0,
      missingKeys,
    };
  }
}