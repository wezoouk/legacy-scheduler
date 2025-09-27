import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MediaService } from '@/lib/media-service';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFile: (url: string, name: string) => void;
}

export function FileSelectionDialog({ open, onOpenChange, onSelectFile }: Props) {
  const [files, setFiles] = useState<Array<{ name: string; path: string; url: string }>>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const list = await MediaService.listFiles('uploads');
        const filtered = (list as any[]).filter((f: any) => {
          const n = f.name.toLowerCase();
          const isAudio = /\.(mp3|wav|ogg|m4a|aac|webm)$/.test(n);
          const isVideo = /\.(mp4|webm|mov|m4v|avi|mkv)$/.test(n);
          return !isAudio && !isVideo; // images + docs
        });
        setFiles(filtered.map((f: any) => ({ name: f.name, path: f.path, url: MediaService.getPublicUrl(f.path) })));
      } catch (e) {
        console.error('Failed to load media files:', e);
      }
    })();
  }, [open]);

  const shown = files.filter(f => f.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select File from Media</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Search files..." value={filter} onChange={(e) => setFilter(e.target.value)} />
          {shown.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No files found</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {shown.map((f, idx) => {
                const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f.name);
                return (
                  <Card key={idx} className="cursor-pointer hover:shadow-md" onClick={() => { onSelectFile(f.url, f.name); onOpenChange(false); }}>
                    <CardContent className="p-0">
                      <div className="aspect-video bg-black/10 flex items-center justify-center overflow-hidden">
                        {isImage ? (
                          <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-xs px-2 text-foreground truncate">{f.name}</div>
                        )}
                      </div>
                      <div className="p-2 text-sm truncate" title={f.name}>{f.name}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


