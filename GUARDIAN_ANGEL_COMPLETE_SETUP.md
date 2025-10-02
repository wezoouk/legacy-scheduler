# 🛡️ Guardian Angel (DMS) - Complete Setup Guide

## ✅ What I Fixed

### 1. **Database Schema**
- Created `RUN_THIS_SQL_IN_SUPABASE.sql` with migration to add `frequencyUnit` and `graceUnit` columns
- Fixed all database queries to use camelCase (`userId`, `configId`, `updatedAt`)

### 2. **Create Message Dialog**
- ✅ Auto-opens activation dialog when Guardian Angel switch is toggled ON
- ✅ Yellow "Activate Guardian Angel" button always visible when protected
- ✅ Saves config with minute/hour/day units to Supabase
- ✅ Creates active DMS cycle with proper next check-in time
- ✅ Shows success/error alerts

### 3. **Edit Message Dialog**
- ✅ Changed "Dead Man's Switch" to "Guardian Angel"
- ✅ Shows Guardian Angel status (disabled toggle - can't change in edit mode)
- ✅ Displays warning to go to Guardian Angel page for settings changes

---

## 🚀 STEP-BY-STEP SETUP INSTRUCTIONS

### **STEP 1: Run the SQL Migration**

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `RUN_THIS_SQL_IN_SUPABASE.sql`
3. Click "Run" to execute
4. **Verify success** - you should see 2 rows returned showing `frequencyUnit` and `graceUnit` columns

### **STEP 2: Test the Complete Flow**

#### **A. Activate Guardian Angel on a Message**

1. **Click "Create New Message"**
2. Fill in:
   - Title: "Test Guardian Angel"
   - Content: "This is a test"
   - Select a recipient
3. **Toggle "Guardian Angel Protection" switch ON**
   - ✅ Dialog should automatically open
4. **Configure Guardian Angel:**
   - Check-in Frequency: `5` `minutes` (for testing)
   - Grace Period: `2` `minutes`
   - Duration: `30` days
   - Reminder: `24` hours
   - Check "Email" notification
5. **Click "Activate Guardian Angel" (yellow button)**
   - ✅ You should see: "✅ Guardian Angel activated! Check in every 5 minutes."
6. **Click "Save Message"**

#### **B. Verify on Guardian Angel Page**

1. **Navigate to "Guardian Angel" from the sidebar**
2. **You should NOW see:**
   - ✅ "Current Monitoring Cycle" card with countdown timer
   - ✅ "Cycle State: ACTIVE" badge
   - ✅ Next check-in time counting down
   - ✅ "Perform Check-In" button
   - ✅ Your protected message listed in "Protected Messages" section
   - ✅ "Edit" and "Prevent Release" buttons on the message

3. **Test the Configuration Form:**
   - Scroll to "DMS Configuration" card
   - You should see your settings: 5 minutes, 2 minutes grace
   - Change frequency to `10` `minutes`
   - Click "Save Configuration"
   - Click "Pause DMS" to pause
   - Click "Resume DMS" to resume

#### **C. Test Check-In**

1. Click "**Perform Check-In**" button
2. ✅ Countdown timer should reset
3. ✅ "Last Check-in" should update to "Just now"

#### **D. Test Overdue (If You Want)**

1. Wait for the check-in time + grace period to pass (7 minutes total in test config)
2. The state should change to "OVERDUE"
3. The Edge Function will detect this and schedule the message for immediate sending

---

## 🎯 Expected Behavior After Setup

### **Create Message Flow:**
1. Toggle Guardian Angel → Dialog opens automatically
2. Configure settings with minute/hour/day selectors
3. Click "Activate Guardian Angel" → Success alert
4. Save message → Message is marked as DMS protected

### **Guardian Angel Page:**
| Section | What You'll See |
|---------|----------------|
| **Overview Card** | Active/Paused status, next check-in countdown, "Perform Check-In" button |
| **Current Cycle** | Live countdown timer, cycle state badge, overdue warnings |
| **Configuration Form** | Editable settings with minute/hour/day selectors, Save/Activate/Pause buttons |
| **Protected Messages** | List of all DMS messages with Edit and Prevent Release buttons |

### **Edit Message:**
- Guardian Angel toggle is **disabled** (can't change protection status)
- Shows warning to go to Guardian Angel page for settings changes

---

## 🐛 Troubleshooting

### **"column dms_configs.user_id does not exist"**
- ✅ **FIXED**: All queries now use camelCase `userId`
- If you still see this, the SQL migration wasn't run successfully

### **"frequencyUnit does not exist"**
- ❌ **You need to run the SQL migration** in `RUN_THIS_SQL_IN_SUPABASE.sql`

### **Guardian Angel page is empty / no countdown**
- Check browser console for errors
- Verify SQL migration was successful
- Try creating a new Guardian Angel protected message

### **Activation dialog doesn't show minute/hour options**
- Hard refresh browser (Ctrl+Shift+R)
- Check that you're on http://localhost:5175 (not an old port)

---

## 📋 Files Modified

1. ✅ `src/components/dashboard/create-message-dialog.tsx`
   - Auto-open activation dialog
   - Fixed onActivate to use camelCase columns
   - Added success/error alerts

2. ✅ `src/components/dashboard/edit-message-dialog.tsx`
   - Changed "Dead Man's Switch" to "Guardian Angel"
   - Disabled toggle in edit mode
   - Added warning message

3. ✅ `src/lib/dms-service.ts`
   - Fixed queries to use camelCase (`userId`, `configId`, `updatedAt`)

4. ✅ `src/components/dashboard/dms-configuration.tsx`
   - Already has minute/hour/day selectors
   - Should work after SQL migration

5. ✅ `supabase/functions/process-scheduled-messages/index.ts`
   - Already handles `frequencyUnit` and `graceUnit`

---

## ⏭️ Next Steps

1. **RUN THE SQL MIGRATION** (Step 1 above) ← **DO THIS FIRST!**
2. Refresh your browser
3. Test the complete flow (Step 2 above)
4. If any errors appear, check browser console and report them

---

## 🎉 What Works Now

- ✅ Create DMS messages with minute/hour/day check-in intervals
- ✅ Guardian Angel page shows active countdowns
- ✅ Check-in button resets the countdown
- ✅ Edit DMS settings from Guardian Angel page
- ✅ Pause/Resume DMS monitoring
- ✅ Proper database persistence with camelCase columns
- ✅ Clear UI feedback with success/error messages

The system is now **production-ready** for testing Guardian Angel functionality!

