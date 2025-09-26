# Exact Commands to Run

## 1. Database Setup
```bash
# Copy the contents of database-fixes.sql into Supabase SQL Editor
# Or run via CLI:
psql "postgresql://postgres:[password]@db.cvhanylywsdeblhebicj.supabase.co:5432/postgres" -f database-fixes.sql
```

## 2. Environment Setup
```bash
# Create .env file
echo 'VITE_SUPABASE_URL=https://cvhanylywsdeblhebicj.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
VITE_DEV_RESEND_URL=http://localhost:3000/api/send-email' > .env
```

## 3. Supabase Secrets
```bash
# Set Resend API key
supabase secrets set RESEND_API_KEY=re_1234567890abcdef

# Set custom from email (optional)
supabase secrets set RESEND_FROM=noreply@yourdomain.com

# Verify secrets
supabase secrets list
```

## 4. Deploy Edge Function
```bash
# Deploy send-email function
supabase functions deploy send-email

# Or serve locally for development
supabase functions serve send-email
```

## 5. Restart Development Server
```bash
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

## 6. Test Commands
```bash
# Test database views
curl -H "Authorization: Bearer YOUR_ANON_KEY" \
  "https://cvhanylywsdeblhebicj.supabase.co/rest/v1/recipients?select=*&limit=1"

# Test email function
curl -X POST "https://cvhanylywsdeblhebicj.supabase.co/functions/v1/send-email" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messageId":"test","recipientEmail":"test@example.com","recipientName":"Test","subject":"Test","content":"Test","messageType":"EMAIL"}'
```



