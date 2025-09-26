import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Download, ExternalLink, Calendar, User, Mail, Clock } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";

interface VideoPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: any;
}

export function VideoPreviewDialog({ 
  open, 
  onOpenChange, 
  message
}: VideoPreviewDialogProps) {
  console.log('VideoPreviewDialog rendered with:', { open, message });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoUrl = message?.cipherBlobUrl || message?.videoRecording;
  console.log('VideoPreviewDialog videoUrl:', videoUrl);

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      const handleTimeUpdate = () => setCurrentTime(video.currentTime);
      const handleDurationChange = () => setDuration(video.duration);
      const handleLoadedMetadata = () => setDuration(video.duration);
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => setIsPlaying(false);
      const handleError = (e: any) => {
        console.error('Video error:', e);
        console.error('Video URL:', videoUrl);
        console.error('Video src:', video.src);
      };
      const handleLoadStart = () => {
        console.log('Video load started:', videoUrl);
      };
      const handleCanPlay = () => {
        console.log('Video can play:', videoUrl);
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('durationchange', handleDurationChange);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('ended', handleEnded);
      video.addEventListener('error', handleError);
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('canplay', handleCanPlay);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('durationchange', handleDurationChange);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('ended', handleEnded);
        video.removeEventListener('error', handleError);
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('canplay', handleCanPlay);
      };
    }
  }, [videoUrl]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentTime(0);
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    }
  }, [open]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const seekTime = parseFloat(e.target.value);
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const downloadVideo = () => {
    if (videoUrl) {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `video-message-${message.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const openInNewTab = () => {
    if (videoUrl) {
      window.open(videoUrl, '_blank');
    }
  };

  if (!videoUrl) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Play className="w-5 h-5 mr-2" />
              Video Message Preview
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center">
            <div className="text-red-600 mb-4">
              <Play className="w-12 h-12 mx-auto mb-2" />
              <p className="text-lg font-medium">No Video Found</p>
            </div>
            <p className="text-gray-600 mb-4">
              This message doesn't have a video attachment or the video URL is invalid.
            </p>
            <div className="bg-gray-100 p-3 rounded text-sm text-left">
              <p><strong>Message:</strong> {message?.title || 'Unknown'}</p>
              <p><strong>Message ID:</strong> {message?.id || 'Unknown'}</p>
              <p><strong>Message Types:</strong> {JSON.stringify(message?.types) || 'Unknown'}</p>
              <p><strong>Video URL:</strong> {videoUrl || 'Not available'}</p>
              <p><strong>cipherBlobUrl:</strong> {message?.cipherBlobUrl ? `${message.cipherBlobUrl.substring(0, 50)}...` : 'Not available'}</p>
              <p><strong>videoRecording:</strong> {message?.videoRecording ? `${message.videoRecording.substring(0, 50)}...` : 'Not available'}</p>
              <p><strong>cipherBlobUrl Type:</strong> {typeof message?.cipherBlobUrl}</p>
              <p><strong>videoRecording Type:</strong> {typeof message?.videoRecording}</p>
              <p><strong>cipherBlobUrl Length:</strong> {message?.cipherBlobUrl?.length || 0}</p>
              <p><strong>videoRecording Length:</strong> {message?.videoRecording?.length || 0}</p>
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Play className="w-5 h-5 mr-2" />
            Video Message Preview
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[70vh]">
          {/* Video Player */}
          <div className="flex-1 bg-black rounded-lg overflow-hidden relative group">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              poster=""
              preload="metadata"
            />
            
            {/* Video Controls Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center cursor-pointer" onClick={togglePlayPause}>
              {/* Play button - show when not playing */}
              {!isPlaying && (
                <div className="bg-white bg-opacity-90 hover:bg-opacity-100 text-black rounded-full w-20 h-20 flex items-center justify-center shadow-lg transition-all duration-200">
                  <Play className="w-10 h-10 ml-1" />
                </div>
              )}
              
              {/* Pause button - show only when playing and hovering */}
              {isPlaying && (
                <div className="bg-white bg-opacity-0 group-hover:bg-opacity-90 hover:bg-opacity-100 text-white group-hover:text-black rounded-full w-20 h-20 flex items-center justify-center shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100">
                  <Pause className="w-10 h-10" />
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="space-y-2">
                {/* Progress Bar */}
                <div className="flex items-center space-x-2">
                  <span className="text-white text-sm font-mono">
                    {formatTime(currentTime)}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: duration > 0 ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)` : '#4b5563'
                    }}
                  />
                  <span className="text-white text-sm font-mono">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white hover:bg-opacity-20"
                      onClick={togglePlayPause}
                    >
                      {isPlaying ? '⏸️' : '▶️'}
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white hover:bg-opacity-20"
                      onClick={downloadVideo}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white hover:bg-opacity-20"
                      onClick={openInNewTab}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Open
                    </Button>
                  </div>
                </div>
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
