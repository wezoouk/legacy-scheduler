# Email Variables and Background Color Fixed

## Issues Fixed

### 1. ✅ Custom Background Color Missing
**Problem:** Background colors weren't being applied to emails
**Root Cause:** The `ScheduledMessage` interface in the edge function was missing the `backgroundColor` field
**Solution:** Added `backgroundColor?: string;` to the interface

### 2. ✅ Site Name Variable Support
**Problem:** `{{siteName}}` placeholder wasn't being replaced with actual site name
**Solution:** Added site name variable processing in both client and edge function

### 3. ✅ Recipient Name Variable Support  
**Problem:** `{{recipientName}}` placeholder wasn't being replaced with actual recipient name
**Solution:** Added recipient name variable processing in both client and edge function

## Changes Made

### Client-Side Email Service (`src/lib/email-service.ts`)

**Lines 295-313:**
```typescript
// Get site name from localStorage (same as useAdmin hook)
let siteName = 'Rembr'; // default
try {
  const stored = localStorage.getItem('legacyScheduler_siteSettings');
  if (stored) {
    const parsedSettings = JSON.parse(stored);
    siteName = parsedSettings.siteName || 'Rembr';
  }
} catch (error) {
  console.warn('Could not load site settings, using default:', error);
}

// Process content to replace placeholders
let processedContent = request.content
  .replace(/\[Name\]/g, request.recipientName)
  .replace(/\[Recipient Name\]/g, request.recipientName)
  .replace(/\[Your Name\]/g, siteName)
  .replace(/\{\{siteName\}\}/g, siteName)
  .replace(/\{\{recipientName\}\}/g, request.recipientName);
```

**Lines 351-356:**
```typescript
const processedSubject = request.subject
  .replace(/\[Name\]/g, request.recipientName)
  .replace(/\[Recipient Name\]/g, request.recipientName)
  .replace(/\[Your Name\]/g, siteName)
  .replace(/\{\{siteName\}\}/g, siteName)
  .replace(/\{\{recipientName\}\}/g, request.recipientName);
```

### Edge Function (`supabase/functions/process-scheduled-messages/index.ts`)

**Lines 63-78:**
```typescript
interface ScheduledMessage {
  id: string;
  userId: string;
  title: string;
  content: string;
  types: string[];
  status: string;
  scheduledFor: string;
  recipientIds: string[];
  cipherBlobUrl?: string;
  thumbnailUrl?: string;
  videoRecording?: string;
  audioRecording?: string;
  attachments?: any;
  backgroundColor?: string; // ✅ ADDED THIS
}
```

**Lines 551-558:**
```typescript
// Process content to replace placeholders (edge function version)
const siteName = 'Rembr'; // Default site name for edge function
sanitized = sanitized
  .replace(/\[Name\]/g, recipient.name)
  .replace(/\[Recipient Name\]/g, recipient.name)
  .replace(/\[Your Name\]/g, siteName)
  .replace(/\{\{siteName\}\}/g, siteName)
  .replace(/\{\{recipientName\}\}/g, recipient.name);
```

**Lines 603-608:**
```typescript
subject: (message.title || 'Message')
  .replace(/\[Name\]/g, recipient.name)
  .replace(/\[Recipient Name\]/g, recipient.name)
  .replace(/\[Your Name\]/g, siteName)
  .replace(/\{\{siteName\}\}/g, siteName)
  .replace(/\{\{recipientName\}\}/g, recipient.name),
```

## Supported Variables

### Content Variables
- `[Name]` → Recipient's name
- `[Recipient Name]` → Recipient's name  
- `[Your Name]` → Site name (e.g., "Rembr")
- `{{siteName}}` → Site name (e.g., "Rembr")
- `{{recipientName}}` → Recipient's name

### Subject Line Variables
All the same variables work in email subject lines too!

## Site Name Source

### Client-Side (Manual Send)
- Reads from `localStorage.getItem('legacyScheduler_siteSettings')`
- Falls back to "Rembr" if not found
- Uses the same source as the `useAdmin()` hook

### Edge Function (Scheduled Send)
- Uses default "Rembr" (since edge functions can't access localStorage)
- Could be enhanced later to store site settings in database

## Testing

### Test Background Color
1. Create message with custom background color (e.g., pink #ffb6c1)
2. Send manually - should have pink background with curved corners
3. Schedule for immediate send - should have pink background with curved corners

### Test Variables
1. Create message with content like:
   ```
   Hello {{recipientName}}!
   
   This message was sent through {{siteName}}.
   
   Best regards,
   [Your Name]
   ```
2. Send to recipient "John Doe"
3. Should render as:
   ```
   Hello John Doe!
   
   This message was sent through Rembr.
   
   Best regards,
   Rembr
   ```

## Deployment Status
✅ **Edge function deployed** to Supabase production:
```
Deployed Functions on project cvhanylywsdeblhebicj: process-scheduled-messages
```

## Files Modified
1. `src/lib/email-service.ts` - Added site name and recipient name variable processing
2. `supabase/functions/process-scheduled-messages/index.ts` - Added backgroundColor field, variable processing
3. **Edge function deployed** to production

## Expected Results
- ✅ Custom background colors now work in all emails
- ✅ `{{siteName}}` is replaced with actual site name (e.g., "Rembr")
- ✅ `{{recipientName}}` is replaced with actual recipient name
- ✅ All existing variables still work (`[Name]`, `[Your Name]`, etc.)
- ✅ Variables work in both content and subject lines
- ✅ Works for both manual send and scheduled send

The emails should now have the correct background colors AND all variables should be properly replaced! 🎉
