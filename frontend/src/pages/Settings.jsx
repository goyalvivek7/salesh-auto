import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  Mail,
  Building2,
  User,
  Globe,
  Phone,
  AlertCircle,
} from 'lucide-react';
import {
  getSettings,
  updateGeneralSettings,
  getEmailAccounts,
  createEmailAccount,
  updateEmailAccount,
} from '../services/api';

export default function Settings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [activeEmailIndex, setActiveEmailIndex] = useState(0);

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings().then((res) => res.data),
  });

  const { data: emailAccountsData, isLoading: emailLoading } = useQuery({
    queryKey: ['email-accounts'],
    queryFn: () => getEmailAccounts().then((res) => res.data.items || res.data || []),
  });

  const generalMutation = useMutation({
    mutationFn: (payload) => updateGeneralSettings(payload),
    onSuccess: () => queryClient.invalidateQueries(['settings']),
  });

  const emailMutation = useMutation({
    mutationFn: ({ id, payload, isNew }) =>
      isNew ? createEmailAccount(payload) : updateEmailAccount(id, payload),
    onSuccess: () => queryClient.invalidateQueries(['email-accounts']),
  });

  const settings = settingsData || {};
  const emailAccounts = emailAccountsData || [];
  const activeEmail = emailAccounts[activeEmailIndex] || null;

  const handleSaveGeneral = (event) => {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    generalMutation.mutate(payload);
  };

  const handleSaveEmail = (event) => {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    const isNew = !activeEmail || !activeEmail.id;
    const id = activeEmail?.id;
    emailMutation.mutate({ id, payload, isNew });
  };

  if (settingsLoading && emailLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-t-3xl shadow-sm shadow-indigo-50 px-6 py-5 lg:px-8 lg:py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 flex items-center justify-center text-white">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500">Manage your account and application settings</p>
          </div>
        </div>
      </div>

      {/* Grey content background with inner card */}
      <div >
        {/* Top tabs: General / Email */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-2 inline-flex gap-1 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              activeTab === 'general'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              activeTab === 'email'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
        </div>

        {/* Inner white area for forms */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          {activeTab === 'general' ? (
            <>
              <div className="bg-indigo-50 border border-indigo-100 text-xs rounded-xl px-4 py-3 text-slate-700">
                <span className="font-semibold text-indigo-700">Required for campaigns: </span>
                Company Name, Your Name, and Company Description must be filled before creating campaigns or sending messages.
              </div>

              {/* Company Information */}
              <form onSubmit={handleSaveGeneral} className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 mb-3">Company Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Company Name *</label>
                      <input
                        name="company_name"
                        defaultValue={settings.company_name || ''}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Company Website</label>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-400" />
                        <input
                          name="company_website"
                          defaultValue={settings.company_website || ''}
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-medium text-slate-600">Company Description *</label>
                      <textarea
                        name="company_description"
                        defaultValue={settings.company_description || ''}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Sender Information */}
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 mb-3">Sender Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Your Name *</label>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <input
                          name="sender_name"
                          defaultValue={settings.sender_name || ''}
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Your Position</label>
                      <input
                        name="sender_position"
                        defaultValue={settings.sender_position || ''}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Contact Phone</label>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <input
                          name="sender_phone"
                          defaultValue={settings.sender_phone || ''}
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                  >
                    Save General Settings
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              {/* Email accounts selector */}
              {emailAccounts.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <span>No email accounts configured. Add one below.</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                {emailAccounts.map((acc, index) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setActiveEmailIndex(index)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      activeEmailIndex === index
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Email {index + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setActiveEmailIndex(emailAccounts.length)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border-dashed border ${
                    activeEmailIndex === emailAccounts.length
                      ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                      : 'border-slate-300 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  + Add Email
                </button>
              </div>

              {/* SMTP Form */}
              <form onSubmit={handleSaveEmail} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">SMTP Server</label>
                  <input
                    name="smtp_host"
                    defaultValue={activeEmail?.smtp_host || ''}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">SMTP Port</label>
                  <input
                    name="smtp_port"
                    type="number"
                    defaultValue={activeEmail?.smtp_port || 465}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Username</label>
                  <input
                    name="smtp_username"
                    defaultValue={activeEmail?.smtp_username || ''}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Password</label>
                  <input
                    name="smtp_password"
                    type="password"
                    defaultValue={activeEmail?.smtp_password || ''}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">From Email</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={activeEmail?.email || ''}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">From Name</label>
                  <input
                    name="display_name"
                    defaultValue={activeEmail?.display_name || ''}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                  >
                    Save Email Settings
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
