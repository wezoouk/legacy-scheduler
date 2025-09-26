# Quick Setup Guide

## 🚀 **Fix All Issues in 3 Steps:**

### **Step 1: Fix Database (REQUIRED)**
1. Go to: `https://app.supabase.com/project/cvhanylywsdeblhebicj/sql`
2. Click "New Query"
3. Copy ALL content from `fix-all-issues.sql` and paste it
4. Click "Run"

### **Step 2: Set up Email (For sending emails)**
Choose ONE option:

**Option A: Real Email (Recommended)**
1. Go to https://resend.com and create free account
2. Get your API key
3. Add to Supabase: Go to Settings > Environment Variables
4. Add: `RESEND_API_KEY` = your-api-key

**Option B: Development Mode (Testing)**
1. Run: `npm install express cors` 
2. Run: `node dev-email-server.js` (in separate terminal)
3. Emails will be logged to console instead of sent

### **Step 3: Test**
1. Refresh your app at http://localhost:5174
2. Create a new message - should show "Server" badge
3. Schedule a message - should send via email

## 🎯 **What This Fixes:**
- ✅ Messages save to server (not localStorage)  
- ✅ Login works without spinning
- ✅ Scheduled messages send emails
- ✅ No more database errors



