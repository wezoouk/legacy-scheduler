// Diagnostic component to check media URLs in messages
import React, { useState, useEffect } from 'react';
import { useMessages } from '@/lib/use-messages';

export function MediaDiagnostic() {
  const { messages } = useMessages();
  const [diagnostics, setDiagnostics] = useState<any[]>([]);

  useEffect(() => {
    const results = messages.map(message => {
      const videoUrl = message.cipherBlobUrl || message.videoRecording;
      const audioUrl = message.audioRecording;
      
      return {
        id: message.id,
        title: message.title,
        types: message.types,
        status: message.status,
        hasVideo: !!videoUrl,
        hasAudio: !!audioUrl,
        videoUrl: videoUrl,
        audioUrl: audioUrl,
        videoUrlType: typeof videoUrl,
        audioUrlType: typeof audioUrl,
        videoUrlLength: videoUrl ? videoUrl.length : 0,
        audioUrlLength: audioUrl ? audioUrl.length : 0,
        isVideoDataUrl: videoUrl ? videoUrl.startsWith('data:') : false,
        isAudioDataUrl: audioUrl ? audioUrl.startsWith('data:') : false,
        isVideoHttpUrl: videoUrl ? videoUrl.startsWith('http') : false,
        isAudioHttpUrl: audioUrl ? audioUrl.startsWith('http') : false,
        videoUrlPreview: videoUrl ? videoUrl.substring(0, 100) + '...' : 'None',
        audioUrlPreview: audioUrl ? audioUrl.substring(0, 100) + '...' : 'None',
      };
    });
    
    setDiagnostics(results);
  }, [messages]);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Media Diagnostic Report</h3>
      <p className="text-sm text-gray-600 mb-4">
        Found {diagnostics.length} messages. {diagnostics.filter(d => d.hasVideo || d.hasAudio).length} have media.
      </p>
      
      <div className="space-y-4">
        {diagnostics.map(diagnostic => (
          <div key={diagnostic.id} className="bg-white p-4 rounded border">
            <h4 className="font-medium">{diagnostic.title}</h4>
            <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
              <div>
                <p><strong>Types:</strong> {JSON.stringify(diagnostic.types)}</p>
                <p><strong>Status:</strong> {diagnostic.status}</p>
              </div>
              <div>
                <p><strong>Has Video:</strong> {diagnostic.hasVideo ? 'Yes' : 'No'}</p>
                <p><strong>Has Audio:</strong> {diagnostic.hasAudio ? 'Yes' : 'No'}</p>
              </div>
            </div>
            
            {diagnostic.hasVideo && (
              <div className="mt-2 p-2 bg-blue-50 rounded">
                <p><strong>Video URL Type:</strong> {diagnostic.videoUrlType}</p>
                <p><strong>Video URL Length:</strong> {diagnostic.videoUrlLength}</p>
                <p><strong>Is Data URL:</strong> {diagnostic.isVideoDataUrl ? 'Yes' : 'No'}</p>
                <p><strong>Is HTTP URL:</strong> {diagnostic.isVideoHttpUrl ? 'Yes' : 'No'}</p>
                <p><strong>Video URL Preview:</strong> {diagnostic.videoUrlPreview}</p>
              </div>
            )}
            
            {diagnostic.hasAudio && (
              <div className="mt-2 p-2 bg-green-50 rounded">
                <p><strong>Audio URL Type:</strong> {diagnostic.audioUrlType}</p>
                <p><strong>Audio URL Length:</strong> {diagnostic.audioUrlLength}</p>
                <p><strong>Is Data URL:</strong> {diagnostic.isAudioDataUrl ? 'Yes' : 'No'}</p>
                <p><strong>Is HTTP URL:</strong> {diagnostic.isAudioHttpUrl ? 'Yes' : 'No'}</p>
                <p><strong>Audio URL Preview:</strong> {diagnostic.audioUrlPreview}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

