import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import {
  canAdminAccessUserMedia,
  getUserMediaStats,
  logAdminMediaAccess,
  getAdminMediaSettings,
  formatBytes,
  type MediaStats
} from '@/lib/admin-media-access';
import { 
  Video, 
  Music, 
  Image as ImageIcon, 
  FileIcon, 
  Download, 
  Eye, 
  AlertCircle, 
  Shield,
  Clock,
  X
} from 'lucide-react';
import { format } from 'date-fns';

interface AdminMediaViewerProps {
  userId: string;
  userName: string;
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

interface MediaFile {
  name: string;
  path: string;
  size: number;
  created_at: string;
  type: 'video' | 'audio' | 'image' | 'other';
  url?: string;
}

export function AdminMediaViewer({ userId, userName, userEmail, isOpen, onClose, isAdmin }: AdminMediaViewerProps) {
  const [stats, setStats] = useState<MediaStats | null>(null);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canAccess, setCanAccess] = useState(false);
  const [accessReason, setAccessReason] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'video' | 'audio' | 'image' | 'other'>('all');
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, userId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check access permission
      const accessCheck = await canAdminAccessUserMedia(userId, isAdmin);
      setCanAccess(accessCheck.canAccess);
      setAccessReason(accessCheck.reason);

      // Always load stats (admins can always see stats)
      const mediaStats = await getUserMediaStats(userId);
      setStats(mediaStats);

      // Only load files if we have full access
      if (accessCheck.canAccess) {
        await loadUserFiles();
      }
    } catch (err) {
      console.error('Error loading media:', err);
      setError('Failed to load media data');
    } finally {
      setLoading(false);
    }
  };

  const loadUserFiles = async () => {
    if (!supabase) return;

    const allFiles: MediaFile[] = [];
    const folders = ['uploads', 'audio', 'recordings', 'voice'];

    for (const folder of folders) {
      try {
        const { data: files, error } = await supabase.storage
          .from('media')
          .list(`${folder}/${userId}`, {
            limit: 1000,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (error) throw error;

        if (files) {
          for (const file of files) {
            const ext = file.name.toLowerCase();
            let type: 'video' | 'audio' | 'image' | 'other' = 'other';

            if (/\.(mp4|webm|mov|m4v|avi|mkv)$/.test(ext)) {
              type = 'video';
            } else if (/\.(mp3|wav|ogg|m4a|aac)$/.test(ext)) {
              type = 'audio';
            } else if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(ext)) {
              type = 'image';
            }

            const filePath = `${folder}/${userId}/${file.name}`;
            const { data: urlData } = supabase.storage
              .from('media')
              .getPublicUrl(filePath);

            allFiles.push({
              name: file.name,
              path: filePath,
              size: (file.metadata as any)?.size || 0,
              created_at: file.created_at || '',
              type,
              url: urlData?.publicUrl
            });
          }
        }
      } catch (err) {
        console.error(`Error loading ${folder}:`, err);
      }
    }

    setFiles(allFiles);
    
    // Log access
    const settings = getAdminMediaSettings();
    if (settings.logAllAccess) {
      logAdminMediaAccess(userId, 'file');
    }
  };

  const handleDownload = async (file: MediaFile) => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase.storage
        .from('media')
        .download(file.path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log download
      const settings = getAdminMediaSettings();
      if (settings.logAllAccess) {
        logAdminMediaAccess(userId, file.type);
      }
    } catch (err) {
      console.error('Error downloading file:', err);
      alert('Failed to download file');
    }
  };

  const filteredFiles = selectedType === 'all' 
    ? files 
    : files.filter(f => f.type === selectedType);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      default: return <FileIcon className="w-4 h-4" />;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              User Media - {userName}
            </DialogTitle>
            <DialogDescription>
              {userEmail}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-600 dark:text-red-400">{error}</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Access Status Banner */}
              {!canAccess && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Limited Access</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        {accessReason}. You can only view statistics below.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Statistics */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Videos</p>
                        <p className="text-2xl font-bold">{stats.videos.count}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(stats.videos.totalSize)}</p>
                      </div>
                      <Video className="w-8 h-8 text-violet-500" />
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Audio</p>
                        <p className="text-2xl font-bold">{stats.audio.count}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(stats.audio.totalSize)}</p>
                      </div>
                      <Music className="w-8 h-8 text-pink-500" />
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Images</p>
                        <p className="text-2xl font-bold">{stats.images.count}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(stats.images.totalSize)}</p>
                      </div>
                      <ImageIcon className="w-8 h-8 text-blue-500" />
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Other</p>
                        <p className="text-2xl font-bold">{stats.other.count}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(stats.other.totalSize)}</p>
                      </div>
                      <FileIcon className="w-8 h-8 text-gray-500" />
                    </div>
                  </Card>
                </div>
              )}

              {/* Files List (only if access granted) */}
              {canAccess && files.length > 0 && (
                <>
                  {/* Filter Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={selectedType === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedType('all')}
                    >
                      All ({files.length})
                    </Button>
                    <Button
                      variant={selectedType === 'video' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedType('video')}
                    >
                      <Video className="w-4 h-4 mr-1" />
                      Videos ({files.filter(f => f.type === 'video').length})
                    </Button>
                    <Button
                      variant={selectedType === 'audio' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedType('audio')}
                    >
                      <Music className="w-4 h-4 mr-1" />
                      Audio ({files.filter(f => f.type === 'audio').length})
                    </Button>
                    <Button
                      variant={selectedType === 'image' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedType('image')}
                    >
                      <ImageIcon className="w-4 h-4 mr-1" />
                      Images ({files.filter(f => f.type === 'image').length})
                    </Button>
                    <Button
                      variant={selectedType === 'other' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedType('other')}
                    >
                      <FileIcon className="w-4 h-4 mr-1" />
                      Other ({files.filter(f => f.type === 'other').length})
                    </Button>
                  </div>

                  {/* Files Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredFiles.map((file, idx) => (
                      <Card key={idx} className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(file.type)}
                          <Badge variant="secondary" className="text-xs">
                            {file.type}
                          </Badge>
                        </div>
                        <div className="text-sm font-medium truncate" title={file.name}>
                          {file.name}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>{formatBytes(file.size)}</div>
                          {file.created_at && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(file.created_at), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {(file.type === 'image' || file.type === 'video' || file.type === 'audio') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => setPreviewFile(file)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleDownload(file)}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {canAccess && files.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No media files found for this user</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{previewFile.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPreviewFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center bg-black rounded-lg overflow-hidden">
              {previewFile.type === 'image' && (
                <img 
                  src={previewFile.url} 
                  alt={previewFile.name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              )}
              {previewFile.type === 'video' && (
                <video 
                  src={previewFile.url} 
                  controls
                  className="max-w-full max-h-[70vh]"
                />
              )}
              {previewFile.type === 'audio' && (
                <div className="w-full p-8">
                  <audio 
                    src={previewFile.url} 
                    controls
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}



