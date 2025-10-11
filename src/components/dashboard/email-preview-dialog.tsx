import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VideoViewerModal } from "@/components/ui/video-viewer-modal";
import { Eye, Mail, Smartphone, Monitor, Copy, ExternalLink } from "lucide-react";
import React, { useState } from "react";
import { useAdmin } from "@/lib/use-admin";

interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  content: string;
  recipientName?: string;
  senderName?: string;
  message?: any; // Full message object for attachments
  backgroundColor?: string; // Background color for email styling
}

export function EmailPreviewDialog({ 
  open, 
  onOpenChange, 
  subject, 
  content, 
  recipientName = "[Recipient Name]",
  senderName = "[Your Name]",
  message,
  backgroundColor = '#f8f9fa'
}: EmailPreviewDialogProps) {
  const { siteSettings } = useAdmin();
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showRawHtml, setShowRawHtml] = useState(false);
  const [showVideoViewer, setShowVideoViewer] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>('');

  // Process content to replace placeholders
  const processedContent = content
    .replace(/\[Name\]/g, recipientName)
    .replace(/\[Recipient Name\]/g, recipientName)
    .replace(/\[Your Name\]/g, senderName);

  const processedSubject = subject
    .replace(/\[Name\]/g, recipientName)
    .replace(/\[Recipient Name\]/g, recipientName)
    .replace(/\[Your Name\]/g, senderName);

  // Check if content is already HTML or plain text
  const isHtmlContent = /<[^>]*>/g.test(content);

  // Helper function to get file icon based on file type
  const getFileIcon = (fileType: string): string => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📈';
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) return '🗜️';
    if (fileType.includes('text')) return '📃';
    return '📎';
  };

  // Generate attachment HTML
  const generateAttachmentHtml = () => {
    if (!message) return '';
    
    let attachmentHtml = '';
    
    // Video attachment - embedded player (only when message type includes VIDEO)
    const hasVideoType = Array.isArray(message.types) && message.types.includes('VIDEO');
    if (hasVideoType && (message.videoRecording || (message.cipherBlobUrl && /\.(mp4|webm|mov)(\?|$)/i.test(message.cipherBlobUrl)))) {
      const videoUrl = message.cipherBlobUrl || message.videoRecording;
      attachmentHtml += `
        <div style="margin: 20px 0; padding: 16px; background: #f3f4f6; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <h4 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">📹 Video Message</h4>
          <div style="margin: 12px 0;">
            <video controls style="width: 100%; max-width: 400px; border-radius: 8px;" preload="metadata">
              <source src="${videoUrl}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
          </div>
          <div style="margin: 12px 0; padding: 12px; background: #ffffff; border-radius: 6px; border: 1px solid #d1d5db;">
            <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px; font-weight: 500;">📺 Watch Video Online</p>
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">Choose how you'd like to view the video:</p>
            <div style="display: flex; gap: 8px; margin: 8px 0;">
              <button onclick="window.parent.postMessage({type: 'openVideoViewer', videoUrl: '${videoUrl}'}, '*');" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                🎬 View in Modal
              </button>
              <a href="${videoUrl}" style="background: #6b7280; color: white; text-decoration: none; padding: 6px 12px; border-radius: 4px; font-size: 12px;" target="_blank">
                🔗 Open in New Tab
              </a>
            </div>
            <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">Modal view shows sender info and message context.</p>
          </div>
        </div>
      `;
    }
    
    // Audio attachment
    if (message.audioRecording) {
      attachmentHtml += `
        <div style="margin: 20px 0; padding: 16px; background: #f3f4f6; border-radius: 8px; border-left: 4px solid #10b981;">
          <h4 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">🎵 Audio Message</h4>
          <audio controls style="width: 100%;">
            <source src="${message.audioRecording}" type="audio/mpeg">
            Your browser does not support the audio tag.
          </audio>
          <div style="margin: 12px 0; padding: 12px; background: #ffffff; border-radius: 6px; border: 1px solid #d1d5db;">
            <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px; font-weight: 500;">🎧 Listen to Audio Online</p>
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">Click the link below to play the audio message:</p>
            <a href="${message.audioRecording}" style="color: #10b981; text-decoration: underline; font-size: 14px; font-weight: 500;" target="_blank">
              ▶️ Play Audio Message
            </a>
            <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">If the audio doesn't play above, click the link to open it in your browser.</p>
          </div>
        </div>
      `;
    }
    
    // File attachments with thumbnails
    if (message.attachments && message.attachments.length > 0) {
      attachmentHtml += `
        <div style="margin: 20px 0; padding: 16px; background: #f3f4f6; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <h4 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">📎 Attachments</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin: 0;">
            ${message.attachments.map((file: any) => {
              const isImage = file.type && file.type.startsWith('image/');
              const fileSize = file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown size';
              
              if (isImage && file.url) {
                return `
                  <div style="border: 1px solid #d1d5db; border-radius: 8px; padding: 8px; background: white; text-align: center; cursor: pointer; transition: all 0.2s ease;" onclick="window.open('${file.url}', '_blank')">
                    <img src="${file.url}" alt="${file.name}" style="width: 100%; max-width: 150px; height: 100px; object-fit: cover; border-radius: 4px; margin-bottom: 8px; transition: transform 0.2s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" />
                    <div style="font-size: 12px; color: #374151; word-break: break-word;">
                      <div style="font-weight: 500; margin-bottom: 2px;">${file.name}</div>
                      <div style="color: #6b7280;">${fileSize} • Click to view</div>
                    </div>
                  </div>
                `;
              } else {
                // Non-image file or image without URL
                const fileIcon = getFileIcon(file.type || '');
                const clickable = file.url ? `cursor: pointer; transition: all 0.2s ease;" onclick="window.open('${file.url}', '_blank')"` : '';
                return `
                  <div style="border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; background: white; text-align: center; ${clickable}">
                    <div style="font-size: 24px; margin-bottom: 8px;">${fileIcon}</div>
                    <div style="font-size: 12px; color: #374151; word-break: break-word;">
                      <div style="font-weight: 500; margin-bottom: 2px;">${file.name}</div>
                      <div style="color: #6b7280;">${fileSize}${file.url ? ' • Click to open' : ''}</div>
                    </div>
                  </div>
                `;
              }
            }).join('')}
          </div>
        </div>
      `;
    }
    
    return attachmentHtml;
  };

  // Convert Quill classes to inline styles for email compatibility
  const convertQuillClassesToInlineStyles = (html: string) => {
    let convertedHtml = html;
    
    // Convert alignment classes
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-align-center[^"]*)"/gi, (match, classes) => {
      return `style="text-align: center !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-align-right[^"]*)"/gi, (match, classes) => {
      return `style="text-align: right !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-align-left[^"]*)"/gi, (match, classes) => {
      return `style="text-align: left !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-align-justify[^"]*)"/gi, (match, classes) => {
      return `style="text-align: justify !important;" class="${classes}"`;
    });
    
    // Convert size classes
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-size-small[^"]*)"/gi, (match, classes) => {
      return `style="font-size: 0.75em !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-size-large[^"]*)"/gi, (match, classes) => {
      return `style="font-size: 1.5em !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-size-huge[^"]*)"/gi, (match, classes) => {
      return `style="font-size: 2.5em !important;" class="${classes}"`;
    });
    
    // Convert color classes
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-color-white[^"]*)"/gi, (match, classes) => {
      return `style="color: white !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-color-red[^"]*)"/gi, (match, classes) => {
      return `style="color: #e60000 !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-color-orange[^"]*)"/gi, (match, classes) => {
      return `style="color: #f90 !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-color-yellow[^"]*)"/gi, (match, classes) => {
      return `style="color: #ff0 !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-color-green[^"]*)"/gi, (match, classes) => {
      return `style="color: #008a00 !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-color-blue[^"]*)"/gi, (match, classes) => {
      return `style="color: #06c !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-color-purple[^"]*)"/gi, (match, classes) => {
      return `style="color: #93f !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-color-black[^"]*)"/gi, (match, classes) => {
      return `style="color: #000 !important;" class="${classes}"`;
    });
    
    // Convert background color classes
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-bg-white[^"]*)"/gi, (match, classes) => {
      return `style="background-color: white !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-bg-red[^"]*)"/gi, (match, classes) => {
      return `style="background-color: #e60000 !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-bg-orange[^"]*)"/gi, (match, classes) => {
      return `style="background-color: #f90 !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-bg-yellow[^"]*)"/gi, (match, classes) => {
      return `style="background-color: #ff0 !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-bg-green[^"]*)"/gi, (match, classes) => {
      return `style="background-color: #008a00 !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-bg-blue[^"]*)"/gi, (match, classes) => {
      return `style="background-color: #06c !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-bg-purple[^"]*)"/gi, (match, classes) => {
      return `style="background-color: #93f !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-bg-black[^"]*)"/gi, (match, classes) => {
      return `style="background-color: #000 !important;" class="${classes}"`;
    });
    
    // Convert formatting classes
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-bold[^"]*)"/gi, (match, classes) => {
      return `style="font-weight: bold !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-italic[^"]*)"/gi, (match, classes) => {
      return `style="font-style: italic !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-underline[^"]*)"/gi, (match, classes) => {
      return `style="text-decoration: underline !important;" class="${classes}"`;
    });
    convertedHtml = convertedHtml.replace(/class="([^"]*ql-strike[^"]*)"/gi, (match, classes) => {
      return `style="text-decoration: line-through !important;" class="${classes}"`;
    });
    
    return convertedHtml;
  };

  // Create email HTML with proper structure
    const emailHtml = isHtmlContent 
      ? `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb !important; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
          <tr>
            <td style="padding: 20px !important;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${backgroundColor} !important; border-radius: 12px !important; overflow: hidden !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                <tr>
                  <td style="padding: 20px !important;">
                    ${convertQuillClassesToInlineStyles(processedContent)}${generateAttachmentHtml()}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `
      : `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb !important; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;">
        <tr>
          <td style="padding: 20px !important; text-align: center !important;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px !important; margin: 0 auto !important; background-color: ${backgroundColor} !important; border: 1px solid #e5e7eb !important; border-radius: 12px !important; overflow: hidden !important;">
              <tr>
                <td style="padding: 32px !important;">
                  <h1 style="color: #1f2937 !important; font-size: 24px !important; font-weight: bold !important; margin-bottom: 16px !important;">${processedSubject}</h1>
                  <div style="color: #374151 !important; font-size: 16px !important; line-height: 1.6 !important;">
                    ${processedContent.replace(/\n/g, '<br>')}
                  </div>
                  ${generateAttachmentHtml()}
                </td>
              </tr>
              <tr>
                <td style="background-color: #f9fafb !important; padding: 16px !important; text-align: center !important; border-top: 1px solid #e5e7eb !important;">
                  <p style="font-size: 12px !important; color: #6b7280 !important; margin: 0 !important;">
                    This message was sent through ${siteSettings.siteName}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(emailHtml);
    alert('Email HTML copied to clipboard!');
  };

  const openInNewWindow = () => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Preview - ${processedSubject}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 20px; background: #f3f4f6; font-family: Arial, sans-serif; }
            .email-container { max-width: 600px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="email-container">
            ${emailHtml}
          </div>
        </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  // Handle video viewer requests from iframe
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message:', event.data);
      if (event.data.type === 'openVideoViewer') {
        console.log('Opening video viewer for:', event.data.videoUrl);
        setSelectedVideoUrl(event.data.videoUrl);
        setShowVideoViewer(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Email Preview
              <Badge variant="outline" className="ml-2">
                {previewMode === 'mobile' ? 'Mobile' : 'Desktop'}
              </Badge>
            </DialogTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant={previewMode === 'desktop' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('desktop')}
              >
                <Monitor className="w-3 h-3 mr-1" />
                Desktop
              </Button>
              <Button
                variant={previewMode === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('mobile')}
              >
                <Smartphone className="w-3 h-3 mr-1" />
                Mobile
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Email Header */}
          <div className="bg-gray-50 border rounded-t-lg p-4 border-b-0 flex-shrink-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Email Preview</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRawHtml(!showRawHtml)}
                  >
                    {showRawHtml ? 'Show Preview' : 'Show HTML'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                    <Copy className="w-3 h-3 mr-1" />
                    Copy HTML
                  </Button>
                  <Button variant="ghost" size="sm" onClick={openInNewWindow}>
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Open in New Tab
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">From:</span>
                  <div className="text-gray-600">{siteSettings.siteName} &lt;noreply@legacyscheduler.com&gt;</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">To:</span>
                  <div className="text-gray-600">{recipientName} &lt;recipient@example.com&gt;</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Subject:</span>
                  <div className="text-gray-600">{processedSubject}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Email Content */}
          <div className="flex-1 bg-white border-x border-b rounded-b-lg overflow-hidden min-h-0">
            {showRawHtml ? (
              <div className="h-full overflow-y-auto p-4">
                <pre className="text-xs bg-gray-50 p-4 rounded border overflow-x-auto">
                  <code>{emailHtml}</code>
                </pre>
              </div>
            ) : (
              <div className="h-full overflow-y-auto bg-gray-100 p-4 min-h-0">
                <div 
                  className={`mx-auto bg-white shadow-lg rounded-lg overflow-hidden ${
                    previewMode === 'mobile' ? 'max-w-xs' : 'max-w-4xl'
                  }`}
                  style={{ height: '70vh' }}
                >
                  <iframe
                    className="w-full border-0"
                    style={{ height: '70vh' }}
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Email Preview</title>
                        <style>
                          body { 
                            margin: 0; 
                            padding: 10px; 
                            background: #f9fafb; 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            overflow-y: auto;
                            overflow-x: hidden;
                            height: 100%;
                          }
                          .email-container {
                            max-width: 100%;
                            margin: 0 auto;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                            word-wrap: break-word;
                            overflow-wrap: break-word;
                          }
                          img {
                            max-width: 100% !important;
                            height: auto !important;
                            max-height: 200px !important;
                            object-fit: contain !important;
                          }
                          h1, h2, h3, h4, h5, h6 {
                            font-size: 1.2em !important;
                            margin: 0.5em 0 !important;
                          }
                          p {
                            margin: 0.5em 0 !important;
                            font-size: 0.9em !important;
                            line-height: 1.4 !important;
                          }
                        </style>
                      </head>
                      <body>
                        <div class="email-container">
                          ${emailHtml}
                        </div>
                      </body>
                      </html>
                    `}
                    title="Email Preview"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {isHtmlContent ? 'Rich HTML Content' : 'Plain Text Content'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {previewMode === 'mobile' ? 'Mobile View' : 'Desktop View'}
            </Badge>
          </div>
          <Button onClick={() => onOpenChange(false)}>
            Close Preview
          </Button>
        </div>
      </DialogContent>

      {/* Video Viewer Modal */}
      <VideoViewerModal
        open={showVideoViewer}
        onOpenChange={setShowVideoViewer}
        videoUrl={selectedVideoUrl}
        senderName={siteSettings.siteName || "Rembr"}
        messageTitle={processedSubject}
        messageContent={processedContent}
        recipientName={recipientName}
      />
    </Dialog>
  );
}