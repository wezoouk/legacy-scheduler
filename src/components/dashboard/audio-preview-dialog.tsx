import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Download, ExternalLink, Calendar, User, Mail, Clock, Volume2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";

interface AudioPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: any;
}

export function AudioPreviewDialog({ 
  open, 
  onOpenChange, 
  message
}: AudioPreviewDialogProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const audioUrl = message?.audioRecording || message?.cipherBlobUrl;
  console.log('AudioPreviewDialog audioUrl:', audioUrl);

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
      const handleDurationChange = () => setDuration(audio.duration);
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => setIsPlaying(false);

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('durationchange', handleDurationChange);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('durationchange', handleDurationChange);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, []);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const seekTime = parseFloat(e.target.value);
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const downloadAudio = () => {
    if (audioUrl) {
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = `audio-message-${message.id}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const openInNewTab = () => {
    if (audioUrl) {
      window.open(audioUrl, '_blank');
    }
  };

  if (!audioUrl) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Volume2 className="w-5 h-5 mr-2" />
              Audio Message Preview
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center">
            <div className="text-red-600 mb-4">
              <Volume2 className="w-12 h-12 mx-auto mb-2" />
              <p className="text-lg font-medium">No Audio Found</p>
            </div>
            <p className="text-gray-600 mb-4">
              This message doesn't have an audio attachment or the audio URL is invalid.
            </p>
            <div className="bg-gray-100 p-3 rounded text-sm text-left">
              <p><strong>Message:</strong> {message?.title || 'Unknown'}</p>
              <p><strong>Message ID:</strong> {message?.id || 'Unknown'}</p>
              <p><strong>Message Types:</strong> {JSON.stringify(message?.types) || 'Unknown'}</p>
              <p><strong>Audio URL:</strong> {audioUrl || 'Not available'}</p>
              <p><strong>audioRecording:</strong> {message?.audioRecording ? `${message.audioRecording.substring(0, 50)}...` : 'Not available'}</p>
              <p><strong>cipherBlobUrl:</strong> {message?.cipherBlobUrl ? `${message.cipherBlobUrl.substring(0, 50)}...` : 'Not available'}</p>
              <p><strong>audioRecording Type:</strong> {typeof message?.audioRecording}</p>
              <p><strong>cipherBlobUrl Type:</strong> {typeof message?.cipherBlobUrl}</p>
              <p><strong>audioRecording Length:</strong> {message?.audioRecording?.length || 0}</p>
              <p><strong>cipherBlobUrl Length:</strong> {message?.cipherBlobUrl?.length || 0}</p>
            </div>
            <Button onClick={() => onOpenChange(false)} className="mt-4">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Volume2 className="w-5 h-5 mr-2" />
            Audio Message Preview
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[60vh]">
          {/* Audio Player */}
          <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-6 flex flex-col items-center justify-center">
            <audio
              ref={audioRef}
              src={audioUrl}
              preload="metadata"
            />
            
            {/* Audio Visualizer */}
            <div className="mb-8">
              <div className="w-32 h-32 bg-white rounded-full shadow-lg flex items-center justify-center mb-4">
                <Volume2 className="w-16 h-16 text-blue-600" />
              </div>
            </div>

            {/* Audio Controls */}
            <div className="w-full max-w-md space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-mono text-gray-600">
                    {formatTime(currentTime)}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #d1d5db ${(currentTime / duration) * 100}%, #d1d5db 100%)`
                    }}
                  />
                  <span className="text-sm font-mono text-gray-600">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-center space-x-4">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-16 h-16"
                  onClick={togglePlayPause}
                >
                  {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadAudio}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openInNewTab}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open
                </Button>
              </div>
            </div>
          </div>

          {/* Message Details */}
          <div className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{message.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-gray-600">{message.content}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-700">Created:</span>
                      <span className="text-gray-600">
                        {format(new Date(message.createdAt), 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>
                    
                    {message.scheduledFor && (
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-700">Scheduled:</span>
                        <span className="text-gray-600">
                          {format(new Date(message.scheduledFor), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                    )}
                    
                    {message.sentAt && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-700">Sent:</span>
                        <span className="text-green-600">
                          {format(new Date(message.sentAt), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-700">Status:</span>
                      <Badge className={`text-xs ${
                        message.status === 'SENT' ? 'bg-green-100 text-green-800' :
                        message.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                        message.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {message.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-700">Recipients:</span>
                      <span className="text-gray-600">
                        {message.recipientIds?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
