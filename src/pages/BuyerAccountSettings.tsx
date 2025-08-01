import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Settings, User, Bell, Lock, CreditCard, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

const BuyerAccountSettingsPage = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState({
    fullName: profile?.full_name || '',
    email: profile?.email || '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    notifications: {
      newListings: true,
      priceChanges: true,
      marketUpdates: false,
      agentMessages: true,
      appointmentReminders: true
    },
    privacy: {
      profileVisible: true,
      showActivityStatus: false,
      allowMarketing: false
    }
  });

  const handleNotificationChange = (key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  };

  const handlePrivacyChange = (key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: value
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="text-gray-300 hover:text-primary border-white/20 hover:border-primary/30"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Account Settings</h1>
        </div>

        {/* Personal Information */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
            <CardDescription className="text-gray-300">
              Update your personal details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={settings.fullName}
                  onChange={(e) => setSettings(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
              <input
                type="tel"
                value={settings.phone}
                onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Password Security */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Password & Security
            </CardTitle>
            <CardDescription className="text-gray-300">
              Change your password and security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={settings.currentPassword}
                  onChange={(e) => setSettings(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={settings.newPassword}
                  onChange={(e) => setSettings(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={settings.confirmPassword}
                  onChange={(e) => setSettings(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notification Preferences
            </CardTitle>
            <CardDescription className="text-gray-300">
              Choose what notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(settings.notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                <div>
                  <h4 className="text-white font-medium">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </h4>
                  <p className="text-sm text-gray-400">
                    {key === 'newListings' && 'Get notified when new properties match your criteria'}
                    {key === 'priceChanges' && 'Alerts when saved properties change price'}
                    {key === 'marketUpdates' && 'Weekly market trends and insights'}
                    {key === 'agentMessages' && 'Notifications for new messages from agents'}
                    {key === 'appointmentReminders' && 'Reminders for upcoming property viewings'}
                  </p>
                </div>
                <button
                  onClick={() => handleNotificationChange(key, !value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-primary' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Privacy Settings
            </CardTitle>
            <CardDescription className="text-gray-300">
              Control your privacy and data sharing preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(settings.privacy).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                <div>
                  <h4 className="text-white font-medium">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </h4>
                  <p className="text-sm text-gray-400">
                    {key === 'profileVisible' && 'Allow agents to see your profile information'}
                    {key === 'showActivityStatus' && 'Show when you\'re online and active'}
                    {key === 'allowMarketing' && 'Receive marketing emails about new features'}
                  </p>
                </div>
                <button
                  onClick={() => handlePrivacyChange(key, !value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-primary' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button className="flex-1">
            Save Changes
          </Button>
          <Button variant="outline" className="text-gray-300 hover:text-primary">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BuyerAccountSettingsPage;