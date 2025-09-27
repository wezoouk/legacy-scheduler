import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Download, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface MediaFile {
  name: string;
  id: string;
  updated_at: string;
  metadata: {
    size: number;
    mimetype: string;
  };
  publicUrl: string;
}

interface MediaGalleryProps {
  onSelectMedia?: (url: string, type: 'video' | 'audio' | 'image') => void;
  showSelectButton?: boolean;
}

export function MediaGallery({ onSelectMedia, showSelectButton = false }: MediaGalleryProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMediaFiles();
  }, []);

  const loadMediaFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      // List all files in the media bucket
      const { data, error } = await supabase.storage
        .from('media')
        .list('uploads', {
          limit: 100,
          offset: 0,
        });

      if (error) {
        throw error;
      }

      // Get public URLs for each file
      const filesWithUrls = await Promise.all(
        data.map(async (file) => {
          const { data: urlData } = supabase.storage
            .from('media')
            .getPublicUrl(`uploads/${file.name}`);

          return {
            ...file,
            publicUrl: urlData.publicUrl,
          };
        })
      );

      setMediaFiles(filesWithUrls);
    } catch (err) {
      console.error('Error loading media files:', err);
      setError(err instanceof Error ? err.message : 'Failed to load media files');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMediaFile = async (fileName: string) => {
    try {
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      const { error } = await supabase.storage
        .from('media')
        .remove([`uploads/${fileName}`]);

      if (error) {
        throw error;
      }

      // Remove from local state
      setMediaFiles(prev => prev.filter(file => file.name !== fileName));
    } catch (err) {
      console.error('Error deleting media file:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  const getMediaType = (mimetype: string): 'video' | 'audio' | 'image' => {
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.startsWith('image/')) return 'image';
    return 'image'; // fallback
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Media Gallery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading media files...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Media Gallery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            Error: {error}
            <Button onClick={loadMediaFiles} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Files
          <Button onClick={loadMediaFiles} variant="outline" size="sm">
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {mediaFiles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No media files found. Record some videos or audio to see them here.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {mediaFiles.map((file) => {
              const mediaType = getMediaType(file.metadata.mimetype);
              return (
                <Card key={file.id} className="relative">
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">
                          {mediaType.toUpperCase()}
                        </Badge>
                        <div className="flex gap-1">
                          {showSelectButton && onSelectMedia && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onSelectMedia(file.publicUrl, mediaType)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteMediaFile(file.name)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-xs font-medium truncate" title={file.name}>
                        {file.name}
                      </div>
                      
                      <div className="text-[11px] text-gray-500">
                        {formatFileSize(file.metadata.size)}
                      </div>
                      
                      <div className="text-[11px] text-gray-500">
                        {formatDate(file.updated_at)}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(file.publicUrl, '_blank')}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = file.publicUrl;
                            link.download = file.name;
                            link.click();
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
