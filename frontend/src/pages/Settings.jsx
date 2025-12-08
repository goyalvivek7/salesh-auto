import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Mail,
  Bell,
  Building2,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import Button from "../components/Button";
import {
  getSettings,
  updateGeneralSettings,
  updateEmailSettings,
  // updateNotificationSettings,
} from "../services/api";

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [general, setGeneral] = useState({
    company_name: "",
    company_website: "",
    timezone: "Asia/Kolkata",
    language: "en",
  });

  const [email, setEmail] = useState({
    smtp_server: "",
    smtp_port: 587,
    smtp_username: "",
    smtp_password: "",
    from_email: "",
    from_name: "",
  });

  // const [notifications, setNotifications] = useState({
  //   email_notifications: true,
  //   reply_notifications: true,
  //   daily_reports: false,
  //   weekly_reports: true,
  // });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await getSettings();
      if (res.data.general) setGeneral(res.data.general);
      if (res.data.email) setEmail(res.data.email);
      // if (res.data.notifications) setNotifications(res.data.notifications);
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (activeTab === "general") {
        await updateGeneralSettings(general);
      } else if (activeTab === "email") {
        await updateEmailSettings(email);
      }
      // else if (activeTab === 'notifications') {
      //   await updateNotificationSettings(notifications);
      // }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "general", label: "General", icon: Building2 },
    { id: "email", label: "Email", icon: Mail },
    // { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage your account and application settings
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <tab.icon
                  className={`w-5 h-5 ${
                    activeTab === tab.id ? "text-indigo-600" : "text-gray-400"
                  }`}
                />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            {/* Success Message */}
            {saveSuccess && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <p className="text-sm text-emerald-700">
                  Settings saved successfully!
                </p>
              </div>
            )}

            {/* General Settings */}
            {activeTab === "general" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    General Settings
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={general.company_name}
                        onChange={(e) =>
                          setGeneral({
                            ...general,
                            company_name: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Your Company Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Website
                      </label>
                      <input
                        type="url"
                        value={general.company_website}
                        onChange={(e) =>
                          setGeneral({
                            ...general,
                            company_website: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="https://yourcompany.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Timezone
                      </label>
                      <select
                        value={general.timezone}
                        onChange={(e) =>
                          setGeneral({ ...general, timezone: e.target.value })
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="America/New_York">
                          America/New_York (EST)
                        </option>
                        <option value="America/Los_Angeles">
                          America/Los_Angeles (PST)
                        </option>
                        <option value="Europe/London">
                          Europe/London (GMT)
                        </option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Email Settings */}
            {activeTab === "email" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Email Settings
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Configure your SMTP server for sending emails
                  </p>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <p className="text-sm text-amber-700">
                        Email settings are typically configured via environment
                        variables. Changes here may not persist after server
                        restart.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SMTP Server
                      </label>
                      <input
                        type="text"
                        value={email.smtp_server}
                        onChange={(e) =>
                          setEmail({ ...email, smtp_server: e.target.value })
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SMTP Port
                      </label>
                      <input
                        type="number"
                        value={email.smtp_port}
                        onChange={(e) =>
                          setEmail({
                            ...email,
                            smtp_port: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="587"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={email.smtp_username}
                        onChange={(e) =>
                          setEmail({ ...email, smtp_username: e.target.value })
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={email.smtp_password}
                        onChange={(e) =>
                          setEmail({ ...email, smtp_password: e.target.value })
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        From Email
                      </label>
                      <input
                        type="email"
                        value={email.from_email}
                        onChange={(e) =>
                          setEmail({ ...email, from_email: e.target.value })
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="outreach@yourcompany.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        From Name
                      </label>
                      <input
                        type="text"
                        value={email.from_name}
                        onChange={(e) =>
                          setEmail({ ...email, from_name: e.target.value })
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Your Name"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {/* {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
                  <div className="space-y-4">
                    {[
                      { key: 'email_notifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
                      { key: 'reply_notifications', label: 'Reply Notifications', desc: 'Get notified when someone replies' },
                      { key: 'daily_reports', label: 'Daily Reports', desc: 'Receive daily summary emails' },
                      { key: 'weekly_reports', label: 'Weekly Reports', desc: 'Receive weekly performance reports' },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{item.label}</p>
                          <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications[item.key]}
                            onChange={(e) =>
                              setNotifications({ ...notifications, [item.key]: e.target.checked })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )} */}

            {/* Save Button */}
            <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end">
              <Button
                onClick={handleSave}
                loading={saving}
                icon={Save}
                className="bg-gradient-to-r from-indigo-600 to-violet-600"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
