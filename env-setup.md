# Environment Setup

## B) .env / secrets

### 1. Create .env file in project root:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://cvhanylywsdeblhebicj.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Optional: For development email fallback
VITE_DEV_RESEND_URL=http://localhost:3000/api/send-email
```

### 2. Set Supabase Edge Function secrets:
```bash
# Set RESEND_API_KEY for edge functions
supabase secrets set RESEND_API_KEY=your_resend_api_key_here

# Optional: Set custom from email
supabase secrets set RESEND_FROM=noreply@yourdomain.com

# Verify secrets are set
supabase secrets list
```

### 3. Get your Supabase anon key:
- Go to your Supabase dashboard
- Navigate to Settings > API
- Copy the "anon public" key
- Replace `your_anon_key_here` in the .env file

### 4. Get your Resend API key:
- Go to https://resend.com/api-keys
- Create a new API key
- Use it in the `supabase secrets set` command above



