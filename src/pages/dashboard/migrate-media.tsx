import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { MediaService } from '@/lib/media-service';
import { supabase } from '@/lib/supabase';
import { ArrowRight, CheckCircle, AlertTriangle, Loader2, FileIcon, Video, Music, Image as ImageIcon } from 'lucide-react';

interface LegacyFile {
  name: string;
  path: string;
  url: string;
  type: 'video' | 'audio' | 'image' | 'other';
  size?: number;
}

export function MigrateMediaPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [legacyFiles, setLegacyFiles] = useState<LegacyFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [migrated, setMigrated] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const getFileType = (filename: string): 'video' | 'audio' | 'image' | 'other' => {
    const ext = filename.toLowerCase();
    if (/\.(mp4|webm|mov|m4v|avi|mkv)$/.test(ext)) return 'video';
    if (/\.(mp3|wav|ogg|m4a|aac|webm)$/.test(ext)) return 'audio';
    if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(ext)) return 'image';
    return 'other';
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4 text-violet-400" />;
      case 'audio': return <Music className="w-4 h-4 text-violet-400" />;
      case 'image': return <ImageIcon className="w-4 h-4 text-violet-400" />;
      default: return <FileIcon className="w-4 h-4 text-violet-400" />;
    }
  };

  const scanLegacyFiles = async () => {
    if (!user) return;
    
    setScanning(true);
    try {
      // Scan root folders for legacy files
      const rootFolders = ['uploads', 'audio', 'recordings', 'voice'];
      const results = await Promise.all(
        rootFolders.map(folder => 
          MediaService.listFiles(folder).catch(() => [])
        )
      );

      const allFiles: LegacyFile[] = [];
      
      for (const fileList of results) {
        for (const file of fileList as any[]) {
          // Only include root-level files (path has 2 parts: folder/filename)
          const pathParts = file.path.split('/');
          if (pathParts.length === 2) {
            allFiles.push({
              name: file.name,
              path: file.path,
              url: MediaService.getPublicUrl(file.path),
              type: getFileType(file.name),
            });
          }
        }
      }

      setLegacyFiles(allFiles);
      
      // Auto-select all files
      setSelectedFiles(new Set(allFiles.map(f => f.path)));
      
    } catch (error) {
      console.error('Error scanning legacy files:', error);
      alert('Failed to scan legacy files. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const migrateFiles = async () => {
    if (!user || !supabase) {
      alert('Authentication required');
      return;
    }

    if (selectedFiles.size === 0) {
      alert('Please select files to migrate');
      return;
    }

    if (!confirm(`This will migrate ${selectedFiles.size} files to your private folder. The original files will be moved. Continue?`)) {
      return;
    }

    setLoading(true);
    const newMigrated = new Set(migrated);
    const newErrors = new Map(errors);
    
    const filesToMigrate = legacyFiles.filter(f => selectedFiles.has(f.path));
    setProgress({ current: 0, total: filesToMigrate.length });

    for (let i = 0; i < filesToMigrate.length; i++) {
      const file = filesToMigrate[i];
      
      try {
        // Parse the path
        const pathParts = file.path.split('/');
        const folder = pathParts[0]; // uploads, audio, recordings, or voice
        const filename = pathParts[1];
        
        // New path in user-specific folder
        const newPath = `${folder}/${user.id}/${filename}`;
        
        // Use Supabase storage move/copy instead of download/upload
        // First, try to download the file data from Supabase
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('media')
          .download(file.path);

        if (downloadError) {
          throw new Error(`Download failed: ${downloadError.message}`);
        }

        if (!fileData) {
          throw new Error('No file data received');
        }

        // Upload to new location with proper content type
        const contentType = fileData.type || 'application/octet-stream';
        
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(newPath, fileData, {
            cacheControl: '3600',
            upsert: false,
            contentType: contentType
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Delete the old file only after successful upload
        const { error: deleteError } = await supabase.storage
          .from('media')
          .remove([file.path]);

        if (deleteError) {
          console.warn('Failed to delete old file:', deleteError);
          // File was copied successfully, so this is not critical
        }

        newMigrated.add(file.path);
        
      } catch (error) {
        console.error(`Failed to migrate ${file.path}:`, error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        newErrors.set(file.path, errorMsg);
      }

      setProgress({ current: i + 1, total: filesToMigrate.length });
      setMigrated(new Set(newMigrated));
      setErrors(new Map(newErrors));
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setLoading(false);
    
    const successCount = newMigrated.size - migrated.size;
    const failCount = newErrors.size - errors.size;
    
    if (failCount === 0) {
      alert(`✅ Successfully migrated ${successCount} files!\n\nRefresh your dashboard to see them.`);
    } else {
      alert(`⚠️ Migrated ${successCount} files successfully.\n${failCount} files failed.\n\nCheck the error messages below for details.`);
    }
  };

  const toggleFile = (path: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedFiles(newSelected);
  };

  const toggleAll = () => {
    if (selectedFiles.size === legacyFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(legacyFiles.map(f => f.path)));
    }
  };

  useEffect(() => {
    scanLegacyFiles();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Please log in to migrate media.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Migrate Media Files</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Move your old media files from shared folders to your private user-specific folder
          </p>
        </div>

        {/* Info Banner */}
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">Why migrate?</p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Files uploaded before the security update are in shared folders. This migration moves them to your 
                  private folder (<code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">uploads/{user.id}/</code>) 
                  for better security and privacy.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scan Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Legacy Files Found</span>
              <Badge variant="outline">{legacyFiles.length} files</Badge>
            </CardTitle>
            <CardDescription>
              Select the files you want to migrate to your private folder
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scanning ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Scanning for legacy files...</span>
              </div>
            ) : legacyFiles.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-lg font-medium text-gray-900 dark:text-white">All files are up to date!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No legacy files found. All your media is already in your private folder.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Controls */}
                <div className="flex items-center justify-between pb-3 border-b dark:border-gray-800">
                  <Button variant="outline" size="sm" onClick={toggleAll}>
                    {selectedFiles.size === legacyFiles.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedFiles.size} of {legacyFiles.length} selected
                  </span>
                </div>

                {/* File List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {legacyFiles.map(file => {
                    const isSelected = selectedFiles.has(file.path);
                    const isMigrated = migrated.has(file.path);
                    const error = errors.get(file.path);

                    return (
                      <div
                        key={file.path}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-gray-200 dark:border-gray-800'
                        } ${isMigrated ? 'opacity-50' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleFile(file.path)}
                          disabled={isMigrated || loading}
                          className="w-4 h-4"
                        />
                        
                        {getFileIcon(file.type)}
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{file.path}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {file.type}
                          </Badge>
                          
                          {isMigrated && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          
                          {error && (
                            <AlertTriangle className="w-4 h-4 text-red-500" title={error} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Migration Progress */}
                {loading && (
                  <div className="pt-4 border-t dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Migrating files...</span>
                      <span className="text-sm text-muted-foreground">
                        {progress.current} / {progress.total}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Migrate Button */}
                <div className="pt-4 border-t dark:border-gray-800">
                  <Button
                    onClick={migrateFiles}
                    disabled={loading || selectedFiles.size === 0}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Migrating {progress.current}/{progress.total}...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Migrate {selectedFiles.size} Selected File{selectedFiles.size !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Summary */}
        {(migrated.size > 0 || errors.size > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Migration Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <span className="text-sm font-medium text-green-900 dark:text-green-100">
                    Successfully Migrated
                  </span>
                  <Badge className="bg-green-600">{migrated.size}</Badge>
                </div>
                
                {errors.size > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <span className="text-sm font-medium text-red-900 dark:text-red-100">
                      Failed
                    </span>
                    <Badge className="bg-red-600">{errors.size}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

