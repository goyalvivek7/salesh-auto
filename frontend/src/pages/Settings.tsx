import { useState, useEffect } from 'react';
import { Save, Bell, Mail, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [emailSettings, setEmailSettings] = useState({
        smtpServer: '',
        smtpPort: '587',
        smtpUsername: '',
        smtpPassword: '',
        fromEmail: '',
        fromName: ''
    });

    const [generalSettings, setGeneralSettings] = useState({
        timezone: 'UTC',
        language: 'en',
        companyName: '',
        companyWebsite: ''
    });

    const [notificationSettings, setNotificationSettings] = useState({
        emailNotifications: true,
        replyNotifications: true,
        dailyReports: false,
        weeklyReports: true
    });

    // Fetch settings on mount
    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:8000/api/settings');
            if (!response.ok) throw new Error('Failed to fetch settings');

            const data = await response.json();

            // Update general settings
            setGeneralSettings({
                companyName: data.general.company_name || '',
                companyWebsite: data.general.company_website || '',
                timezone: data.general.timezone || 'UTC',
                language: data.general.language || 'en'
            });

            // Update email settings
            setEmailSettings({
                smtpServer: data.email.smtp_server || '',
                smtpPort: data.email.smtp_port || '587',
                smtpUsername: data.email.smtp_username || '',
                smtpPassword: data.email.smtp_password || '',
                fromEmail: data.email.from_email || '',
                fromName: data.email.from_name || ''
            });

            // Update notification settings
            setNotificationSettings({
                emailNotifications: data.notifications.email_notifications ?? true,
                replyNotifications: data.notifications.reply_notifications ?? true,
                dailyReports: data.notifications.daily_reports ?? false,
                weeklyReports: data.notifications.weekly_reports ?? true
            });
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEmailSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            const response = await fetch('http://localhost:8000/api/settings/email', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    smtp_server: emailSettings.smtpServer,
                    smtp_port: parseInt(emailSettings.smtpPort),
                    smtp_username: emailSettings.smtpUsername,
                    smtp_password: emailSettings.smtpPassword,
                    from_email: emailSettings.fromEmail,
                    from_name: emailSettings.fromName
                })
            });

            if (!response.ok) throw new Error('Failed to save email settings');

            toast.success('Email settings saved successfully');
        } catch (error) {
            console.error('Error saving email settings:', error);
            toast.error('Failed to save email settings');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveGeneralSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            const response = await fetch('http://localhost:8000/api/settings/general', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_name: generalSettings.companyName,
                    company_website: generalSettings.companyWebsite,
                    timezone: generalSettings.timezone,
                    language: generalSettings.language
                })
            });

            if (!response.ok) throw new Error('Failed to save general settings');

            toast.success('General settings saved successfully');
        } catch (error) {
            console.error('Error saving general settings:', error);
            toast.error('Failed to save general settings');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveNotifications = async () => {
        try {
            setSaving(true);
            const response = await fetch('http://localhost:8000/api/settings/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email_notifications: notificationSettings.emailNotifications,
                    reply_notifications: notificationSettings.replyNotifications,
                    daily_reports: notificationSettings.dailyReports,
                    weekly_reports: notificationSettings.weeklyReports
                })
            });

            if (!response.ok) throw new Error('Failed to save notification settings');

            toast.success('Notification preferences saved');
        } catch (error) {
            console.error('Error saving notification settings:', error);
            toast.error('Failed to save notification settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading settings...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Settings</h1>
                    <p className="text-gray-400">Manage your application settings and preferences</p>
                </div>
            </div>

            {/* General Settings */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg">
                        <Globe className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">General Settings</h2>
                        <p className="text-sm text-gray-400">Configure basic application settings</p>
                    </div>
                </div>

                <form onSubmit={handleSaveGeneralSettings} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Company Name
                            </label>
                            <input
                                type="text"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={generalSettings.companyName}
                                onChange={e => setGeneralSettings({ ...generalSettings, companyName: e.target.value })}
                                placeholder="Your Company Name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Company Website
                            </label>
                            <input
                                type="url"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={generalSettings.companyWebsite}
                                onChange={e => setGeneralSettings({ ...generalSettings, companyWebsite: e.target.value })}
                                placeholder="https://example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Timezone
                            </label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={generalSettings.timezone}
                                onChange={e => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
                            >
                                <option value="UTC">UTC</option>
                                <option value="America/New_York">Eastern Time</option>
                                <option value="America/Chicago">Central Time</option>
                                <option value="America/Denver">Mountain Time</option>
                                <option value="America/Los_Angeles">Pacific Time</option>
                                <option value="Asia/Kolkata">India Standard Time</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Language
                            </label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={generalSettings.language}
                                onChange={e => setGeneralSettings({ ...generalSettings, language: e.target.value })}
                            >
                                <option value="en">English</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                                <option value="de">German</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save General Settings'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Email Configuration */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-purple-500/20 text-purple-400 rounded-lg">
                        <Mail className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Email Configuration</h2>
                        <p className="text-sm text-gray-400">Configure SMTP settings for sending emails</p>
                    </div>
                </div>

                <form onSubmit={handleSaveEmailSettings} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                SMTP Server
                            </label>
                            <input
                                type="text"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={emailSettings.smtpServer}
                                onChange={e => setEmailSettings({ ...emailSettings, smtpServer: e.target.value })}
                                placeholder="smtp.gmail.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                SMTP Port
                            </label>
                            <input
                                type="text"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={emailSettings.smtpPort}
                                onChange={e => setEmailSettings({ ...emailSettings, smtpPort: e.target.value })}
                                placeholder="587"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                SMTP Username
                            </label>
                            <input
                                type="text"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={emailSettings.smtpUsername}
                                onChange={e => setEmailSettings({ ...emailSettings, smtpUsername: e.target.value })}
                                placeholder="your-email@gmail.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                SMTP Password
                            </label>
                            <input
                                type="password"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={emailSettings.smtpPassword}
                                onChange={e => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                From Email
                            </label>
                            <input
                                type="email"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={emailSettings.fromEmail}
                                onChange={e => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                                placeholder="noreply@yourcompany.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                From Name
                            </label>
                            <input
                                type="text"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={emailSettings.fromName}
                                onChange={e => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                                placeholder="Your Company"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Email Settings'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Notification Preferences */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-green-500/20 text-green-400 rounded-lg">
                        <Bell className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Notification Preferences</h2>
                        <p className="text-sm text-gray-400">Manage how you receive notifications</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                        <div>
                            <h3 className="text-white font-medium">Email Notifications</h3>
                            <p className="text-sm text-gray-400">Receive notifications via email</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notificationSettings.emailNotifications}
                                onChange={e => setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                        <div>
                            <h3 className="text-white font-medium">Reply Notifications</h3>
                            <p className="text-sm text-gray-400">Get notified when companies reply</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notificationSettings.replyNotifications}
                                onChange={e => setNotificationSettings({ ...notificationSettings, replyNotifications: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                        <div>
                            <h3 className="text-white font-medium">Daily Reports</h3>
                            <p className="text-sm text-gray-400">Receive daily automation reports</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notificationSettings.dailyReports}
                                onChange={e => setNotificationSettings({ ...notificationSettings, dailyReports: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                        <div>
                            <h3 className="text-white font-medium">Weekly Reports</h3>
                            <p className="text-sm text-gray-400">Receive weekly performance summaries</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notificationSettings.weeklyReports}
                                onChange={e => setNotificationSettings({ ...notificationSettings, weeklyReports: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSaveNotifications}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Notifications'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
