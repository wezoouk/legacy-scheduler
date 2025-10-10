# IP & Country Blocking Implementation Guide

## Overview
The IP and Country blocking feature has been added to the admin panel. The UI is fully functional for managing blocklists, but **server-side enforcement is required** to actually block access.

## What's Implemented (✅ Functional)

### 1. Admin UI (`/admin/security`)
- ✅ Block/unblock individual IP addresses
- ✅ Block/unblock entire countries
- ✅ Security settings toggles:
  - Block VPN connections (requires server-side)
  - Block Tor network (requires server-side)
  - Require email verification (already enforced by Supabase)
- ✅ View all blocked IPs and countries with reasons
- ✅ Audit logging for all security changes
- ✅ Data stored in localStorage (`legacyScheduler_securitySettings`)

### 2. Security Management Library (`src/lib/security-blocklist.ts`)
- Manage blocked IPs and countries
- Check if IP/country is blocked
- Security settings configuration
- List of 40+ common countries

## What Requires Implementation (🔧 Server-Side)

To actually **enforce** the blocking rules, you need to implement checks at the server level:

### Option 1: Supabase Edge Functions (Recommended)

Create a middleware edge function that intercepts requests:

```typescript
// supabase/functions/security-check/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // Get client IP
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown'
  
  // Get country from request headers (if using Cloudflare or similar)
  const country = req.headers.get('cf-ipcountry') || 
                  req.headers.get('x-vercel-ip-country')
  
  // Fetch security settings from storage or database
  const { data: settings } = await supabase
    .from('security_settings')
    .select('*')
    .single()
  
  // Check IP blocklist
  const ipBlocked = settings.blocked_ips.some((blocked: any) => 
    blocked.ip === ip
  )
  
  if (ipBlocked) {
    return new Response(
      JSON.stringify({ error: 'Access denied from this IP address' }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
  
  // Check country blocklist
  if (country) {
    const countryBlocked = settings.blocked_countries.some((blocked: any) => 
      blocked.country_code === country
    )
    
    if (countryBlocked) {
      return new Response(
        JSON.stringify({ error: 'Access denied from this country' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
  
  // Continue with request
  return new Response('OK')
})
```

### Option 2: Cloudflare Workers

Use Cloudflare Workers for edge-level blocking:

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const ip = request.headers.get('cf-connecting-ip')
  const country = request.headers.get('cf-ipcountry')
  
  // Fetch blocklist from KV or your database
  const blocklist = await BLOCKLIST_KV.get('security_settings', 'json')
  
  // Check IP
  if (blocklist.blocked_ips.includes(ip)) {
    return new Response('Access Denied', { status: 403 })
  }
  
  // Check country
  if (blocklist.blocked_countries.includes(country)) {
    return new Response('Access Denied from this country', { status: 403 })
  }
  
  // Continue
  return fetch(request)
}
```

### Option 3: Database-Backed (Recommended for Production)

Store security settings in Supabase instead of localStorage:

1. **Create tables:**

```sql
-- Create security_settings table
CREATE TABLE security_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create blocked_ips table
CREATE TABLE blocked_ips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  blocked_by UUID REFERENCES auth.users(id)
);

-- Create blocked_countries table
CREATE TABLE blocked_countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code TEXT NOT NULL UNIQUE,
  country_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  blocked_by UUID REFERENCES auth.users(id)
);

-- Indexes for fast lookups
CREATE INDEX idx_blocked_ips_ip ON blocked_ips(ip);
CREATE INDEX idx_blocked_countries_code ON blocked_countries(country_code);
```

2. **Update the library to use Supabase:**

```typescript
// src/lib/security-blocklist.ts
import { supabase } from './supabase';

export async function blockIP(ip: string, reason: string, userId: string) {
  const { error } = await supabase
    .from('blocked_ips')
    .insert({ ip, reason, blocked_by: userId });
  
  if (error) throw error;
}

