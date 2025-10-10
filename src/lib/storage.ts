import { supabase } from './supabase';

export interface StorageProvider {
  upload(file: File | Blob, key: string): Promise<{ key: string; url: string }>;
  getUrl(key: string): string;
  delete(key: string): Promise<void>;
}

class LocalStorageProvider implements StorageProvider {
  private base: string;
  constructor() {
    this.base = (import.meta as any).env?.VITE_LOCAL_MEDIA_BASE || 'http://localhost:5174';
  }
  async upload(file: File | Blob, key: string) {
    const endpoint = `${this.base.replace(/\/$/, '')}/media/upload`;
    const form = new FormData();
    const name = key.split('/').pop() || 'file.bin';
    // Ensure File if Blob provided
    const fileObj = file instanceof File ? file : new File([file], name, { type: (file as any).type || 'application/octet-stream' });
    form.append('file', fileObj, key);
    const res = await fetch(endpoint, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Local upload failed: ${res.status}`);
    const url = `${this.base.replace(/\/$/, '')}/media/${key}`;
    return { key, url };
  }
  getUrl(key: string) {
    return `${this.base.replace(/\/$/, '')}/media/${key}`;
  }
  async delete(key: string) {
    const endpoint = `${this.base.replace(/\/$/, '')}/media/${key}`;
    await fetch(endpoint, { method: 'DELETE' });
  }
}

class SupabaseStorageProvider implements StorageProvider {
  private bucket: string;
  private publicBase?: string;
  constructor() {
    this.bucket = (import.meta as any).env?.VITE_SUPABASE_MEDIA_BUCKET || 'media';
    this.publicBase = (import.meta as any).env?.VITE_SUPABASE_MEDIA_BASE; // optional CDN base
  }
  async upload(file: File | Blob, key: string) {
    const { error } = await supabase.storage.from(this.bucket).upload(key, file, { upsert: true });
    if (error) throw error;
    return { key, url: this.getUrl(key) };
  }
  getUrl(key: string) {
    if (this.publicBase) return `${this.publicBase.replace(/\/$/, '')}/${key}`;
    const { data } = supabase.storage.from(this.bucket).getPublicUrl(key);
    return data.publicUrl;
  }
  async delete(key: string) {
    const { error } = await supabase.storage.from(this.bucket).remove([key]);
    if (error) throw error;
  }
}

export function getStorage(): StorageProvider {
  const provider = ((import.meta as any).env?.VITE_STORAGE_PROVIDER || 'supabase').toLowerCase();
  if (provider === 'local') return new LocalStorageProvider();
  return new SupabaseStorageProvider();
}


