import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { addAuditLog } from '@/lib/audit-log';
import {
  getSecuritySettings,
  saveSecuritySettings,
  blockIP,
  unblockIP,
  blockCountry,
  unblockCountry,
  COUNTRIES,
  type SecuritySettings as SecuritySettingsType,
} from '@/lib/security-blocklist';
import {
  Shield,
  Globe,
  Ban,
  Plus,
  Trash2,
  AlertTriangle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { format } from 'date-fns';

const ipSchema = z.object({
  ip: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, 'Invalid IP address format'),
  reason: z.string().min(1, 'Reason is required'),
});

const countrySchema = z.object({
  countryCode: z.string().min(2).max(2),
  reason: z.string().min(1, 'Reason is required'),
});

export function SecurityBlocklist() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SecuritySettingsType | null>(null);
  const [showIPForm, setShowIPForm] = useState(false);
  const [showCountryForm, setShowCountryForm] = useState(false);

  const {
    register: registerIP,
    handleSubmit: handleSubmitIP,
    reset: resetIP,
    formState: { errors: errorsIP },
  } = useForm({
    resolver: zodResolver(ipSchema),
  });

  const {
    register: registerCountry,
    handleSubmit: handleSubmitCountry,
    reset: resetCountry,
    formState: { errors: errorsCountry },
  } = useForm({
    resolver: zodResolver(countrySchema),
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const loaded = getSecuritySettings();
    setSettings(loaded);
  };

  const handleBlockIP = (data: any) => {
    if (!user) return;
    
    blockIP(data.ip, data.reason, user.id);
    addAuditLog(user.id, user.email, 'settings_change' as any, 'success', `Blocked IP: ${data.ip}`);
    
    resetIP();
    setShowIPForm(false);
    loadSettings();
  };

  const handleUnblockIP = (id: string, ip: string) => {
    if (!user) return;
    
    unblockIP(id);
    addAuditLog(user.id, user.email, 'settings_change' as any, 'success', `Unblocked IP: ${ip}`);
    loadSettings();
  };

  const handleBlockCountry = (data: any) => {
    if (!user) return;
    
    const country = COUNTRIES.find(c => c.code === data.countryCode);
    if (!country) return;
    
    blockCountry(data.countryCode, country.name, data.reason, user.id);
    addAuditLog(user.id, user.email, 'settings_change' as any, 'success', `Blocked country: ${country.name}`);
    
    resetCountry();
    setShowCountryForm(false);
    loadSettings();
  };

  const handleUnblockCountry = (id: string, countryName: string) => {
    if (!user) return;
    
    unblockCountry(id);
    addAuditLog(user.id, user.email, 'settings_change' as any, 'success', `Unblocked country: ${countryName}`);
    loadSettings();
  };

  const handleToggleSetting = (key: keyof SecuritySettingsType) => {
    if (!settings || !user) return;
    
    const updated = {
      ...settings,
      [key]: !settings[key],
    };
    
    saveSecuritySettings(updated);
    addAuditLog(user.id, user.email, 'settings_change' as any, 'success', `Changed ${key} to ${updated[key]}`);
    setSettings(updated);
  };

  if (!user || user.plan !== 'LEGACY') {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  if (!settings) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Security & Access Control</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage IP blocking, country restrictions, and security settings
        </p>
      </div>

      {/* Warning Alert */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-200">Server-Side Implementation Required</h3>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                Rules are saved but require server-side middleware to enforce blocking. 
                Configure your edge functions or CDN to check these rules.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Configure global security and access controls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
            <div>
              <h4 className="font-medium dark:text-white">Block VPN Connections</h4>
              <p className="text-sm text-muted-foreground">Prevent access from known VPN services</p>
            </div>
              <Button
                variant={settings.blockVPN ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => handleToggleSetting('blockVPN')}
              >
                {settings.blockVPN ? <Ban className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {settings.blockVPN ? 'Blocking' : 'Allowing'}
              </Button>
          </div>

          <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
            <div>
              <h4 className="font-medium dark:text-white">Block Tor Network</h4>
              <p className="text-sm text-muted-foreground">Prevent access from Tor exit nodes</p>
            </div>
              <Button
                variant={settings.blockTor ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => handleToggleSetting('blockTor')}
              >
                {settings.blockTor ? <Ban className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {settings.blockTor ? 'Blocking' : 'Allowing'}
              </Button>
          </div>

          <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
            <div>
              <h4 className="font-medium dark:text-white">Require Email Verification</h4>
              <p className="text-sm text-muted-foreground">Users must verify email before access</p>
            </div>
            <Button
              variant={settings.requireEmailVerification ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleToggleSetting('requireEmailVerification')}
            >
              {settings.requireEmailVerification ? <Lock className="h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
              {settings.requireEmailVerification ? 'Required' : 'Optional'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Blocked IPs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Ban className="h-5 w-5 mr-2" />
                Blocked IP Addresses
              </CardTitle>
              <CardDescription>
                {settings.blockedIPs.length} IP{settings.blockedIPs.length !== 1 ? 's' : ''} blocked
              </CardDescription>
            </div>
            <Button onClick={() => setShowIPForm(!showIPForm)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Block IP
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showIPForm && (
            <form onSubmit={handleSubmitIP(handleBlockIP)} className="p-4 border dark:border-gray-700 rounded-lg space-y-4 bg-gray-50 dark:bg-gray-800/50">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ip">IP Address</Label>
                  <Input
                    id="ip"
                    placeholder="192.168.1.1"
                    {...registerIP('ip')}
                  />
                  {errorsIP.ip && (
                    <p className="text-sm text-destructive">{errorsIP.ip.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                    id="reason"
                    placeholder="Suspicious activity"
                    {...registerIP('reason')}
                  />
                  {errorsIP.reason && (
                    <p className="text-sm text-destructive">{errorsIP.reason.message}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowIPForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="destructive">
                  <Ban className="h-4 w-4 mr-2" />
                  Block IP
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {settings.blockedIPs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No blocked IPs. Click "Block IP" to add one.
              </p>
            ) : (
              settings.blockedIPs.map((blocked) => (
                <div
                  key={blocked.id}
                  className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <code className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                        {blocked.ip}
                      </code>
                      <Badge variant="destructive" className="text-xs">Blocked</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {blocked.reason} • {format(blocked.blockedAt, 'PPp')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnblockIP(blocked.id, blocked.ip)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Blocked Countries */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Blocked Countries
              </CardTitle>
              <CardDescription>
                {settings.blockedCountries.length} countr{settings.blockedCountries.length !== 1 ? 'ies' : 'y'} blocked
              </CardDescription>
            </div>
            <Button onClick={() => setShowCountryForm(!showCountryForm)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Block Country
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showCountryForm && (
            <form onSubmit={handleSubmitCountry(handleBlockCountry)} className="p-4 border dark:border-gray-700 rounded-lg space-y-4 bg-gray-50 dark:bg-gray-800/50">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="countryCode">Country</Label>
                  <select
                    id="countryCode"
                    {...registerCountry('countryCode')}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
                  >
                    <option value="">Select a country</option>
                    {COUNTRIES.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.name} ({country.code})
                      </option>
                    ))}
                  </select>
                  {errorsCountry.countryCode && (
                    <p className="text-sm text-destructive">{errorsCountry.countryCode.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="countryReason">Reason</Label>
                  <Input
                    id="countryReason"
                    placeholder="Security policy"
                    {...registerCountry('reason')}
                  />
                  {errorsCountry.reason && (
                    <p className="text-sm text-destructive">{errorsCountry.reason.message}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCountryForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="destructive">
                  <Ban className="h-4 w-4 mr-2" />
                  Block Country
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {settings.blockedCountries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No blocked countries. Click "Block Country" to add one.
              </p>
            ) : (
              settings.blockedCountries.map((blocked) => (
                <div
                  key={blocked.id}
                  className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {blocked.countryName}
                      </span>
                      <code className="text-xs font-mono text-gray-600 dark:text-gray-400">
                        {blocked.countryCode}
                      </code>
                      <Badge variant="destructive" className="text-xs">Blocked</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {blocked.reason} • {format(blocked.blockedAt, 'PPp')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnblockCountry(blocked.id, blocked.countryName)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