export async function isIPBlocked(ip: string): Promise<boolean> {
  const { data } = await supabase
    .from('blocked_ips')
    .select('id')
    .eq('ip', ip)
    .single();
  
  return !!data;
}
```

3. **Create Row Level Security (RLS) policies:**

```sql
-- Only admins can manage blocklists
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_countries ENABLE ROW LEVEL SECURITY;

-- Admin read policy
CREATE POLICY "Admins can view blocklists" ON blocked_ips
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.plan = 'LEGACY'
    )
  );

-- Admin write policy
CREATE POLICY "Admins can manage blocklists" ON blocked_ips
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.plan = 'LEGACY'
    )
  );

-- Same for blocked_countries
CREATE POLICY "Admins can view blocked countries" ON blocked_countries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.plan = 'LEGACY'
    )
  );

CREATE POLICY "Admins can manage blocked countries" ON blocked_countries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.plan = 'LEGACY'
    )
  );
```

## VPN & Tor Detection

For VPN and Tor blocking, you'll need a detection service:

### Option 1: IP2Location (Commercial)
```typescript
const response = await fetch(`https://api.ip2location.com/v2/?key=YOUR_KEY&ip=${ip}&package=PX8`)
const data = await response.json()

if (data.is_proxy === 'YES' || data.proxy_type === 'VPN') {
  // Block VPN
}
```

### Option 2: IPHub (Commercial)
```typescript
const response = await fetch(`http://v2.api.iphub.info/ip/${ip}`, {
  headers: { 'X-Key': 'YOUR_API_KEY' }
})
const data = await response.json()

if (data.block === 1) {
  // Block VPN/Proxy
}
```

### Option 3: Tor Project Exit List (Free for Tor)
```typescript
// Download Tor exit node list daily
const torExitNodes = await fetch('https://check.torproject.org/torbulkexitlist')
  .then(r => r.text())
  .then(text => text.split('\n'))

if (torExitNodes.includes(ip)) {
  // Block Tor
}
```

## Client-Side Check (Limited)

You can add a basic client-side check as a first line of defense:

```typescript
// src/lib/auth-context.tsx
import { isIPBlocked, isCountryBlocked } from './security-blocklist';

// In your login/signup flow:
const checkAccess = async () => {
  // Get client IP (requires an API like ipapi.co)
  const ipResponse = await fetch('https://ipapi.co/json/');
  const { ip, country_code } = await ipResponse.json();
  
  if (isIPBlocked(ip)) {
    throw new Error('Access denied from this IP address');
  }
  
  if (isCountryBlocked(country_code)) {
    throw new Error('Access denied from this country');
  }
};
```

⚠️ **Note:** Client-side checks can be bypassed. Always implement server-side enforcement.

## Testing

1. **Test IP Blocking:**
   - Add your own IP to the blocklist
   - Try to access the site
   - Should see access denied

2. **Test Country Blocking:**
   - Use a VPN to a specific country
   - Block that country
   - Access should be denied

3. **Test Audit Logs:**
   - All blocking/unblocking actions should appear in audit logs
   - Check `/admin/profile` → Security tab → View Audit Logs

## Files Modified

- ✅ `src/lib/security-blocklist.ts` - Security management library
- ✅ `src/pages/admin/security-blocklist.tsx` - Admin UI page
- ✅ `src/components/admin/admin-layout.tsx` - Added navigation link
- ✅ `src/App.tsx` - Added route

## Next Steps

1. Choose implementation approach (Edge Functions recommended)
2. Move from localStorage to database for production
3. Implement server-side checks
4. Add VPN/Tor detection service
5. Test thoroughly before deploying
6. Monitor audit logs for security events

## Current State

- ✅ UI is fully functional
- ✅ Data is saved in localStorage
- ✅ Audit logging is working
- 🔧 Server-side enforcement **NOT** implemented
- 🔧 VPN/Tor detection **NOT** implemented

The red dots on VPN/Tor toggles indicate they require server-side work to function.



