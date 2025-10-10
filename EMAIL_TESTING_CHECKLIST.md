# Email Testing & Troubleshooting Checklist

## ✅ What's Working Now

1. ✅ **Manual sending** - Clicking "Send Now" or "Resend" works
2. ✅ **Auto-check system** - Dashboard calls edge function every 30 seconds
3. ✅ **Edge function deployed** - Both `send-email` and `process-scheduled-messages`
4. ✅ **CORS fixed** - Port 5175 is allowed
5. ✅ **Guardian Angel processing** - Found and processed 1 overdue DMS cycle

---

## 🔍 Current Status

Your last response shows:
```json
{
  "success": true,
  "message": "Processed 1 overdue DMS cycles, 0 scheduled emails sent",
  "overdueCount": 1,
  "scheduledCount": 0
}
```

This means:
- ✅ The edge function ran successfully
- ✅ Found 1 Guardian Angel (DMS) message that was overdue
- ✅ Marked it as processed
- ❓ **Unknown**: Did the email actually send?

---

## 🧪 Test 1: Check If Guardian Angel Email Was Sent

### Check Your Inbox:
1. ✉️ **Check your email** (the one you added as recipient)
2. 📁 **Check spam folder** too
3. 🔍 **Search for**: Subject line of your Guardian Angel message

### Check Message Status in App:
1. Go to **Guardian Angel** tab in dashboard
2. Look at your message
3. Status should be: **SENT** (not DRAFT)
4. If it says SENT but no email → Problem is in email delivery

### Check Supabase Logs:
1. Go to: https://supabase.com/dashboard/project/cvhanylywsdeblhebicj/functions/process-scheduled-messages/logs
2. Look for recent logs
3. Search for: "Email sent to" or "Failed to send"
4. Should see: `✅ Email sent to your@email.com`

---

## 🧪 Test 2: Test Regular Scheduled Message

Guardian Angel and regular scheduled messages are different. Let's test a regular one:

### Steps:
1. **Create a new message:**
   - Go to **Messages** tab (NOT Guardian Angel)
   - Click "Create Message"
   - Type: **EMAIL**
   - Add your email as recipient
   - Subject: "Test Scheduled Email"
   - Content: "This is a test"
   
2. **Schedule it:**
   - Click "Schedule for Later"
   - Set time to **2 minutes from now**
   - Save the message
   - Status should be: **SCHEDULED**

3. **Wait on dashboard:**
   - Stay on dashboard page
   - Watch browser console
   - After 30 seconds you'll see: `🔄 Auto-checking...`
   - After 2 minutes passes, check Network tab

4. **Expected response:**
   ```json
   {
     "success": true,
     "message": "Processed 0 overdue DMS cycles, 1 scheduled emails sent",
     "overdueCount": 0,
     "scheduledCount": 1
   }
   ```

5. **Check results:**
   - ✅ Message status changed to **SENT**
   - ✅ Email received in inbox
   - ✅ Network response shows `scheduledCount: 1`

---

## 🧪 Test 3: Test Manual Send (Already Working)

This confirms your edge functions work:

