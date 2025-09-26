import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Mic, Square, Play, Pause, Trash2, Upload } from 'lucide-react';
import { useMessages } from '@/lib/use-messages';
import { MediaService } from '@/lib/media-service';

interface DashboardRecordingProps {
  className?: string;
}

export function DashboardRecording({ className }: DashboardRecordingProps) {
  const { createMessage } = useMessages();
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [videoRecording, setVideoRecording] = useState<Blob | null>(null);
  const [audioRecording, setAudioRecording] = useState<Blob | null>(null);
  const [videoURL, setVideoURL] = useState<string>('');
  const [audioURL, setAudioURL] = useState<string>('');
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Clean up URLs when component unmounts
  useEffect(() => {
    return () => {
      if (videoURL) URL.revokeObjectURL(videoURL);
      if (audioURL) URL.revokeObjectURL(audioURL);
    };
  }, [videoURL, audioURL]);

  // Update video URL when recording changes
  useEffect(() => {
    if (videoRecording) {
      const url = URL.createObjectURL(videoRecording);
      setVideoURL(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [videoRecording]);

  // Update audio URL when recording changes
  useEffect(() => {
    if (audioRecording) {
      const url = URL.createObjectURL(audioRecording);
      setAudioURL(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioRecording]);

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setVideoStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setVideoRecording(blob);
        stream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecordingVideo(true);
    } catch (err) {
      console.error('Error starting video recording:', err);
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioRecording(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecordingAudio(true);
    } catch (err) {
      console.error('Error starting audio recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecordingVideo(false);
      setIsRecordingAudio(false);
    }
  };

  const playVideo = () => {
    if (videoRef.current) {
      if (isPlayingVideo) {
        videoRef.current.pause();
        setIsPlayingVideo(false);
      } else {
        videoRef.current.play();
        setIsPlayingVideo(true);
      }
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current.play();
        setIsPlayingAudio(true);
      }
    }
  };

  const deleteVideo = () => {
    setVideoRecording(null);
    setVideoURL('');
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const deleteAudio = () => {
    setAudioRecording(null);
    setAudioURL('');
  };

  const saveAsMessage = async (type: 'video' | 'audio') => {
    try {
      console.log('=== DASHBOARD RECORDING saveAsMessage ===');
      console.log('Type:', type);
      console.log('Video recording exists:', !!videoRecording);
      console.log('Audio recording exists:', !!audioRecording);
      
      const recording = type === 'video' ? videoRecording : audioRecording;
      if (!recording) {
        console.log('No recording found for type:', type);
        return;
      }

      // Upload to Supabase Storage - NO localStorage fallback
      let mediaUrl: string;
      if (type === 'video') {
        const videoResult = await MediaService.uploadVideo(recording, 'video.webm');
        mediaUrl = videoResult.url;
        console.log('Video uploaded to Supabase Storage:', videoResult.url);
      } else {
        const audioResult = await MediaService.uploadAudio(recording, 'audio.webm');
        mediaUrl = audioResult.url;
        console.log('Audio uploaded to Supabase Storage:', audioResult.url);
      }

      const messageData = {
        title: `${type === 'video' ? 'Video' : 'Audio'} Recording - ${new Date().toLocaleString()}`,
        content: `Quick ${type} recording from dashboard`,
        types: [type === 'video' ? 'VIDEO' : 'VOICE'],
        recipients: [], // Will need to be set later
        status: 'DRAFT' as const,
        cipherBlobUrl: mediaUrl, // Use Supabase Storage URL
        thumbnailUrl: type === 'video' ? mediaUrl : undefined,
      };

      console.log('Dashboard recording message data:', messageData);
      await createMessage(messageData);
      
      // Clear the recording after saving
      if (type === 'video') {
        deleteVideo();
      } else {
        deleteAudio();
      }
      
      // Show success message
      alert(`${type === 'video' ? 'Video' : 'Audio'} recording saved successfully!`);
    } catch (error) {
      console.error('Error saving recording as message:', error);
      // Show error to user
      alert(`Failed to save ${type} recording: ${error.message}\n\nPlease check your Supabase configuration.`);
      throw error; // Re-throw to show error to user
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Video Recording */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Recording
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Video Preview */}
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full max-w-md bg-black rounded border"
              controls={!isRecordingVideo}
              muted={isRecordingVideo}
              onEnded={() => setIsPlayingVideo(false)}
            />
            {videoURL && !isRecordingVideo && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  onClick={playVideo}
                  size="lg"
                  className="rounded-full w-16 h-16 bg-white/20 hover:bg-white/30"
                >
                  {isPlayingVideo ? (
                    <Pause className="h-8 w-8 text-white" />
                  ) : (
                    <Play className="h-8 w-8 text-white" />
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Video Controls */}
          <div className="flex gap-2">
            {!isRecordingVideo ? (
              <Button onClick={startVideoRecording} disabled={isRecordingAudio}>
                <Video className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            ) : (
              <Button onClick={stopRecording} variant="destructive">
                <Square className="h-4 w-4 mr-2" />
                Stop Recording
              </Button>
            )}
            
            {videoRecording && (
              <>
                <Button onClick={playVideo} variant="outline">
                  {isPlayingVideo ? (
                    <Pause className="h-4 w-4 mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {isPlayingVideo ? 'Pause' : 'Play'}
                </Button>
                <Button onClick={() => saveAsMessage('video')} variant="default">
                  <Upload className="h-4 w-4 mr-2" />
                  Save as Message
                </Button>
                <Button onClick={deleteVideo} variant="outline">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audio Recording */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Audio Recording
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Audio Preview */}
          {audioURL && (
            <div className="flex items-center gap-4">
              <audio
                ref={audioRef}
                src={audioURL}
                controls
                onEnded={() => setIsPlayingAudio(false)}
                className="flex-1"
              />
            </div>
          )}

          {/* Audio Controls */}
          <div className="flex gap-2">
            {!isRecordingAudio ? (
              <Button onClick={startAudioRecording} disabled={isRecordingVideo}>
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            ) : (
              <Button onClick={stopRecording} variant="destructive">
                <Square className="h-4 w-4 mr-2" />
                Stop Recording
              </Button>
            )}
            
            {audioRecording && (
              <>
                <Button onClick={playAudio} variant="outline">
                  {isPlayingAudio ? (
                    <Pause className="h-4 w-4 mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {isPlayingAudio ? 'Pause' : 'Play'}
                </Button>
                <Button onClick={() => saveAsMessage('audio')} variant="default">
                  <Upload className="h-4 w-4 mr-2" />
                  Save as Message
                </Button>
                <Button onClick={deleteAudio} variant="outline">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
