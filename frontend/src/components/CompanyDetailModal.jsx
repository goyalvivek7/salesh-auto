import { useState, useEffect } from 'react';
import { Globe, ExternalLink, Mail, Loader2 } from 'lucide-react';
import Modal from './Modal';
import Badge from './Badge';
import { updateCompany } from '../services/api';

export default function CompanyDetailModal({
  isOpen,
  onClose,
  company,
  loading,
  onUpdated,
}) {
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    industry: '',
    country: '',
    email: '',
    phone: '',
    website: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setEditMode(false);
      setEditForm({
        name: company.name || '',
        industry: company.industry || '',
        country: company.country || '',
        email: company.email || '',
        phone: company.phone || '',
        website: company.website || '',
      });
    }
  }, [company]);

  const allPhones = company?.phones || [];
  const whatsappPhones = allPhones.filter((p) => p.is_verified);

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    if (!company) return;
    try {
      setSaving(true);
      const payload = {
        name: editForm.name || null,
        industry: editForm.industry || null,
        country: editForm.country || null,
        email: editForm.email || null,
        phone: editForm.phone || null,
        website: editForm.website || null,
      };
      const res = await updateCompany(company.id, payload);
      if (onUpdated) {
        onUpdated(res.data);
      }
      setEditMode(false);
    } catch (error) {
      console.error('Failed to update company:', error);
      alert('Failed to update company. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Company details"
      size="xl"
    >
      {loading || !company ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Hero card */}
          <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-2xl shadow-sm shadow-indigo-50 px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 flex items-center justify-center text-white font-semibold text-lg">
                {company.name?.charAt(0) || '?'}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{company.name}</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {company.industry} • {company.country}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Added on{' '}
                  {company.created_at
                    ? new Date(company.created_at).toLocaleDateString()
                    : '—'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              {company.website && (
                <a
                  href={
                    company.website.startsWith('http')
                      ? company.website
                      : `https://${company.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-indigo-600 text-xs font-medium shadow-sm hover:bg-slate-50"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Visit website
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {company.email && (
                <a
                  href={`mailto:${company.email}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-medium shadow-sm hover:bg-indigo-700"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email company
                </a>
              )}
            </div>
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: basic info + recent messages */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-2xl p-5 shadow-sm shadow-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Basic information</h3>
                  {company && (
                    <button
                      type="button"
                      onClick={() => setEditMode((prev) => !prev)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {editMode ? 'Cancel' : 'Edit'}
                    </button>
                  )}
                </div>
                {editMode ? (
                  <form
                    className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
                    onSubmit={handleSaveCompany}
                  >
                    <div>
                      <p className="text-slate-400 text-xs">Name</p>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                        className="mt-0.5 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Industry</p>
                      <input
                        type="text"
                        value={editForm.industry}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, industry: e.target.value }))
                        }
                        className="mt-0.5 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Country</p>
                      <input
                        type="text"
                        value={editForm.country}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, country: e.target.value }))
                        }
                        className="mt-0.5 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Email</p>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, email: e.target.value }))
                        }
                        className="mt-0.5 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Phone</p>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        className="mt-0.5 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Website</p>
                      <input
                        type="text"
                        value={editForm.website}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, website: e.target.value }))
                        }
                        className="mt-0.5 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditMode(false)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-400 text-xs">Email</p>
                      <p className="text-slate-700 break-all">{company.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Phone (primary)</p>
                      <p className="text-slate-700">{company.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Country</p>
                      <p className="text-slate-700">{company.country}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Website</p>
                      <p className="text-slate-700 break-all">{company.website || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">All phone numbers</p>
                      <p className="text-slate-700 break-all">
                        {allPhones.length ? allPhones.map((p) => p.phone).join(', ') : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">WhatsApp numbers</p>
                      <p className="text-slate-700 break-all">
                        {whatsappPhones.length
                          ? whatsappPhones.map((p) => p.phone).join(', ')
                          : '—'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-2xl p-5 shadow-sm shadow-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Recent activity</h3>
                  <span className="text-xs text-slate-400">
                    {company.messages?.length || 0} messages · {company.replies?.length || 0} replies
                  </span>
                </div>
                {company.messages && company.messages.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {company.messages.slice(0, 5).map((msg) => (
                      <div
                        key={msg.id}
                        className="flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
                      >
                        <div>
                          <p className="text-xs font-medium text-slate-500">
                            {msg.type} • {msg.stage}
                          </p>
                          <p className="text-sm text-slate-800 line-clamp-1">
                            {msg.subject || msg.content}
                          </p>
                          {msg.sent_at && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Sent {new Date(msg.sent_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={
                            msg.status === 'SENT'
                              ? 'success'
                              : msg.status === 'DRAFT'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {msg.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No messages yet for this company.</p>
                )}
              </div>
            </div>

            {/* Right: stats / replies */}
            <div className="space-y-4">
              <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-2xl p-5 shadow-sm shadow-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Total messages</span>
                    <span className="font-medium text-slate-900">{company.messages?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Sent</span>
                    <span className="font-medium text-slate-900">
                      {(company.messages || []).filter((m) => m.status === 'SENT').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Draft</span>
                    <span className="font-medium text-slate-900">
                      {(company.messages || []).filter((m) => m.status === 'DRAFT').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Replies</span>
                    <span className="font-medium text-slate-900">{company.replies?.length || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-2xl p-5 shadow-sm shadow-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Latest reply</h3>
                {company.replies && company.replies.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">
                      {new Date(company.replies[0].replied_at).toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {company.replies[0].reply_content || 'Reply received'}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No replies recorded for this company yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
