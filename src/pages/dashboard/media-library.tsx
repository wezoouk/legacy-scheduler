import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MediaService } from '@/lib/media-service';
import { Image as ImageIcon, Download, Music, File as FileIcon, Video as VideoIcon } from 'lucide-react';

export function MediaLibraryPage() {
  const [files, setFiles] = React.useState<Array<{ name: string; path: string }>>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const mediaRefs = React.useRef<Map<string, HTMLMediaElement>>(new Map());

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
    setLoading(true);
    setError(null);
    try {
      const prefixes = ['uploads', 'audio', 'recordings', 'voice'];
      const results: Array<{ name: string; path: string; created_at?: string; updated_at?: string }[]> = await Promise.all(
        prefixes.map(async (p) => {
          try { return await MediaService.listFiles(p); } catch { return []; }
        })
      );
      const mergedMap = new Map<string, { name: string; path: string; created_at?: string; updated_at?: string }>();
      for (const arr of results) {
        for (const f of arr) {
          mergedMap.set(f.path, f);
        }
      }
      setFiles(Array.from(mergedMap.values()));
    } catch (e: any) {
      setError(e?.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, []);

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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {files
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
          })
          .map((f) => {
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
                <div className="truncate text-sm text-gray-200">{f.name}</div>
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
    </div>
  );
}


