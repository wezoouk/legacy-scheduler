import { useState, useEffect } from 'react';
import { useAuth } from './auth-context';

interface SiteSettings {
  heroVideoUrl: string;
  heroBackgroundColor: string;
  heroTextColor: string;
  heroSubtextColor: string;
  heroOverlayOpacity?: number; // 0..1 black overlay on hero
  heroMediaOpacity?: number; // 0..1 opacity for background media
  heroLayout?: 'boxed' | 'full'; // content width mode
  primaryFont: string;
  heroFont: string;
  primaryColor: string;
  logoUrl: string;
  siteName: string;
  heroTitle: string;
  heroSubtitle: string;
  heroTitleSize?: string; // e.g., '3rem', '48px'
  heroSubtitleSize?: string; // e.g., '1.5rem', '24px'
  heroTitleWeight?: string; // e.g., '400', '700', 'bold'
  heroSubtitleWeight?: string;
  heroTitleLetterSpacing?: string; // e.g., '0.05em', '2px'
  heroSubtitleLetterSpacing?: string;
  heroTitleTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  heroSubtitleTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  email_from_display?: string; // e.g., "Rembr - David West"
  email_reply_to?: string; // optional override (server may enforce)
}

const defaultSiteSettings: SiteSettings = {
  heroVideoUrl: '',
  heroBackgroundColor: '#ffffff',
  heroTextColor: '#0f172a',
  heroSubtextColor: '#64748b',
  heroOverlayOpacity: 0.2,
  heroMediaOpacity: 0.3,
  heroLayout: 'boxed',
  primaryFont: 'Inter',
  heroFont: 'Inter',
  primaryColor: '#0f172a',
  logoUrl: '',
  siteName: 'Rembr',
  heroTitle: 'Send messages. Forever.',
  heroSubtitle: 'Elegant scheduled messaging for legacy and care.',
  heroTitleSize: '3.75rem',
  heroSubtitleSize: '1.5rem',
  heroTitleWeight: '800',
  heroSubtitleWeight: '400',
  heroTitleLetterSpacing: 'normal',
  heroSubtitleLetterSpacing: 'normal',
  heroTitleTransform: 'none',
  heroSubtitleTransform: 'none',
  email_from_display: '',
  email_reply_to: '',
};

export function useAdmin() {
  const { user } = useAuth();
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);

  // Admin check: Must have BOTH LEGACY plan AND be in the admin email list
  const isAdmin = user?.plan === 'LEGACY' && user?.email ? 
    ['davwez@gmail.com', 'davwez88@gmail.com'].includes(user.email.toLowerCase()) : 
    false;

  useEffect(() => {
    // Load site settings from localStorage
    try {
      const stored = localStorage.getItem('legacyScheduler_siteSettings');
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        setSiteSettings({ ...defaultSiteSettings, ...parsedSettings });
      }
    } catch (error) {
      console.error('Error loading site settings:', error);
      setSiteSettings(defaultSiteSettings);
    }
  }, []);

  const updateSiteSettings = (newSettings: Partial<SiteSettings>) => {
    const updated = { ...siteSettings, ...newSettings };
    setSiteSettings(updated);
    localStorage.setItem('legacyScheduler_siteSettings', JSON.stringify(updated));
  };

  const getAdminStats = () => {
    // Get stats from localStorage
    try {
      const messagesData = localStorage.getItem(`messages_${user?.id}`);
      const recipientsData = localStorage.getItem(`recipients_${user?.id}`);
      
      const messages = messagesData ? JSON.parse(messagesData) : [];
      const recipients = recipientsData ? JSON.parse(recipientsData) : [];
      
      return {
        totalUsers: 1, // Current user
        totalMessages: messages.length,
        totalRecipients: recipients.length,
        activeScheduled: messages.filter((m: any) => m.status === 'SCHEDULED').length,
      };
    } catch (error) {
      console.error('Error getting admin stats:', error);
      return {
        totalUsers: 0,
        totalMessages: 0,
        totalRecipients: 0,
        activeScheduled: 0,
      };
    }
  };

  return {
    siteSettings,
    updateSiteSettings,
    isAdmin,
    getAdminStats,
  };
}