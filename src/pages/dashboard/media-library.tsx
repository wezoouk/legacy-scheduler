import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MediaService } from '@/lib/media-service';
import { useAuth } from '@/lib/auth-context';
import { Image as ImageIcon, Download, Music, File as FileIcon, Video as VideoIcon } from 'lucide-react';

interface MediaFile {
  name: string;
  path: string;
  created_at?: string;
  updated_at?: string;
  userId?: string;
  userName?: string;
}

export function MediaLibraryPage() {
  const { user } = useAuth();
  const [files, setFiles] = React.useState<MediaFile[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const mediaRefs = React.useRef<Map<string, HTMLMediaElement>>(new Map());

  const formatDisplayName = React.useCallback((rawName: string) => {
    // 1) Strip extension
    let name = rawName.replace(/\.[a-z0-9]+$/i, '');
    // 2) Remove leading timestamp/hash prefixes like 1759056786929_ or 2025-09-28_
    name = name.replace(/^(\d{10,}|\d{4}-\d{2}-\d{2}|\d{8})([_-])/i, '');
    // 3) Remove trailing numeric ids like -1695912345678 or _1695912345678
    name = name.replace(/([_-])\d{10,}$/i, '');
    // 4) Replace separators with spaces
    name = name.replace(/[._-]+/g, ' ').trim();
    // 5) Collapse multiple spaces
    name = name.replace(/\s{2,}/g, ' ');
    // 6) Fallback to original if empty
    return name || rawName;
  }, []);

  const setMediaRef = (path: string) => (el: HTMLMediaElement | null) => {
    if (!el) {
      mediaRefs.current.delete(path);
    } else {
      mediaRefs.current.set(path, el);
    }
  };

  const togglePlay = (path: string) => {
    const el = mediaRefs.current.get(path);
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  const initVideoPreview = (path: string) => {
    const el = mediaRefs.current.get(path) as HTMLVideoElement | undefined;
    if (!el) return;
    try {
      // Seek to 1s to avoid black first frame, then pause
      const handleSeeked = () => {
        el.pause();
        el.removeEventListener('seeked', handleSeeked);
      };
      el.addEventListener('seeked', handleSeeked);
      el.currentTime = 1;
    } catch (_) {
      // no-op fallback
    }
  };

  const refresh = React.useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      // List files ONLY from user-specific folders
      const userPrefixes = [
        `uploads/${user.id}`,
        `audio/${user.id}`,
        `recordings/${user.id}`,
        `voice/${user.id}`
      ];
      
      const results: Array<{ name: string; path: string; created_at?: string; updated_at?: string }[]> = await Promise.all(
        userPrefixes.map(async (p) => {
          try { return await MediaService.listFiles(p); } catch { return []; }
        })
      );
      
      const mergedMap = new Map<string, { name: string; path: string; created_at?: string; updated_at?: string; userId?: string }>();
      for (const arr of results) {
        for (const f of arr) {
          // Only include files that are in user-specific folders
          // Path format: "uploads/{userId}/filename.jpg"
          
          const pathParts = f.path.split('/');
          
          // Check if this is a user-specific file
          if (pathParts.length >= 3 && pathParts[1] === user.id) {
            mergedMap.set(f.path, {
              ...f,
              userId: user.id,
              userName: user.name || user.email
            });
          }
          
          // For legacy root files (2 parts like "uploads/file.jpg"),
          // we'll skip them for security - they shouldn't be visible
          // If you want to see your own legacy files, they need to be migrated
        }
      }
      
      setFiles(Array.from(mergedMap.values()));
    } catch (e: any) {
      setError(e?.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => { refresh(); }, [refresh]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setLoading(true);
    try {
      for (const file of Array.from(e.target.files)) {
        await MediaService.uploadAttachment(file);
      }
      await refresh();
      e.target.value = '';
    } catch (err) {
      setError('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (path: string) => {
    setLoading(true);
    try {
      // Use edge function to ensure permission
      try {
        await MediaService.deleteViaFunction(path);
      } catch (_) {
        // fallback to direct delete if function not deployed
        await MediaService.deleteFile(path);
      }
      // Optimistically remove from list for snappier UI
      setFiles((prev) => prev.filter((f) => f.path !== path));
      await refresh();
    } catch (err) {
      setError('Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const onCopy = async (path: string) => {
    const url = MediaService.getPublicUrl(path);
    await navigator.clipboard.writeText(url);
  };

  const inferType = (
    name: string,
    path?: string,
    metadata?: any
  ): 'IMAGE'|'VIDEO'|'AUDIO'|'OTHER' => {
    const n = name.toLowerCase();
    const p = (path || '').toLowerCase();

    // 1) Prefer storage metadata mimetype if available
    const mime: string | undefined = metadata?.mimetype || metadata?.mimeType || metadata?.contentType;
    if (mime) {
      if (mime.startsWith('image/')) return 'IMAGE';
      if (mime.startsWith('audio/')) return 'AUDIO';
      if (mime.startsWith('video/')) return 'VIDEO';
    }

    // 2) Path-based hints: anything under audio/voice/recordings => AUDIO
    if (p.includes('/audio/') || p.includes('/voice/') || p.includes('/recordings/')) return 'AUDIO';

    // 3) Extension-based fallback
    if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(n)) return 'IMAGE';
    if (/\.(mp3|wav|ogg|m4a|aac)$/.test(n)) return 'AUDIO';
    if (/\.(mp4|webm|mov|m4v|avi|mkv)$/.test(n)) return 'VIDEO';
    return 'OTHER';
  };

  type FilterType = 'ALL' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'OTHER'
  type SortType = 'DATE_DESC' | 'DATE_ASC' | 'NAME_ASC' | 'NAME_DESC'

  const [filter, setFilter] = React.useState<FilterType>('ALL')
  const [sortBy, setSortBy] = React.useState<SortType>('DATE_DESC')

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Media Library</h1>
        <div>
          <label className="inline-flex items-center gap-2">
            <Input type="file" multiple onChange={onUpload} className="bg-gray-900 text-white" />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterType)}
          className="bg-gray-900 text-white border border-gray-700 rounded-md px-2 py-1 text-sm"
        >
          <option value="ALL">All</option>
          <option value="IMAGE">Images</option>
          <option value="VIDEO">Videos</option>
          <option value="AUDIO">Audio</option>
          <option value="OTHER">Other</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortType)}
          className="bg-gray-900 text-white border border-gray-700 rounded-md px-2 py-1 text-sm"
        >
          <option value="DATE_DESC">Newest</option>
          <option value="DATE_ASC">Oldest</option>
          <option value="NAME_ASC">Name A–Z</option>
          <option value="NAME_DESC">Name Z–A</option>
        </select>
      </div>

      {error && <div className="text-red-500 mb-3">{error}</div>}
      {loading && <div className="text-gray-400 mb-3">Loading…</div>}

      {/* Group files by type */}
      {(() => {
        const filteredAndSorted = files
          .filter((f) => {
            const tag = inferType(f.name, f.path, (f as any).metadata)
            return filter === 'ALL' ? true : tag === filter
          })
          .sort((a, b) => {
            const ad = (a as any).updated_at || (a as any).created_at || ''
            const bd = (b as any).updated_at || (b as any).created_at || ''
            if (sortBy === 'DATE_DESC') return (bd > ad ? 1 : bd < ad ? -1 : 0)
            if (sortBy === 'DATE_ASC') return (ad > bd ? 1 : ad < bd ? -1 : 0)
            if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name)
            if (sortBy === 'NAME_DESC') return b.name.localeCompare(a.name)
            return 0
          });

        // Group by type
        const videos = filteredAndSorted.filter(f => inferType(f.name, f.path, (f as any).metadata) === 'VIDEO');
        const audios = filteredAndSorted.filter(f => inferType(f.name, f.path, (f as any).metadata) === 'AUDIO');
        const images = filteredAndSorted.filter(f => inferType(f.name, f.path, (f as any).metadata) === 'IMAGE');
        const others = filteredAndSorted.filter(f => inferType(f.name, f.path, (f as any).metadata) === 'OTHER');

        const renderSection = (title: string, items: typeof filteredAndSorted, icon: React.ReactNode) => {
          if (filter !== 'ALL' && items.length === 0) return null;
          
          return (
            <div key={title} className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                {icon}
                <h2 className="text-lg font-semibold text-gray-200">{title}</h2>
                <span className="text-sm text-gray-400">({items.length})</span>
              </div>
              
              {items.length === 0 ? (
                <div className="text-center py-12 bg-gray-900/50 rounded-xl border border-gray-800">
                  <div className="text-gray-400 text-sm">No {title.toLowerCase()} uploaded yet</div>
                  <div className="text-gray-500 text-xs mt-1">Upload files above to get started</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {items.map((f) => {
          const url = MediaService.getPublicUrl(f.path);
          const tag = inferType(f.name, f.path, (f as any).metadata);
          const img = tag === 'IMAGE';
          const vid = tag === 'VIDEO';
          const aud = tag === 'AUDIO';
          return (
            <div key={f.path} className="bg-[#242427] border border-gray-800 rounded-2xl p-3 flex flex-col gap-3">
              <div
                className="relative w-full h-28 rounded-xl overflow-hidden bg-black flex items-center justify-center cursor-pointer"
                onClick={() => (vid || aud) ? togglePlay(f.path) : undefined}
              >
                {img ? (
                  <img src={url} alt={f.name} className="w-full h-full object-cover" />
                ) : vid ? (
                  <video
                    src={url}
                    className="w-full h-full object-cover"
                    controls={false}
                    preload="metadata"
                    muted
                    playsInline
                    ref={setMediaRef(f.path) as any}
                    onLoadedMetadata={() => initVideoPreview(f.path)}
                    onLoadedData={() => initVideoPreview(f.path)}
                  />
                ) : aud ? (
                  <>
                    <Music className="w-10 h-10 text-violet-500" />
                    <audio src={url} ref={setMediaRef(f.path) as any} />
                  </>
                ) : (
                  <FileIcon className="w-10 h-10 text-gray-300" />
                )}
                <div className="absolute right-2 top-2 rounded-md bg-black/60 p-1">
                  {vid ? (
                    <VideoIcon className="w-4 h-4 text-violet-400" />
                  ) : img ? (
                    <ImageIcon className="w-4 h-4 text-violet-400" />
                  ) : aud ? (
                    <Music className="w-4 h-4 text-violet-400" />
                  ) : (
                    <FileIcon className="w-4 h-4 text-violet-400" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <div className="truncate text-sm text-gray-200">{formatDisplayName(f.name)}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Uploaded by: {user?.name || user?.email || 'You'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {vid || aud ? (
                  <div className="group inline-flex items-stretch">
                    <Button size="sm" onClick={() => togglePlay(f.path)} className="rounded-r-none bg-violet-700 hover:bg-violet-600">Play</Button>
                    <a href={url} target="_blank" rel="noopener noreferrer" download>
                      <Button size="sm" className="rounded-l-none bg-violet-800 hover:bg-violet-700 px-2">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                ) : (
                  <a href={url} target="_blank" rel="noopener noreferrer" download>
                    <div className="group inline-flex items-stretch">
                      <Button size="sm" className="rounded-r-none bg-violet-700 hover:bg-violet-600">Download</Button>
                      <Button size="sm" className="rounded-l-none bg-violet-800 hover:bg-violet-700 px-2">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </a>
                )}
                <Button variant="destructive" size="sm" onClick={() => onDelete(f.path)} className="text-xs">Delete</Button>
              </div>
            </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        };

        // Show all files when filter is ALL, otherwise just show filtered type
        if (filter === 'ALL') {
          return (
            <>
              {renderSection('Videos', videos, <VideoIcon className="w-5 h-5 text-violet-400" />)}
              {renderSection('Audio', audios, <Music className="w-5 h-5 text-violet-400" />)}
              {renderSection('Images', images, <ImageIcon className="w-5 h-5 text-violet-400" />)}
              {renderSection('Files', others, <FileIcon className="w-5 h-5 text-violet-400" />)}
              
              {files.length === 0 && !loading && (
                <div className="text-center py-20 bg-gray-900/50 rounded-xl border border-gray-800">
                  <div className="mb-4">
                    <FileIcon className="w-16 h-16 text-gray-600 mx-auto" />
                  </div>
                  <div className="text-gray-400 text-lg font-medium">No media files yet</div>
                  <div className="text-gray-500 text-sm mt-2">Upload your first file using the button above</div>
                </div>
              )}
            </>
          );
        } else {
          // Show filtered view in grid
          return (
            <>
              {filteredAndSorted.length === 0 && !loading ? (
                <div className="text-center py-20 bg-gray-900/50 rounded-xl border border-gray-800">
                  <div className="text-gray-400 text-lg font-medium">No {filter.toLowerCase()} files found</div>
                  <div className="text-gray-500 text-sm mt-2">Try a different filter or upload new files</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {filteredAndSorted.map((f) => {
                    const url = MediaService.getPublicUrl(f.path);
                    const tag = inferType(f.name, f.path, (f as any).metadata);
                    const img = tag === 'IMAGE';
                    const vid = tag === 'VIDEO';
                    const aud = tag === 'AUDIO';
                    return (
                      <div key={f.path} className="bg-[#242427] border border-gray-800 rounded-2xl p-3 flex flex-col gap-3">
                        <div
                          className="relative w-full h-28 rounded-xl overflow-hidden bg-black flex items-center justify-center cursor-pointer"
                          onClick={() => (vid || aud) ? togglePlay(f.path) : undefined}
                        >
                          {img ? (
                            <img src={url} alt={f.name} className="w-full h-full object-cover" />
                          ) : vid ? (
                            <video
                              src={url}
                              className="w-full h-full object-cover"
                              controls={false}
                              preload="metadata"
                              muted
                              playsInline
                              ref={setMediaRef(f.path) as any}
                              onLoadedMetadata={() => initVideoPreview(f.path)}
                              onLoadedData={() => initVideoPreview(f.path)}
                            />
                          ) : aud ? (
                            <>
                              <Music className="w-10 h-10 text-violet-500" />
                              <audio src={url} ref={setMediaRef(f.path) as any} />
                            </>
                          ) : (
                            <FileIcon className="w-10 h-10 text-gray-300" />
                          )}
                          <div className="absolute right-2 top-2 rounded-md bg-black/60 p-1">
                            {vid ? (
                              <VideoIcon className="w-4 h-4 text-violet-400" />
                            ) : img ? (
                              <ImageIcon className="w-4 h-4 text-violet-400" />
                            ) : aud ? (
                              <Music className="w-4 h-4 text-violet-400" />
                            ) : (
                              <FileIcon className="w-4 h-4 text-violet-400" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="truncate text-sm text-gray-200">{formatDisplayName(f.name)}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            Uploaded by: {user?.name || user?.email || 'You'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {vid || aud ? (
                            <div className="group inline-flex items-stretch">
                              <Button size="sm" onClick={() => togglePlay(f.path)} className="rounded-r-none bg-violet-700 hover:bg-violet-600">Play</Button>
                              <a href={url} target="_blank" rel="noopener noreferrer" download>
                                <Button size="sm" className="rounded-l-none bg-violet-800 hover:bg-violet-700 px-2">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </a>
                            </div>
                          ) : (
                            <a href={url} target="_blank" rel="noopener noreferrer" download>
                              <div className="group inline-flex items-stretch">
                                <Button size="sm" className="rounded-r-none bg-violet-700 hover:bg-violet-600">Download</Button>
                                <Button size="sm" className="rounded-l-none bg-violet-800 hover:bg-violet-700 px-2">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </a>
                          )}
                          <Button variant="destructive" size="sm" onClick={() => onDelete(f.path)} className="text-xs">Delete</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        }
      })()}
    </div>
  );
}


