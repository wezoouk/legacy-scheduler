import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { VideoViewerModal } from '@/components/ui/video-viewer-modal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function VideoViewerPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  
  const videoUrl = searchParams.get('video');
  const senderName = searchParams.get('sender') || 'Rembr';
  const messageTitle = searchParams.get('title') || 'Video Message';
  const messageContent = searchParams.get('content') || '';
  const recipientName = searchParams.get('recipient') || 'Recipient';
  const sentAt = searchParams.get('sentAt') ? new Date(searchParams.get('sentAt')!) : new Date();

  useEffect(() => {
    if (videoUrl) {
      // Auto-open the modal when the page loads
      setShowModal(true);
    }
  }, [videoUrl]);

  if (!videoUrl) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Video Not Found</h1>
            <p className="text-gray-600 mb-6">
              The video link appears to be invalid or missing.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{messageTitle}</h1>
              <p className="text-sm text-gray-600">Video Message from {senderName}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(videoUrl, '_blank')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Video
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4">
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">📹 Video Message</h2>
              <p className="text-gray-600">
                Click the button below to view the video message with full context
              </p>
            </div>
            
            <div className="text-center">
              <Button
                size="lg"
                onClick={() => setShowModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-semibold"
              >
                🎬 View Video Message
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Message Preview */}
        {messageContent && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Preview</h3>
              <div 
                className="prose max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: messageContent }}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Video Modal */}
      <VideoViewerModal
        open={showModal}
        onOpenChange={setShowModal}
        videoUrl={videoUrl}
        senderName={senderName}
        messageTitle={messageTitle}
        messageContent={messageContent}
        recipientName={recipientName}
        sentAt={sentAt}
      />
    </div>
  );
}
