/**
 * IP and Country Blocklist Management
 * Manages blocked IPs, IP ranges, and countries for security
 */

export interface BlockedIP {
  id: string;
  ip: string;
  reason: string;
  blockedAt: Date;
  blockedBy: string;
}

export interface BlockedCountry {
  id: string;
  countryCode: string;
  countryName: string;
  reason: string;
  blockedAt: Date;
  blockedBy: string;
}

export interface SecuritySettings {
  blockedIPs: BlockedIP[];
  blockedCountries: BlockedCountry[];
  blockVPN: boolean;
  blockTor: boolean;
  requireEmailVerification: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number; // minutes
}

const STORAGE_KEY = 'legacyScheduler_securitySettings';

/**
 * Get security settings
 */
export function getSecuritySettings(): SecuritySettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      return {
        ...parsed,
        blockedIPs: parsed.blockedIPs?.map((ip: any) => ({
          ...ip,
          blockedAt: new Date(ip.blockedAt),
        })) || [],
        blockedCountries: parsed.blockedCountries?.map((country: any) => ({
          ...country,
          blockedAt: new Date(country.blockedAt),
        })) || [],
      };
    }
  } catch (err) {
    console.error('Failed to load security settings:', err);
  }
  
  return {
    blockedIPs: [],
    blockedCountries: [],
    blockVPN: false,
    blockTor: false,
    requireEmailVerification: true,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
  };
}

/**
 * Save security settings
 */
export function saveSecuritySettings(settings: SecuritySettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save security settings:', err);
    throw err;
  }
}

/**
 * Block an IP address
 */
export function blockIP(ip: string, reason: string, userId: string): void {
  const settings = getSecuritySettings();
  
  const newBlock: BlockedIP = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ip,
    reason,
    blockedAt: new Date(),
    blockedBy: userId,
  };
  
  settings.blockedIPs.push(newBlock);
  saveSecuritySettings(settings);
}

/**
 * Unblock an IP address
 */
export function unblockIP(id: string): void {
  const settings = getSecuritySettings();
  settings.blockedIPs = settings.blockedIPs.filter(blocked => blocked.id !== id);
  saveSecuritySettings(settings);
}

/**
 * Block a country
 */
export function blockCountry(countryCode: string, countryName: string, reason: string, userId: string): void {
  const settings = getSecuritySettings();
  
  const newBlock: BlockedCountry = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    countryCode,
    countryName,
    reason,
    blockedAt: new Date(),
    blockedBy: userId,
  };
  
  settings.blockedCountries.push(newBlock);
  saveSecuritySettings(settings);
}

/**
 * Unblock a country
 */
export function unblockCountry(id: string): void {
  const settings = getSecuritySettings();
  settings.blockedCountries = settings.blockedCountries.filter(blocked => blocked.id !== id);
  saveSecuritySettings(settings);
}

/**
 * Check if an IP is blocked
 */
export function isIPBlocked(ip: string): boolean {
  const settings = getSecuritySettings();
  return settings.blockedIPs.some(blocked => blocked.ip === ip);
}

/**
 * Check if a country is blocked
 */
export function isCountryBlocked(countryCode: string): boolean {
  const settings = getSecuritySettings();
  return settings.blockedCountries.some(blocked => blocked.countryCode === countryCode);
}

/**
 * Common countries list
 */
export const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'IE', name: 'Ireland' },
  { code: 'PL', name: 'Poland' },
  { code: 'RO', name: 'Romania' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'PT', name: 'Portugal' },
  { code: 'GR', name: 'Greece' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'RU', name: 'Russia' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'TR', name: 'Turkey' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'IL', name: 'Israel' },
  { code: 'EG', name: 'Egypt' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'NZ', name: 'New Zealand' },
].sort((a, b) => a.name.localeCompare(b.name));