1. Create a message (don't schedule it)
2. Click **"Send Now"** button
3. Should see in console:
   ```
   📧 Sending emails for message: xyz
   🔗 Calling edge function: https://...
   ✅ Edge function result: { success: true }
   ✅ All emails sent successfully!
   ```
4. Check inbox

---

## ❓ Diagnostic Questions

### If Guardian Angel email didn't arrive:

**Q1: What is the message status in the app?**
- If still "DRAFT" → Edge function didn't process it
- If "SENT" → Edge function processed it, but email may have failed

**Q2: Check Network tab - Response tab:**
```json
{
  "success": true,
  "overdueCount": 1  // ← This confirms it found the message
}
```

**Q3: Check Supabase logs** (dashboard link above):
- Look for: "Sending message XYZ"
- Look for: "Email sent to your@email.com"
- Look for: "Failed to send" or error messages

**Q4: Is RESEND_API_KEY set?**
```bash
npx supabase secrets list
```
Should show: `RESEND_API_KEY` with status ACTIVE

**Q5: Check Resend Dashboard:**
- Go to: https://resend.com/emails
- Look for recent emails
- Check status (delivered, bounced, failed)

---

## 🐛 Common Issues & Fixes

### Issue 1: Message Status is SENT but No Email

**Cause:** Edge function marked as sent but `send-email` function failed

**Check:**
1. Supabase logs (see if "Failed to send" appears)
2. Resend dashboard (see if email was even sent to Resend)

**Fix:**
- Check RESEND_API_KEY is valid
- Check recipient email is in recipients table
- Check Resend account has quota left

### Issue 2: scheduledCount Always Shows 0

**Cause:** No scheduled messages found

**Reasons:**
- Message status is not "SCHEDULED" (might be DRAFT)
- `scheduledFor` time is in the future (not past yet)
- Message is deleted or has wrong userId

**Fix:**
1. Check message status in database
2. Check `scheduledFor` timestamp
3. Ensure you're logged in as the same user who created it

### Issue 3: overdueCount Shows 0

**Cause:** No overdue Guardian Angel messages

**Reasons:**
- No DMS configuration exists
- Grace period hasn't expired
- Already processed

**Check:**
- Go to Guardian Angel tab
- Check if you have active DMS setup
- Check grace period settings

### Issue 4: Edge Function Returns Error

**Error:** "Recipient not authorized"
- Recipient email not in database for this user
- Add recipient first, then send

**Error:** "RESEND_API_KEY not configured"
- API key missing or wrong
- Set it: `npx supabase secrets set RESEND_API_KEY=re_xxx`

**Error:** "Failed to fetch"
- CORS issue
- Redeploy edge functions
- Check allowed origins includes your port

---

## 📊 Monitoring Dashboard

### View Logs:
- **process-scheduled-messages**: https://supabase.com/dashboard/project/cvhanylywsdeblhebicj/functions/process-scheduled-messages/logs
- **send-email**: https://supabase.com/dashboard/project/cvhanylywsdeblhebicj/functions/send-email/logs

### Check Secrets:
```bash
npx supabase secrets list
```

Should show:
- RESEND_API_KEY (ACTIVE)
- SUPABASE_SERVICE_ROLE_KEY (ACTIVE)
- SUPABASE_URL (ACTIVE)

### Check Resend:
- Dashboard: https://resend.com/emails
- Shows all sent emails
- Status: Delivered, Bounced, Failed
- Free tier: 100 emails/day

---

## 🎯 Quick Action Plan

**Right Now:**

1. **Check your inbox** - Did you get the Guardian Angel email?
   - ✅ YES → Everything is working! Test a scheduled message next
   - ❌ NO → Go to Supabase logs and check for errors

2. **Test a regular scheduled message** (see Test 2 above)
   - Create message
   - Schedule for 2 minutes
   - Wait and watch
   - Check if email arrives

3. **Report back** with:
   - Did Guardian Angel email arrive? (yes/no)
   - Did scheduled message email arrive? (yes/no)
   - Any errors in Supabase logs?
   - Any errors in Resend dashboard?

---

## 📞 Next Steps Based on Results

### ✅ If Both Work:
- You're done! System is fully functional
- Enable GitHub Actions for 24/7 operation (optional)
- Monitor Resend usage to stay within quota

### ⚠️ If Guardian Angel Works but Scheduled Doesn't:
- Check message status (SCHEDULED vs DRAFT)
- Check scheduledFor timestamp
- Review Supabase logs for scheduled messages processing

### ⚠️ If Neither Works:
- Check Supabase edge function logs
- Verify RESEND_API_KEY is set
- Check Resend dashboard for API errors
- Verify recipients exist in database

### ⚠️ If Manual Works but Auto Doesn't:
- Check auto-check is running (console shows "Auto-checking...")
- Check Network tab response
- Verify edge function is being called
- Check Supabase logs for processing attempts

---

## 🚀 Production Checklist

Once testing is complete:

- [ ] Manual sending works
- [ ] Scheduled messages send automatically
- [ ] Guardian Angel messages send when overdue
- [ ] Emails arrive in inbox (not spam)
- [ ] RESEND_API_KEY is set
- [ ] GitHub Actions enabled (optional)
- [ ] Monitoring set up (Resend dashboard)
- [ ] Quota checked (100/day free tier)

---

**Start with Test 1 and Test 2, then report back with results!**



