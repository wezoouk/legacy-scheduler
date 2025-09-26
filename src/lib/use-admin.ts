import { useState, useEffect } from 'react';
import { useAuth } from './auth-context';

interface SiteSettings {
  heroVideoUrl: string;
  heroBackgroundColor: string;
  heroTextColor: string;
  heroSubtextColor: string;
  primaryFont: string;
  heroFont: string;
  primaryColor: string;
  logoUrl: string;
  siteName: string;
  heroTitle: string;
  heroSubtitle: string;
}

const defaultSiteSettings: SiteSettings = {
  heroVideoUrl: '',
  heroBackgroundColor: '#ffffff',
  heroTextColor: '#0f172a',
  heroSubtextColor: '#64748b',
  primaryFont: 'Inter',
  heroFont: 'Inter',
  primaryColor: '#0f172a',
  logoUrl: '',
  siteName: 'Legacy Scheduler',
  heroTitle: 'Send messages. Forever.',
  heroSubtitle: 'Elegant scheduled messaging for legacy and care.',
};

export function useAdmin() {
  const { user } = useAuth();
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);

  const isAdmin = user?.plan === 'LEGACY';

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