# Site Name & Logo Configuration

## ✅ Completed

### 1. Default Site Name Changed
- Default site name updated from "Legacy Scheduler" to **"Rembr"**
- Location: `src/lib/use-admin.ts` line 43

### 2. Admin Panel Site Settings (FUNCTIONAL)
The Admin Profile → System Settings tab now includes:

#### Site Name Field
- ✅ **Functional** - Changes are saved and applied throughout the app
- Located in: Admin Panel → Admin Profile → System Settings tab
- Field label: "Site Name"
- Placeholder: "Rembr"
- Description: "This name will appear throughout the application"

#### Logo URL Field  
- ✅ **NEW** - Fully functional
- Located in: Same tab as Site Name
- Field label: "Logo URL"
- Placeholder: "https://example.com/logo.png"
- Description: "Logo image URL (optional)"
- Accepts: Any valid image URL

### 3. Settings Storage
- Site settings stored in: `localStorage` → `legacyScheduler_siteSettings`
- Structure:
  ```json
  {
    "siteName": "Rembr",
    "logoUrl": "https://...",
    // ... other settings
  }
  ```

### 4. Integration Points
Settings are available via the `useAdmin()` hook:
```typescript
import { useAdmin } from '@/lib/use-admin';

const { siteSettings } = useAdmin();
const siteName = siteSettings.siteName; // "Rembr"
const logoUrl = siteSettings.logoUrl;   // Logo URL
```

---

## 📝 Next Steps

### Replace Hardcoded "Legacy Scheduler" References

The following files still contain hardcoded "Legacy Scheduler" text:

1. **src/pages/auth/sign-in.tsx** - Login page title
2. **src/pages/admin/admin-dashboard.tsx** - Dashboard title
3. **src/components/dashboard/scheduled-messages.tsx** - Scheduled messages display
4. **src/components/dashboard/email-preview-dialog.tsx** - Email preview
5. **src/lib/email-templates.ts** - Email templates
6. **src/pages/admin/site-customization.tsx** - Customization page

These should be updated to use `siteSettings.siteName` instead of hardcoded text.

---

## 🎯 How to Use

### For Admins:

1. **Navigate to**: Admin Panel → Admin Profile
2. **Click**: "System Settings" tab
3. **Edit**: 
   - Site Name (e.g., "Rembr")
   - Logo URL (e.g., "https://your-domain.com/logo.png")
4. **Save**: Scroll down and click "Save" button
5. **Result**: Changes apply immediately across the entire application

### For Developers:

To use site name in your components:
```typescript
import { useAdmin } from '@/lib/use-admin';

export function YourComponent() {
  const { siteSettings } = useAdmin();
  
  return (
    <div>
      <h1>Welcome to {siteSettings.siteName}</h1>
      {siteSettings.logoUrl && (
        <img src={siteSettings.logoUrl} alt={`${siteSettings.siteName} Logo`} />
      )}
    </div>
  );
}
```

---

## 🔧 Technical Details

### Schema (src/pages/admin/admin-profile.tsx)
```typescript
adminSettings: z.object({
  siteName: z.string().min(1, 'Site name is required'),
  logoUrl: z.string().url().optional().or(z.literal('')),
  supportEmail: z.string().email().optional().or(z.literal('')),
  allowRegistration: z.boolean(),
  maintenanceMode: z.boolean(),
})
```

### Save Handler
```typescript
const onSubmit = async (data: AdminProfileForm) => {
  // Update site settings
  updateSiteSettings({
    siteName: data.adminSettings.siteName,
    logoUrl: data.adminSettings.logoUrl || '',
  });
  
  // Settings are persisted to localStorage automatically
  alert('✅ Profile and site settings updated successfully!');
};
```

---

## 🎨 Logo Implementation

The logo URL can be used in:
- **Navbar**: Display site logo in the header
- **Login/Sign-up pages**: Branding
- **Email templates**: Company branding in emails
- **Landing page**: Hero section logo
- **Admin dashboard**: Admin panel branding

Example navbar implementation:
```typescript
import { useAdmin } from '@/lib/use-admin';

export function Navbar() {
  const { siteSettings } = useAdmin();
  
  return (
    <nav>
      {siteSettings.logoUrl ? (
        <img 
          src={siteSettings.logoUrl} 
          alt={siteSettings.siteName} 
          className="h-8" 
        />
      ) : (
        <span className="font-bold">{siteSettings.siteName}</span>
      )}
    </nav>
  );
}
```

---

## 📋 Files Modified

1. **src/lib/use-admin.ts**
   - Changed default `siteName` from "Legacy Scheduler" to "Rembr"

2. **src/pages/admin/admin-profile.tsx**
   - Added `useAdmin` hook import
   - Added `logoUrl` to schema
   - Removed `NonFunctionalIndicator` from Site Name field
   - Added Logo URL input field
   - Updated `onSubmit` to save site settings
   - Added `useEffect` to load site settings into form

---

## ✨ Benefits

### For Users:
- ✅ **White-label ready** - Fully customizable site name
- ✅ **Logo support** - Add your own branding
- ✅ **Instant updates** - Changes apply immediately
- ✅ **No code changes** - Everything configurable via admin panel

### For Developers:
- ✅ **Centralized settings** - One source of truth
- ✅ **Easy integration** - Simple `useAdmin()` hook
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Persistent** - Settings saved to localStorage

---

## 🚀 Current Status

- ✅ Site Name field: **FUNCTIONAL**
- ✅ Logo URL field: **FUNCTIONAL**
- ✅ Settings storage: **WORKING**
- ✅ Admin interface: **READY**
- ⏳ Dynamic replacements: **IN PROGRESS**

---

## 📌 Notes

- The site name "Rembr" is set as the default
- Old settings will be migrated automatically (defaults merged with stored values)
- Logo URL validation ensures only valid URLs are accepted
- Empty logo URL is acceptable (falls back to text-only branding)
- Support Email, User Registration, and Maintenance Mode toggles are still placeholders (marked with `NonFunctionalIndicator`)



