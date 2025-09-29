import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAdmin } from '@/lib/use-admin';
import { MediaService } from '@/lib/media-service';
import { 
  Palette, 
  Type, 
  Image, 
  Video, 
  Eye, 
  Save,
  Upload,
  X
} from 'lucide-react';

const customizationSchema = z.object({
  siteName: z.string().min(1, 'Site name is required'),
  heroVideoUrl: z.string().url().optional().or(z.literal('')),
  heroBackgroundColor: z.string().min(1, 'Background color is required'),
  heroTextColor: z.string().min(1, 'Text color is required'),
  heroSubtextColor: z.string().min(1, 'Subtext color is required'),
  primaryFont: z.string().min(1, 'Font is required'),
  heroFont: z.string().min(1, 'Hero font is required'),
  primaryColor: z.string().min(1, 'Primary color is required'),
  logoUrl: z.string().url().optional().or(z.literal('')),
  // Email settings (optional)
  email_from_display: z.string().optional().or(z.literal('')),
  email_reply_to: z.string().optional().or(z.literal('')),
});

type CustomizationForm = z.infer<typeof customizationSchema>;

export function SiteCustomization() {
  const { siteSettings, updateSiteSettings } = useAdmin();
  const [previewMode, setPreviewMode] = useState(false);
  const mountedRef = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomizationForm>({
    resolver: zodResolver(customizationSchema),
    defaultValues: siteSettings,
  });

  const watchedValues = watch();

  // Debounce auto-persist of customization changes so they survive refreshes
  useEffect(() => {
    const t = setTimeout(() => {
      // avoid immediate write on first mount to prevent clobbering stored values
      if (!mountedRef.current) {
        mountedRef.current = true;
        return;
      }
      try {
        updateSiteSettings(watchedValues);
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [watchedValues, updateSiteSettings]);

  // When siteSettings load/changes, sync the form so fields show saved values
  useEffect(() => {
    try {
      reset(siteSettings as any);
    } catch {}
  }, [siteSettings, reset]);

  // Get proper font family with fallbacks for web fonts
  const getFontFamily = (fontName: string) => {
    const fontFamilies = {
      'Inter': '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'Helvetica Neue': '"Helvetica Neue", Helvetica, Arial, sans-serif',
      'Arial': 'Arial, Helvetica, sans-serif',
      'Georgia': 'Georgia, "Times New Roman", serif',
      'Times New Roman': '"Times New Roman", Times, serif',
      'Roboto': '"Roboto", -apple-system, BlinkMacSystemFont, sans-serif',
      'Open Sans': '"Open Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      'Lato': '"Lato", -apple-system, BlinkMacSystemFont, sans-serif',
      'Montserrat': '"Montserrat", -apple-system, BlinkMacSystemFont, sans-serif',
      'Poppins': '"Poppins", -apple-system, BlinkMacSystemFont, sans-serif'
    };
    return fontFamilies[fontName as keyof typeof fontFamilies] || fontName;
  };

  const onSubmit = async (data: CustomizationForm) => {
    try {
      updateSiteSettings(data);
      alert('Site customization saved successfully!');
    } catch (err) {
      console.error('Failed to save customization:', err);
      alert('Failed to save customization');
    }
  };

  const fontOptions = [
    'Inter',
    'Helvetica Neue',
    'Arial',
    'Georgia',
    'Times New Roman',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Poppins'
  ];

  const resetToDefaults = () => {
    setValue('siteName', 'Legacy Scheduler');
    setValue('heroVideoUrl', '');
    setValue('heroBackgroundColor', '#ffffff');
    setValue('heroTextColor', '#0f172a');
    setValue('heroSubtextColor', '#64748b');
    setValue('primaryFont', 'Inter');
    setValue('heroFont', 'Inter');
    setValue('primaryColor', '#0f172a');
    setValue('logoUrl', '');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Site Customization</h1>
          <p className="text-gray-600 mt-2">
            Customize the appearance and branding of your Legacy Scheduler website
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {previewMode ? 'Hide Preview' : 'Preview Changes'}
          </Button>
          <Button variant="outline" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
        </div>
      </div>

      {previewMode && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Live Preview</CardTitle>
            <CardDescription className="text-blue-700">
              This shows how your changes will look on the homepage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="relative p-12 rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center"
              style={{
                backgroundColor: watchedValues.heroBackgroundColor,
                fontFamily: watchedValues.heroFont,
              }}
            >
              {watchedValues.heroVideoUrl && (
                <>
                  <video
                    autoPlay
                    muted
                    loop
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ opacity: watchedValues.heroMediaOpacity ?? 0.3 }}
                    src={watchedValues.heroVideoUrl}
                  />
                  <div className="absolute inset-0 bg-black" style={{ opacity: watchedValues.heroOverlayOpacity ?? 0.2 }} />
                </>
              )}
              <div className={`relative z-10 text-center ${watchedValues.heroLayout === 'full' ? 'max-w-7xl' : 'max-w-4xl'} mx-auto`}>
                <h1 
                  className="text-4xl font-bold mb-4"
                  style={{ color: watchedValues.heroTextColor }}
                >
                  Send messages. Forever.
                </h1>
                <p 
                  className="text-xl"
                  style={{ color: watchedValues.heroSubtextColor }}
                >
                  Elegant scheduled messaging for legacy and care
                </p>
                <button 
                  className="mt-6 px-6 py-3 rounded-full font-semibold text-white"
                  style={{ backgroundColor: watchedValues.primaryColor }}
                >
                  Create a Legacy
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Type className="w-5 h-5 mr-2" />
              Basic Settings
            </CardTitle>
            <CardDescription>
              Configure basic site information and branding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  placeholder="Legacy Scheduler"
                  {...register('siteName')}
                />
                {errors.siteName && (
                  <p className="text-sm text-destructive">{errors.siteName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL (Optional)</Label>
                <Input
                  id="logoUrl"
                  placeholder="https://example.com/logo.png"
                  {...register('logoUrl')}
                />
                {errors.logoUrl && (
                  <p className="text-sm text-destructive">{errors.logoUrl.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hero Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Video className="w-5 h-5 mr-2" />
              Hero Section
            </CardTitle>
            <CardDescription>
              Customize the main hero section appearance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="heroVideoUrl">Background Video (upload or URL)</Label>
              <Input
                id="heroVideoUrl"
                placeholder="https://example.com/hero-video.mp4"
                {...register('heroVideoUrl')}
              />
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="heroVideoUpload"
                    type="file"
                    accept="video/*,image/*"
                    className="hidden"
                    onChange={async (e) => {
                      if (!e.target.files || e.target.files.length === 0) return;
                      try {
                        const file = e.target.files[0];
                        const res = await MediaService.uploadAttachment(file);
                        // Update form and persist immediately so it survives refresh
                        setValue('heroVideoUrl', res.url, { shouldDirty: true });
                        try { updateSiteSettings({ heroVideoUrl: res.url }); } catch {}
                        alert('Hero background uploaded. URL set.');
                      } catch (err) {
                        console.error('Hero upload failed:', err);
                        alert('Upload failed');
                      } finally {
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('heroVideoUpload')?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> Upload Background
                  </Button>
                  {watchedValues.heroVideoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setValue('heroVideoUrl', '')}
                    >
                      <X className="w-4 h-4 mr-1" /> Remove
                    </Button>
                  )}
                </div>
              <p className="text-xs text-gray-500">
                Add a background video or image to make your hero section more engaging
              </p>
              {watchedValues.heroVideoUrl && (
                <div className="mt-3 p-2 border rounded-md bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-20 bg-black/10 overflow-hidden rounded">
                      {/* Show preview as image or video */}
                      {/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(watchedValues.heroVideoUrl) ? (
                        <img src={watchedValues.heroVideoUrl} className="w-full h-full object-cover" />
                      ) : (
                        <video src={watchedValues.heroVideoUrl} className="w-full h-full object-cover" muted autoPlay loop />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate" title={watchedValues.heroVideoUrl}>{watchedValues.heroVideoUrl}</div>
                      <div className="text-xs text-muted-foreground">Currently set hero background</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('heroVideoUpload')?.click()}>Replace</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setValue('heroVideoUrl', '')}>Remove</Button>
                    </div>
                  </div>
                </div>
              )}
              {errors.heroVideoUrl && (
                <p className="text-sm text-destructive">{errors.heroVideoUrl.message}</p>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="heroBackgroundColor">Background Color</Label>
                <div className="flex space-x-2">
                  <Input
                    id="heroBackgroundColor"
                    type="color"
                    className="w-16 h-10 p-1"
                    {...register('heroBackgroundColor')}
                  />
                  <Input
                    placeholder="#ffffff"
                    value={watchedValues.heroBackgroundColor}
                    onChange={(e) => setValue('heroBackgroundColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
                {errors.heroBackgroundColor && (
                  <p className="text-sm text-destructive">{errors.heroBackgroundColor.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="heroTextColor">Main Text Color</Label>
                <div className="flex space-x-2">
                  <Input
                    id="heroTextColor"
                    type="color"
                    className="w-16 h-10 p-1"
                    {...register('heroTextColor')}
                  />
                  <Input
                    placeholder="#0f172a"
                    value={watchedValues.heroTextColor}
                    onChange={(e) => setValue('heroTextColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
                {errors.heroTextColor && (
                  <p className="text-sm text-destructive">{errors.heroTextColor.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="heroSubtextColor">Subtext Color</Label>
                <div className="flex space-x-2">
                  <Input
                    id="heroSubtextColor"
                    type="color"
                    className="w-16 h-10 p-1"
                    {...register('heroSubtextColor')}
                  />
                  <Input
                    placeholder="#64748b"
                    value={watchedValues.heroSubtextColor}
                    onChange={(e) => setValue('heroSubtextColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
                {errors.heroSubtextColor && (
                  <p className="text-sm text-destructive">{errors.heroSubtextColor.message}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="heroMediaOpacity">Background Media Opacity</Label>
                <input
                  id="heroMediaOpacity"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={watchedValues.heroMediaOpacity ?? 0.3}
                  onChange={(e) => setValue('heroMediaOpacity', parseFloat(e.target.value), { shouldDirty: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heroOverlayOpacity">Overlay Darkness</Label>
                <input
                  id="heroOverlayOpacity"
                  type="range"
                  min={0}
                  max={0.8}
                  step={0.05}
                  value={watchedValues.heroOverlayOpacity ?? 0.2}
                  onChange={(e) => setValue('heroOverlayOpacity', parseFloat(e.target.value), { shouldDirty: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hero Content Width</Label>
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name="heroLayout" checked={(watchedValues.heroLayout || 'boxed') === 'boxed'} onChange={() => setValue('heroLayout', 'boxed', { shouldDirty: true })} />
                  Boxed (default)
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="heroLayout" checked={(watchedValues.heroLayout || 'boxed') === 'full'} onChange={() => setValue('heroLayout', 'full', { shouldDirty: true })} />
                  Full width
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography & Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="w-5 h-5 mr-2" />
              Typography & Colors
            </CardTitle>
            <CardDescription>
              Set fonts and color scheme for your site
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryFont">Primary Font</Label>
                <select
                  {...register('primaryFont')}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                >
                  {fontOptions.map(font => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
                {errors.primaryFont && (
                  <p className="text-sm text-destructive">{errors.primaryFont.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="heroFont">Hero Section Font</Label>
                <select
                  {...register('heroFont')}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                >
                  {fontOptions.map(font => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
                {errors.heroFont && (
                  <p className="text-sm text-destructive">{errors.heroFont.message}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex space-x-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    className="w-16 h-10 p-1"
                    {...register('primaryColor')}
                  />
                  <Input
                    placeholder="#0f172a"
                    value={watchedValues.primaryColor}
                    onChange={(e) => setValue('primaryColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
                {errors.primaryColor && (
                  <p className="text-sm text-destructive">{errors.primaryColor.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Font Preview</Label>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Hero Section Font:</h4>
                  <div 
                    className="p-4 border rounded-lg"
                    style={{ fontFamily: getFontFamily(watchedValues.heroFont || 'Inter') }}
                  >
                    <h3 className="text-3xl font-bold mb-2">Send messages. Forever.</h3>
                    <p className="text-gray-600 text-lg">
                      Elegant scheduled messaging for legacy and care.
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Primary Site Font:</h4>
                  <div 
                    className="p-4 border rounded-lg"
                    style={{ fontFamily: getFontFamily(watchedValues.primaryFont || 'Inter') }}
                  >
                    <h3 className="text-xl font-bold mb-2">Sample Content Heading</h3>
                    <p className="text-gray-600">
                      This is how your chosen font will look across the rest of the website. 
                      Navigation, content, and interface elements will use this font.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Type className="w-5 h-5 mr-2" />
              Email Settings
            </CardTitle>
            <CardDescription>Control the sender display used in outgoing emails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email_from_display">Sender display (From)</Label>
                <Input
                  id="email_from_display"
                  placeholder="Rembr - Your Name"
                  value={(watchedValues as any).email_from_display || ''}
                  onChange={(e) => setValue('email_from_display' as any, e.target.value, { shouldDirty: true })}
                />
                <p className="text-xs text-muted-foreground">Shown in the inbox as the sender name. The email address is controlled by your server (Resend).</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_reply_to">Reply-To (optional)</Label>
                <Input
                  id="email_reply_to"
                  placeholder="noreply@sugarbox.uk"
                  value={(watchedValues as any).email_reply_to || ''}
                  onChange={(e) => setValue('email_reply_to' as any, e.target.value, { shouldDirty: true })}
                />
                <p className="text-xs text-muted-foreground">Where replies go. Your server may enforce a default Reply-To.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Commonly used customization shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setValue('heroBackgroundColor', '#000000');
                  setValue('heroTextColor', '#ffffff');
                  setValue('heroSubtextColor', '#e2e8f0');
                  setValue('heroFont', 'Inter');
                  setValue('primaryColor', '#3b82f6');
                }}
              >
                Dark Theme
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setValue('heroBackgroundColor', '#f8fafc');
                  setValue('heroTextColor', '#1e293b');
                  setValue('heroSubtextColor', '#64748b');
                  setValue('heroFont', 'Inter');
                  setValue('primaryColor', '#0f172a');
                }}
              >
                Light Theme
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setValue('heroBackgroundColor', '#1e40af');
                  setValue('heroTextColor', '#ffffff');
                  setValue('heroSubtextColor', '#dbeafe');
                  setValue('heroFont', 'Montserrat');
                  setValue('primaryColor', '#3b82f6');
                }}
              >
                Blue Theme
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // Light warm tone
                  setValue('heroBackgroundColor', '#fff7ed'); // warm cream (orange-50)
                  setValue('heroTextColor', '#1f2937'); // slate-800 for readability
                  setValue('heroSubtextColor', '#a16207'); // amber-600
                  setValue('heroFont', 'Georgia');
                  setValue('primaryColor', '#d97706'); // orange-600 accent
                }}
              >
                Warm Light
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting && <Save className="w-4 h-4 mr-2 animate-spin" />}
            {!isSubmitting && <Save className="w-4 h-4 mr-2" />}
            Save Customization
          </Button>
        </div>
      </form>
    </div>
  );
}