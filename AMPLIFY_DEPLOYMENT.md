# AWS Amplify Deployment Guide

## ✅ Prerequisites
- AWS Account
- GitHub repository (already done: https://github.com/wezoouk/legacy-scheduler)
- Domain: www.rembr.co.uk

## 🚀 Deployment Steps

### Step 1: Create Amplify App

1. Go to: https://console.aws.amazon.com/amplify/
2. Click **"New app"** → **"Host web app"**
3. Choose **"GitHub"**
4. Authorize AWS Amplify to access your GitHub
5. Select repository: **wezoouk/legacy-scheduler**
6. Select branch: **main**
7. Click **"Next"**

### Step 2: Configure Build Settings

The build settings should auto-detect from `amplify.yml`. Verify it shows:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
```

Click **"Next"**

### Step 3: Add Environment Variables

Click **"Advanced settings"** and add these environment variables:

| Variable Name | Value |
|--------------|-------|
| `VITE_SUPABASE_URL` | `https://cvhanylywsdeblhebicj.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2aGFueWx5d3NkZWJsaGViaWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjczNjIxNjUsImV4cCI6MjA0MjkzODE2NX0.YRWMqgL-LdvWUVnGIcgtUiZGDhSZIYAl4YlS0izDRM4` |

*(Use your actual Supabase keys if different)*

### Step 4: Deploy

1. Click **"Save and deploy"**
2. Wait 3-5 minutes for build and deployment
3. You'll get a URL like: `https://main.xxxxxx.amplifyapp.com`

### Step 5: Configure Custom Domain (www.rembr.co.uk)

1. In Amplify console, click **"Domain management"** (left sidebar)
2. Click **"Add domain"**
3. Enter: `rembr.co.uk`
4. Amplify will provide DNS records (CNAME or A records)
5. Add these DNS records to your domain registrar:
   - For `www.rembr.co.uk`: CNAME → provided by Amplify
   - For `rembr.co.uk`: A/ALIAS → provided by Amplify
6. Wait 15-30 minutes for DNS propagation
7. SSL certificate will be auto-provisioned

### Step 6: Update Supabase CORS Settings

Once your Amplify URL is live, update the `ALLOWED_ORIGIN` environment variable in Supabase:

1. Go to: https://supabase.com/dashboard/project/cvhanylywsdeblhebicj/settings/functions
2. Update `ALLOWED_ORIGIN` to include your Amplify domain:
   ```
   http://localhost:5173,http://localhost:5174,https://www.rembr.co.uk,https://rembr.co.uk,https://main.xxxxxx.amplifyapp.com
   ```
3. Redeploy Edge Functions:
   ```bash
   npx supabase functions deploy send-email --project-ref cvhanylywsdeblhebicj --no-verify-jwt
   npx supabase functions deploy process-scheduled-messages --project-ref cvhanylywsdeblhebicj --no-verify-jwt
   ```

## 🎉 Done!

Your app will be live at:
- Temporary: `https://main.xxxxxx.amplifyapp.com`
- Production: `https://www.rembr.co.uk` (once DNS configured)

## 🔄 Automatic Deployments

Every time you push to GitHub `main` branch, Amplify will automatically:
1. Pull latest code
2. Build the app
3. Deploy to production

## 💰 Cost

AWS Amplify Free Tier:
- 1000 build minutes/month FREE
- 15 GB served/month FREE
- 5 GB stored FREE

After free tier: ~$0.01 per build minute, ~$0.15 per GB served

Estimated cost: **$0-5/month** for low-medium traffic

---

## 🆘 Troubleshooting

**Build fails?**
- Check build logs in Amplify console
- Verify `package.json` has all dependencies

**Can't connect to Supabase?**
- Verify environment variables are set correctly
- Check CORS settings in Supabase Edge Functions

**Domain not working?**
- Wait 30 minutes for DNS propagation
- Verify DNS records in your domain registrar
- Check SSL certificate status in Amplify

---

## 📚 Next Steps

1. Test the deployed app thoroughly
2. Set up monitoring/alerts in AWS CloudWatch
3. Configure backup/disaster recovery
4. Set up staging environment (optional)

