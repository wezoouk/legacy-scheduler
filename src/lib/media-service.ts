import { supabase, isSupabaseConfigured } from './supabase';

export interface MediaUploadResult {
  url: string;
  path: string;
  size: number;
  type: string;
}

export class MediaService {
  /**
   * Upload a file to Supabase Storage
   */
  static async uploadFile(
    file: File | Blob,
    fileName: string,
    bucket: string = 'media'
  ): Promise<MediaUploadResult> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      // Generate friendly filename: use provided name base + timestamp suffix to avoid collisions
      const timestamp = Date.now();
      const originalExt = fileName.split('.').pop() || 'bin';
      const baseWithoutExt = fileName.replace(/\.[^/.]+$/i, '');
      const safeBase = baseWithoutExt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 80) || 'file';
      const uniqueFileName = `${safeBase}-${timestamp}.${originalExt}`;
      const filePath = `uploads/${uniqueFileName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading file:', error);
        
        // If bucket doesn't exist, provide helpful error message
        if (error.message?.includes('bucket') || error.message?.includes('not found')) {
          throw new Error(`Storage bucket '${bucket}' does not exist. Please create it in your Supabase dashboard or run the setup-storage-bucket.sql script.`);
        }
        
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        path: filePath,
        size: file.size,
        type: file.type
      };
    } catch (error) {
      console.error('MediaService.uploadFile error:', error);
      throw error;
    }
  }

  /**
   * Upload video file
   */
  static async uploadVideo(videoBlob: Blob, fileName: string = 'video.webm'): Promise<MediaUploadResult> {
    return this.uploadFile(videoBlob, fileName, 'media');
  }

  /**
   * Upload audio file
   */
  static async uploadAudio(audioBlob: Blob, fileName: string = 'audio.webm'): Promise<MediaUploadResult> {
    return this.uploadFile(audioBlob, fileName, 'media');
  }

  /**
   * Upload attachment file
   */
  static async uploadAttachment(file: File): Promise<MediaUploadResult> {
    return this.uploadFile(file, file.name, 'media');
  }

  /**
   * List files in a bucket/prefix
   */
  static async listFiles(prefix: string = 'uploads', bucket: string = 'media') {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase not configured');
    }
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 100,
      sortBy: { column: 'updated_at', order: 'desc' }
    } as any);
    if (error) throw error;
    return (data || []).map((f: any) => ({
      name: f.name,
      metadata: f.metadata,
      path: `${prefix}/${f.name}`,
      created_at: (f as any).created_at,
      updated_at: (f as any).updated_at
    }));
  }

  /**
   * Get public URL for a file
   */
  static getPublicUrl(path: string, bucket: string = 'media'): string {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase not configured');
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Delete via edge function (service role)
   */
  static async deleteViaFunction(path: string, bucket: string = 'media') {
    const base = import.meta.env.VITE_SUPABASE_URL;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!base) throw new Error('Missing VITE_SUPABASE_URL');
    const res = await fetch(`${base}/functions/v1/delete-media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(anon ? { 'Authorization': `Bearer ${anon}` } : {})
      },
      body: JSON.stringify({ path, bucket })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.success === false) {
      const errMsg = json?.error || `Delete failed: ${res.status}`;
      throw new Error(errMsg);
    }
    return json;
  }

  /**
   * Delete a file from Supabase Storage
   */
  static async deleteFile(filePath: string, bucket: string = 'media'): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting file:', error);
        throw error;
      }
    } catch (error) {
      console.error('MediaService.deleteFile error:', error);
      throw error;
    }
  }

  /**
   * Convert data URL to Blob
   */
  static dataURLToBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  /**
   * Convert Blob to data URL (for debugging only)
   */
  static async blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}


