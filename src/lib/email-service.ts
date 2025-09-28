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
}

export class EmailService {
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

    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge function error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  static async sendEmail(request: SendEmailRequest): Promise<EmailDeliveryResult> {
    try {
      console.log('Sending email via edge function:', request);
      
      // Process content to replace placeholders
      const processedContent = request.content
        .replace(/\[Name\]/g, request.recipientName)
        .replace(/\[Recipient Name\]/g, request.recipientName)
        .replace(/\[Your Name\]/g, 'Rembr');

      const processedSubject = request.subject
        .replace(/\[Name\]/g, request.recipientName)
        .replace(/\[Recipient Name\]/g, request.recipientName)
        .replace(/\[Your Name\]/g, 'Rembr');

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