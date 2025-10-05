// Supabase Edge Function: resolve-media-link
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token') || (await req.json().catch(() => ({}))).token
    if (!token) {
      return new Response(JSON.stringify({ error: 'missing token' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Lookup link
    const { data: links, error: linkErr } = await supabase
      .from('message_links')
      .select('*')
      .eq('view_token', token)
      .limit(1)

    if (linkErr || !links || links.length === 0) {
      return new Response(JSON.stringify({ error: 'link not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 })
    }

    const link = links[0]

    // Build gallery for this recipient (recent videos)
    const { data: gallery, error: galErr } = await supabase
      .from('message_links')
      .select('view_token, thumbnail_url, created_at')
      .eq('recipient_id', link.recipient_id)
      .eq('link_type', 'VIDEO')
      .order('created_at', { ascending: false })
      .limit(12)

    if (galErr) {
      console.warn('gallery error:', galErr)
    }

    // Record a view (best-effort)
    try {
      const ip = req.headers.get('x-forwarded-for') || ''
      const ua = req.headers.get('user-agent') || ''
      await supabase.from('media_views').insert({ link_id: link.id, ip, user_agent: ua })
    } catch (_) {}

    // If buckets are private, optionally sign here using Storage API.
    // For now, return the raw target_url; frontend can request directly if public, or we can add signing later.

    return new Response(JSON.stringify({
      main: {
        type: link.link_type,
        url: link.target_url,
        thumbnail_url: link.thumbnail_url || null,
      },
      gallery: (gallery || []).map((g: any) => ({ token: g.view_token, thumbnail_url: g.thumbnail_url, created_at: g.created_at }))
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (error) {
    console.error('resolve-media-link error:', error)
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})






