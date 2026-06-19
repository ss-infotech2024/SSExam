import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  Shield,
  Bell,
  Mail,
  Globe,
  Lock,
  Users,
  Database,
  Key,
  Save,
  RefreshCw,
  ToggleLeft,
  Sliders,
  Clock,
  Camera,
  Mic,
  Monitor,
  Download,
  Upload
} from "lucide-react";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState({
    general: {
      systemName: "SS Exam Portal",
      supportEmail: "support@examportal.com",
      timezone: "Asia/Kolkata",
      dateFormat: "DD/MM/YYYY",
      maintenanceMode: false,
      debugMode: false
    },
    security: {
      passwordExpiry: 90,
      maxLoginAttempts: 5,
      sessionTimeout: 60,
      twoFactorAuth: true,
      ipWhitelisting: false,
      forceStrongPassword: true
    },
    exam: {
      defaultDuration: 120,
      autoSubmit: true,
      allowReview: false,
      showResults: false,
      proctoringEnabled: true,
      maxViolations: 3,
      cameraRequired: true,
      microphoneRequired: true,
      fullScreenRequired: true
    },
    notifications: {
      emailAlerts: true,
      examReminders: true,
      systemUpdates: true,
      securityAlerts: true,
      reportGeneration: false
    }
  });

  const tabs = [
    { id: "general", label: "General", icon: SettingsIcon },
    { id: "security", label: "Security", icon: Shield },
    { id: "exam", label: "Exam Settings", icon: Monitor },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "database", label: "Database", icon: Database },
  ];

  const renderGeneral = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">System Name</label>
          <input 
            type="text" 
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            value={settings.general.systemName}
            onChange={(e) => handleSettingChange('general', 'systemName', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Support Email</label>
          <input 
            type="email" 
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            value={settings.general.supportEmail}
            onChange={(e) => handleSettingChange('general', 'supportEmail', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Timezone</label>
          <select className="w-full border rounded-lg px-3 py-2">
            <option>Asia/Kolkata</option>
            <option>America/New_York</option>
            <option>Europe/London</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date Format</label>
          <select className="w-full border rounded-lg px-3 py-2">
            <option>DD/MM/YYYY</option>
            <option>MM/DD/YYYY</option>
            <option>YYYY-MM-DD</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <p className="font-medium">Maintenance Mode</p>
            <p className="text-sm text-gray-500">Put the system in maintenance mode</p>
          </div>
          <ToggleLeft className={`w-8 h-8 ${settings.general.maintenanceMode ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <p className="font-medium">Debug Mode</p>
            <p className="text-sm text-gray-500">Enable debug logging</p>
          </div>
          <ToggleLeft className={`w-8 h-8 ${settings.general.debugMode ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Password Expiry (days)</label>
          <input type="number" className="w-full border rounded-lg px-3 py-2" value={settings.security.passwordExpiry} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Max Login Attempts</label>
          <input type="number" className="w-full border rounded-lg px-3 py-2" value={settings.security.maxLoginAttempts} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Session Timeout (minutes)</label>
          <input type="number" className="w-full border rounded-lg px-3 py-2" value={settings.security.sessionTimeout} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <p className="font-medium">Two-Factor Authentication</p>
            <p className="text-sm text-gray-500">Require 2FA for admin accounts</p>
          </div>
          <ToggleLeft className={`w-8 h-8 ${settings.security.twoFactorAuth ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <p className="font-medium">IP Whitelisting</p>
            <p className="text-sm text-gray-500">Restrict access to specific IPs</p>
          </div>
          <ToggleLeft className={`w-8 h-8 ${settings.security.ipWhitelisting ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <p className="font-medium">Strong Passwords</p>
            <p className="text-sm text-gray-500">Enforce strong password policy</p>
          </div>
          <ToggleLeft className={`w-8 h-8 ${settings.security.forceStrongPassword ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
      </div>
    </div>
  );

  const renderExam = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Default Exam Duration (minutes)</label>
          <input type="number" className="w-full border rounded-lg px-3 py-2" value={settings.exam.defaultDuration} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Max Violations</label>
          <input type="number" className="w-full border rounded-lg px-3 py-2" value={settings.exam.maxViolations} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium">Auto Submit</p>
              <p className="text-sm text-gray-500">Auto-submit exam when time expires</p>
            </div>
          </div>
          <ToggleLeft className={`w-8 h-8 ${settings.exam.autoSubmit ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center space-x-3">
            <Camera className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium">Camera Required</p>
              <p className="text-sm text-gray-500">Require camera access for exams</p>
            </div>
          </div>
          <ToggleLeft className={`w-8 h-8 ${settings.exam.cameraRequired ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center space-x-3">
            <Mic className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium">Microphone Required</p>
              <p className="text-sm text-gray-500">Require microphone access for exams</p>
            </div>
          </div>
          <ToggleLeft className={`w-8 h-8 ${settings.exam.microphoneRequired ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center space-x-3">
            <Monitor className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium">Full Screen Required</p>
              <p className="text-sm text-gray-500">Force fullscreen during exam</p>
            </div>
          </div>
          <ToggleLeft className={`w-8 h-8 ${settings.exam.fullScreenRequired ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div>
          <p className="font-medium">Email Alerts</p>
          <p className="text-sm text-gray-500">Receive email notifications</p>
        </div>
        <ToggleLeft className={`w-8 h-8 ${settings.notifications.emailAlerts ? 'text-blue-600' : 'text-gray-400'}`} />
      </div>
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div>
          <p className="font-medium">Exam Reminders</p>
          <p className="text-sm text-gray-500">Send reminders for upcoming exams</p>
        </div>
        <ToggleLeft className={`w-8 h-8 ${settings.notifications.examReminders ? 'text-blue-600' : 'text-gray-400'}`} />
      </div>
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div>
          <p className="font-medium">System Updates</p>
          <p className="text-sm text-gray-500">Notify about system updates</p>
        </div>
        <ToggleLeft className={`w-8 h-8 ${settings.notifications.systemUpdates ? 'text-blue-600' : 'text-gray-400'}`} />
      </div>
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div>
          <p className="font-medium">Security Alerts</p>
          <p className="text-sm text-gray-500">Alert on security events</p>
        </div>
        <ToggleLeft className={`w-8 h-8 ${settings.notifications.securityAlerts ? 'text-blue-600' : 'text-gray-400'}`} />
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
          <p className="text-gray-500 mt-1">Configure system preferences and security</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
            <span>Reset</span>
          </button>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="border-b">
        <div className="flex space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Settings Content */}
      <div className="bg-white rounded-xl shadow-sm p-6 border">
        {activeTab === "general" && renderGeneral()}
        {activeTab === "security" && renderSecurity()}
        {activeTab === "exam" && renderExam()}
        {activeTab === "notifications" && renderNotifications()}
        {activeTab === "database" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Database Management</h3>
            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                <Download className="w-5 h-5" />
                <span>Backup Database</span>
              </button>
              <button className="flex items-center justify-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                <Upload className="w-5 h-5" />
                <span>Restore Database</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;