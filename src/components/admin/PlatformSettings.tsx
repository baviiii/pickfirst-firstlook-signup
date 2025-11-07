import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Settings, Mail, Bell, Shield, Database, Monitor, Globe, Cpu } from 'lucide-react';
import { toast } from 'sonner';
import { FeatureManagement } from './FeatureManagement';

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  defaultUserRole: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  autoApproval: boolean;
  maxFileSize: string;
  sessionTimeout: string;
  rateLimit: string;
  backupFrequency: string;
  logLevel: string;
  cacheEnabled: boolean;
  analyticsEnabled: boolean;
}

export const PlatformSettings = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    siteName: 'PickFirst Real Estate',
    siteDescription: 'Premier real estate platform connecting buyers and agents',
    maintenanceMode: false,
    allowRegistration: true,
    defaultUserRole: 'buyer',
    emailNotifications: true,
    pushNotifications: false,
    autoApproval: false,
    maxFileSize: '10MB',
    sessionTimeout: '24h',
    rateLimit: '100/hour',
    backupFrequency: 'daily',
    logLevel: 'info',
    cacheEnabled: true,
    analyticsEnabled: true,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Settings saved successfully');
    setIsSaving(false);
  };

  const handleReset = () => {
    setSettings({
      siteName: 'PickFirst Real Estate',
      siteDescription: 'Premier real estate platform connecting buyers and agents',
      maintenanceMode: false,
      allowRegistration: true,
      defaultUserRole: 'buyer',
      emailNotifications: true,
      pushNotifications: false,
      autoApproval: false,
      maxFileSize: '10MB',
      sessionTimeout: '24h',
      rateLimit: '100/hour',
      backupFrequency: 'daily',
      logLevel: 'info',
      cacheEnabled: true,
      analyticsEnabled: true,
    });
    toast.info('Settings reset to defaults');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="h-8 w-8 text-pickfirst-yellow" />
            Platform Settings
          </h1>
          <p className="text-gray-300 mt-2">Configure system-wide settings and preferences</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleReset} className="text-gray-300 hover:text-white">
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-pickfirst-yellow text-black hover:bg-pickfirst-yellow/90">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              General Settings
            </CardTitle>
            <CardDescription className="text-gray-300">Basic platform configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="siteName" className="text-white">Site Name</Label>
              <Input
                id="siteName"
                value={settings.siteName}
                onChange={(e) => setSettings(prev => ({ ...prev, siteName: e.target.value }))}
                className="bg-black/50 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="siteDescription" className="text-white">Site Description</Label>
              <Textarea
                id="siteDescription"
                value={settings.siteDescription}
                onChange={(e) => setSettings(prev => ({ ...prev, siteDescription: e.target.value }))}
                className="bg-black/50 border-gray-600 text-white"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="maintenanceMode" className="text-white">Maintenance Mode</Label>
                <p className="text-sm text-gray-400">Temporarily disable public access</p>
              </div>
              <Switch
                id="maintenanceMode"
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, maintenanceMode: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allowRegistration" className="text-white">Allow Registration</Label>
                <p className="text-sm text-gray-400">Enable new user sign-ups</p>
              </div>
              <Switch
                id="allowRegistration"
                checked={settings.allowRegistration}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, allowRegistration: checked }))}
              />
            </div>
            <div>
              <Label htmlFor="defaultUserRole" className="text-white">Default User Role</Label>
              <Select value={settings.defaultUserRole} onValueChange={(value) => setSettings(prev => ({ ...prev, defaultUserRole: value }))}>
                <SelectTrigger className="bg-black/50 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-green-500" />
              Notification Settings
            </CardTitle>
            <CardDescription className="text-gray-300">Configure notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailNotifications" className="text-white">Email Notifications</Label>
                <p className="text-sm text-gray-400">Send email alerts to users</p>
              </div>
              <Switch
                id="emailNotifications"
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailNotifications: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="pushNotifications" className="text-white">Push Notifications</Label>
                <p className="text-sm text-gray-400">Browser push notifications</p>
              </div>
              <Switch
                id="pushNotifications"
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, pushNotifications: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoApproval" className="text-white">Auto-Approval</Label>
                <p className="text-sm text-gray-400">Automatically approve listings</p>
              </div>
              <Switch
                id="autoApproval"
                checked={settings.autoApproval}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoApproval: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Configuration */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Cpu className="h-5 w-5 text-purple-500" />
              System Configuration
            </CardTitle>
            <CardDescription className="text-gray-300">Technical system settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="maxFileSize" className="text-white">Max File Upload Size</Label>
              <Select value={settings.maxFileSize} onValueChange={(value) => setSettings(prev => ({ ...prev, maxFileSize: value }))}>
                <SelectTrigger className="bg-black/50 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5MB">5MB</SelectItem>
                  <SelectItem value="10MB">10MB</SelectItem>
                  <SelectItem value="25MB">25MB</SelectItem>
                  <SelectItem value="50MB">50MB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sessionTimeout" className="text-white">Session Timeout</Label>
              <Select value={settings.sessionTimeout} onValueChange={(value) => setSettings(prev => ({ ...prev, sessionTimeout: value }))}>
                <SelectTrigger className="bg-black/50 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="8h">8 Hours</SelectItem>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rateLimit" className="text-white">API Rate Limit</Label>
              <Select value={settings.rateLimit} onValueChange={(value) => setSettings(prev => ({ ...prev, rateLimit: value }))}>
                <SelectTrigger className="bg-black/50 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60/hour">60 requests/hour</SelectItem>
                  <SelectItem value="100/hour">100 requests/hour</SelectItem>
                  <SelectItem value="500/hour">500 requests/hour</SelectItem>
                  <SelectItem value="1000/hour">1000 requests/hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="cacheEnabled" className="text-white">Enable Caching</Label>
                <p className="text-sm text-gray-400">Improve performance with caching</p>
              </div>
              <Switch
                id="cacheEnabled"
                checked={settings.cacheEnabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, cacheEnabled: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Database & Monitoring */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-orange-500" />
              Database & Monitoring
            </CardTitle>
            <CardDescription className="text-gray-300">Database and monitoring configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="backupFrequency" className="text-white">Backup Frequency</Label>
              <Select value={settings.backupFrequency} onValueChange={(value) => setSettings(prev => ({ ...prev, backupFrequency: value }))}>
                <SelectTrigger className="bg-black/50 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="logLevel" className="text-white">Log Level</Label>
              <Select value={settings.logLevel} onValueChange={(value) => setSettings(prev => ({ ...prev, logLevel: value }))}>
                <SelectTrigger className="bg-black/50 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="analyticsEnabled" className="text-white">Analytics Tracking</Label>
                <p className="text-sm text-gray-400">Enable usage analytics</p>
              </div>
              <Switch
                id="analyticsEnabled"
                checked={settings.analyticsEnabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, analyticsEnabled: checked }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Gate Management */}
      <div id="features" className="scroll-mt-6">
        <FeatureManagement />
      </div>

      {/* System Status */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Monitor className="h-5 w-5 text-cyan-500" />
            Current System Status
          </CardTitle>
          <CardDescription className="text-gray-300">Real-time system information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
              <span className="text-white">Server Status</span>
              <Badge className="bg-green-500 text-white">Online</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10">
              <span className="text-white">Database</span>
              <Badge className="bg-blue-500 text-white">Healthy</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10">
              <span className="text-white">Cache</span>
              <Badge className="bg-purple-500 text-white">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10">
              <span className="text-white">Queue</span>
              <Badge className="bg-orange-500 text-white">Processing</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};