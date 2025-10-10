# Full DMS Test Instructions

We need to do a **complete fresh test** to verify everything works end-to-end.

## Current Situation:
- Old message "4" (id: 0ec72362...) - You manually sent this, it's still DRAFT
- New message "DMS" - This is what should be tested now
- Guardian Angel shows "OVERDUE" - This means it should trigger soon

## Let's Test The NEW Message:

1. **First, check the Supabase Edge Function logs** for version 43 (the latest deployment)
   - Go to: https://supabase.com/dashboard/project/cvhanylywsdeblhebicj/functions
   - Click "process-scheduled-messages"
   - Click "Logs" tab
   - Look for logs from version 43
   - **Paste any error messages or debug logs here**

2. **Check the new DMS message status in database:**
   Run this SQL in Supabase:
   ```sql
   SELECT id, title, status, scope, "userId", "recipientIds"
   FROM messages
   WHERE "userId" = '69d26959-9119-4ca5-987b-f982344ae5be'
     AND scope = 'DMS'
   ORDER BY "createdAt" DESC;
   ```

3. **Check the current DMS cycle:**
   ```sql
   SELECT id, "configId", state, "nextCheckinAt", "updatedAt"
   FROM dms_cycles
   WHERE "userId" = '69d26959-9119-4ca5-987b-f982344ae5be'
   ORDER BY "updatedAt" DESC
   LIMIT 1;
   ```

## Expected Behavior:
- If cycle state is "ACTIVE" → Not overdue yet, wait
- If cycle state is "PENDING_RELEASE" or "OVERDUE" → Should send email automatically
- Email should arrive AND message status should update to "SENT"

Please paste the results of these checks!

