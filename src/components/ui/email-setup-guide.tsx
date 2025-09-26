import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmailService } from "@/lib/email-service";
import { Mail, ExternalLink, CheckCircle, AlertTriangle, Copy } from "lucide-react";
import { useState } from "react";

export function EmailSetupGuide() {
  const [copied, setCopied] = useState(false);
  
  const { isValid, missingKeys } = EmailService.validateEmailConfiguration();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isValid) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Email service is configured and ready to send messages.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <CardHeader>
        <CardTitle className="flex items-center text-orange-800 dark:text-orange-200">
          <Mail className="h-5 w-5 mr-2" />
          Email Setup Required
        </CardTitle>
        <CardDescription className="text-orange-700 dark:text-orange-300">
          Configure email delivery to send your scheduled messages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Missing environment variables: {missingKeys.join(', ')}
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">Setup Steps:</h4>
            <ol className="space-y-2 text-sm text-orange-700 dark:text-orange-300 list-decimal list-inside">
              <li>
                Create a free account at{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto text-orange-700 dark:text-orange-300 underline"
                  onClick={() => window.open('https://resend.com/signup', '_blank')}
                >
                  Resend.com
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </li>
              <li>
                Go to your{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto text-orange-700 dark:text-orange-300 underline"
                  onClick={() => window.open('https://resend.com/api-keys', '_blank')}
                >
                  API Keys page
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
                {' '}and create a new API key
              </li>
              <li>Add the API key to your environment variables (see below)</li>
              <li>Restart your development server</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-orange-800">Environment Variable:</h4>
            <div className="bg-orange-100 p-3 rounded-md border border-orange-200">
              <div className="flex items-center justify-between">
                <code className="text-sm">RESEND_API_KEY=re_your_api_key_here</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard('RESEND_API_KEY=re_your_api_key_here')}
                >
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-orange-600">
              Add this to your .env file and replace with your actual Resend API key
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-orange-800">Benefits of Email Setup:</h4>
            <ul className="space-y-1 text-sm text-orange-700 list-disc list-inside">
              <li>Send actual emails to recipients</li>
              <li>Rich HTML formatting for messages</li>
              <li>Professional delivery with tracking</li>
              <li>Support for attachments and media</li>
              <li>Reliable delivery infrastructure</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}