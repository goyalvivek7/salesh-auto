import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Download,
  Mail,
  Phone,
  Globe,
  MessageSquare,
  Star,
  ExternalLink,
  CheckCircle2,
  XCircle,
  RefreshCw,
  TrendingUp,
  Sparkles,
  Calendar,
} from 'lucide-react';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { getServiceLeads, getAllReplies, exportLeads } from '../services/api';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leads');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    source: 'all',
    industry: 'all',
    dateFrom: '',
    dateTo: '',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [leadsRes, repliesRes] = await Promise.all([
        getServiceLeads({ page: 1, page_size: 100 }),
        getAllReplies(),
      ]);
      setLeads(leadsRes.data?.items || leadsRes.data?.leads || []);
      setReplies(repliesRes.data.replies || []);
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = async () => {
    try {
      const res = await exportLeads();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'qualified_leads.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  // Unique industries from leads
  const uniqueIndustries = Array.from(new Set(leads.map((l) => l.industry).filter(Boolean)));

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!lead.company_name?.toLowerCase().includes(term) && !lead.industry?.toLowerCase().includes(term)) {
        return false;
      }
    }
    if (filters.industry !== 'all' && lead.industry !== filters.industry) return false;
    if (filters.dateFrom && lead.latest_reply?.replied_at) {
      const replyDate = new Date(lead.latest_reply.replied_at).setHours(0, 0, 0, 0);
      const fromDate = new Date(filters.dateFrom).setHours(0, 0, 0, 0);
      if (replyDate < fromDate) return false;
    }
    if (filters.dateTo && lead.latest_reply?.replied_at) {
      const replyDate = new Date(lead.latest_reply.replied_at).setHours(0, 0, 0, 0);
      const toDate = new Date(filters.dateTo).setHours(23, 59, 59, 999);
      if (replyDate > toDate) return false;
    }
    return true;
  });

  // Filter replies
  const filteredReplies = replies.filter((reply) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!reply.company_name?.toLowerCase().includes(term) && !reply.company_industry?.toLowerCase().includes(term)) {
        return false;
      }
    }
    if (filters.source !== 'all' && reply.source !== filters.source) return false;
    if (filters.dateFrom && reply.replied_at) {
      const replyDate = new Date(reply.replied_at).setHours(0, 0, 0, 0);
      const fromDate = new Date(filters.dateFrom).setHours(0, 0, 0, 0);
      if (replyDate < fromDate) return false;
    }
    if (filters.dateTo && reply.replied_at) {
      const replyDate = new Date(reply.replied_at).setHours(0, 0, 0, 0);
      const toDate = new Date(filters.dateTo).setHours(23, 59, 59, 999);
      if (replyDate > toDate) return false;
    }
    return true;
  });

  // Stats
  const emailReplies = replies.filter((r) => r.source === 'Email').length;
  const whatsappReplies = replies.filter((r) => r.source === 'WhatsApp').length;
  const qualifiedCount = replies.filter((r) => r.is_qualified_lead).length;

  const tabs = [
    { id: 'leads', label: 'Qualified Leads', count: filteredLeads.length, icon: Star },
    { id: 'replies', label: 'All Replies', count: filteredReplies.length, icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-emerald-50 px-6 py-5 lg:px-8 lg:py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            Leads & Replies
          </p>
          <h1 className="mt-1 text-2xl lg:text-3xl font-semibold text-slate-900">
            Qualified leads and reply inbox
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Companies that responded to your outreach campaigns. Track and manage qualified leads.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {leads.length} qualified leads · {replies.length} total replies
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Qualified Leads</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600">{leads.length}</p>
            <p className="mt-1 text-[11px] text-slate-400">Hot prospects ready for follow-up</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-100">
            <Star className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Replies</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{replies.length}</p>
            <p className="mt-1 text-[11px] text-slate-400">All responses received</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email Replies</p>
            <p className="mt-1 text-2xl font-semibold text-blue-600">{emailReplies}</p>
            <p className="mt-1 text-[11px] text-slate-400">From email campaigns</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-blue-100">
            <Mail className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">WhatsApp Replies</p>
            <p className="mt-1 text-2xl font-semibold text-green-600">{whatsappReplies}</p>
            <p className="mt-1 text-[11px] text-slate-400">From WhatsApp campaigns</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-green-100">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-emerald-50 p-5 lg:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Filters</p>
            <p className="text-xs text-slate-500 mt-0.5">Filter leads and replies by source, industry, or date.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFilters({ source: 'all', industry: 'all', dateFrom: '', dateTo: '' });
              setSearchTerm('');
            }}
            className="self-start text-xs font-medium text-emerald-700 hover:text-emerald-800"
          >
            Reset filters
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Company, industry..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Source</label>
            <select
              value={filters.source}
              onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">All Sources</option>
              <option value="Email">Email</option>
              <option value="WhatsApp">WhatsApp</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Industry</label>
            <select
              value={filters.industry}
              onChange={(e) => setFilters((prev) => ({ ...prev, industry: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">All Industries</option>
              {uniqueIndustries.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Reply From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Reply To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" icon={Download} onClick={handleExport}>
            Export
          </Button>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={loadData}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-2xl shadow-sm p-1 inline-flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-100'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 p-6 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-2/3 mb-4"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : activeTab === 'leads' ? (
        filteredLeads.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 p-12 text-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No qualified leads yet</h3>
            <p className="text-slate-500 mt-1">
              Leads will appear here when companies reply to your outreach
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLeads.map((lead) => (
              <div
                key={lead.company_id}
                className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 p-6 hover:shadow-lg hover:shadow-emerald-50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-100">
                      {lead.company_name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{lead.company_name}</h3>
                      <p className="text-sm text-slate-500">{lead.industry} • {lead.country}</p>
                    </div>
                  </div>
                  <Badge variant="success">
                    <Star className="w-3 h-3 mr-1" />
                    Qualified
                  </Badge>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      {lead.email}
                    </a>
                  )}
                  {lead.phone && (
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4" />
                      {lead.phone}
                    </p>
                  )}
                  {lead.website && (
                    <a
                      href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      Visit Website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Latest Reply */}
                {lead.latest_reply && (
                  <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={lead.latest_reply.source === 'WhatsApp' ? 'success' : 'primary'}>
                        {lead.latest_reply.source === 'WhatsApp' ? (
                          <MessageSquare className="w-3 h-3 mr-1" />
                        ) : (
                          <Mail className="w-3 h-3 mr-1" />
                        )}
                        {lead.latest_reply.source}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {new Date(lead.latest_reply.replied_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2">
                      "{lead.latest_reply.content}"
                    </p>
                  </div>
                )}

                <p className="text-xs text-slate-400 mt-3 text-center">
                  {lead.total_replies} total replies
                </p>
              </div>
            ))}
          </div>
        )
      ) : (
        // Replies Tab
        filteredReplies.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 p-12 text-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No replies yet</h3>
            <p className="text-slate-500 mt-1">
              Replies from email and WhatsApp will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReplies.map((reply) => (
              <div
                key={reply.id}
                className="bg-white/80 backdrop-blur-xl rounded-xl border border-white/70 p-4 hover:shadow-md hover:shadow-indigo-50 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                        reply.source === 'WhatsApp'
                          ? 'bg-gradient-to-br from-emerald-500 to-green-500 shadow-emerald-100'
                          : 'bg-gradient-to-br from-blue-500 to-indigo-500 shadow-blue-100'
                      }`}
                    >
                      {reply.source === 'WhatsApp' ? (
                        <MessageSquare className="w-5 h-5 text-white" />
                      ) : (
                        <Mail className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{reply.company_name}</p>
                      <p className="text-xs text-slate-500">
                        {reply.company_industry} • {new Date(reply.replied_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={reply.is_qualified_lead ? 'success' : 'default'}>
                    {reply.is_qualified_lead ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Qualified
                      </>
                    ) : (
                      'Reply'
                    )}
                  </Badge>
                </div>

                {reply.reply_content && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-sm text-slate-700">{reply.reply_content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
