import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export function MediaViewerPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [main, setMain] = React.useState<{ type: 'VIDEO' | 'VOICE' | 'FILE'; url: string; thumbnail_url?: string | null } | null>(null);
  const [gallery, setGallery] = React.useState<Array<{ token: string; thumbnail_url?: string | null }>>([]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/functions/v1/resolve-media-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        if (!res.ok) throw new Error(`Resolver failed: ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setMain(data.main);
          setGallery(data.gallery || []);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) load();
    return () => { cancelled = true; };
  }, [token]);

  const renderMain = () => {
    if (!main) return null;
    if (main.type === 'VIDEO') {
      return (
        <video
          controls
          src={main.url}
          className="max-w-full w-full h-auto rounded-lg shadow-2xl"
          poster={main.thumbnail_url || undefined}
        />
      );
    }
    if (main.type === 'VOICE') {
      return (
        <div className="w-full">
          <audio controls src={main.url} className="w-full" />
        </div>
      );
    }
    return (
      <div className="text-center">
        <a href={main.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
          Open file
        </a>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white">← Back</button>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold">Your Secure Viewer</h1>
          <p className="text-gray-400">Enjoy your media in cinema mode</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-4 md:p-6 border border-gray-800">
          {loading && (
            <div className="h-60 flex items-center justify-center text-gray-400">Loading…</div>
          )}
          {error && (
            <div className="h-60 flex items-center justify-center text-red-400">{error}</div>
          )}
          {!loading && !error && (
            <div className="flex flex-col items-center">
              <div className="w-full aspect-video bg-black flex items-center justify-center">
                {renderMain()}
              </div>
            </div>
          )}
        </div>

        {gallery.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg mb-3">Previously sent to you</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {gallery.map((g, idx) => (
                <a
                  key={idx}
                  href={`/view?token=${encodeURIComponent(g.token)}`}
                  className="block bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-gray-600"
                >
                  {g.thumbnail_url ? (
                    <img src={g.thumbnail_url} alt="thumbnail" className="w-full h-28 object-cover" />
                  ) : (
                    <div className="w-full h-28 flex items-center justify-center text-gray-500">Video</div>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}






