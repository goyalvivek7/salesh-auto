import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Play,
  Megaphone,
  MessageSquare,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Building2,
  Loader2,
  Calendar,
  Globe,
  Phone,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import {
  getCampaigns,
  getCampaign,
  getCompany,
  generateCampaign,
  deleteCampaigns,
  startCampaignNow,
} from '../services/api';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ industry: 'all', status: 'all', dateFrom: '', dateTo: '' });

  // Create modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    campaign_name: '',
    industry: '',
    limit: 10,
    scheduled_date: '',
    scheduled_time: '',
    fetched_on: '', // Filter companies by created_at date
  });

  // Auto-generate campaign name when industry or fetched_on changes
  const updateCampaignName = (industry, fetchedOn) => {
    if (industry && fetchedOn) {
      const dateStr = new Date(fetchedOn).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      return `${industry} - ${dateStr}`;
    }
    return '';
  };

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [startingId, setStartingId] = useState(null);

  // Company detail within campaign
  const [companyDetailOpen, setCompanyDetailOpen] = useState(false);
  const [activeCompany, setActiveCompany] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(false);

  // Company names map for campaign detail
  const [companyNamesMap, setCompanyNamesMap] = useState({});

  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCampaigns();
      setCampaigns(res.data || []);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const handleCreate = async () => {
    if (!form.industry) return;

    // Use auto-generated name if not manually set
    const campaignName = form.campaign_name || updateCampaignName(form.industry, form.fetched_on) || form.industry;

    try {
      setCreating(true);
      await generateCampaign({
        campaign_name: campaignName,
        industry: form.industry,
        limit: form.limit,
        campaign_type: 'SALES',
        fetched_on: form.fetched_on || null, // Filter companies by this date
      });
      setCreateModalOpen(false);
      setForm({ campaign_name: '', industry: '', limit: 10, scheduled_date: '', scheduled_time: '', fetched_on: '' });
      loadCampaigns();
    } catch (error) {
      console.error('Failed to create campaign:', error);
      alert('Failed to create campaign. Make sure you have companies in this industry/date.');
    } finally {
      setCreating(false);
    }
  };

  const handleStartNow = async (campaignId, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Start this campaign now? This will send all initial messages (Email & WhatsApp) immediately. Follow-ups will be sent at scheduled times.')) return;

    try {
      setStartingId(campaignId);
      const res = await startCampaignNow(campaignId);
      alert(`Campaign started! Sent: ${res.data.sent_count}, Failed: ${res.data.failed_count}`);
      loadCampaigns();
      // Refresh detail if open
      if (activeCampaign?.id === campaignId) {
        const detail = await getCampaign(campaignId);
        setActiveCampaign(detail.data);
      }
    } catch (error) {
      console.error('Failed to start campaign:', error);
      alert('Failed to start campaign.');
    } finally {
      setStartingId(null);
    }
  };

  const handleDelete = async (ids) => {
    if (!confirm(`Delete ${ids.length} campaign(s) and all their messages?`)) return;

    try {
      await deleteCampaigns(ids);
      setSelectedRows([]);
      loadCampaigns();
    } catch (error) {
      console.error('Failed to delete campaigns:', error);
    }
  };

  const handleRowClick = async (row) => {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      const res = await getCampaign(row.id);
      setActiveCampaign(res.data);

      // Fetch company names for all unique company IDs in this campaign
      const companyIds = [...new Set((res.data.messages || []).map((m) => m.company_id).filter(Boolean))];
      const namesMap = {};
      await Promise.all(
        companyIds.map(async (id) => {
          try {
            const companyRes = await getCompany(id);
            namesMap[id] = companyRes.data?.name || `Company #${id}`;
          } catch {
            namesMap[id] = `Company #${id}`;
          }
        })
      );
      setCompanyNamesMap(namesMap);
    } catch (error) {
      console.error('Failed to load campaign details:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCompanyClick = async (companyId) => {
    try {
      setCompanyDetailOpen(true);
      setCompanyLoading(true);
      const res = await getCompany(companyId);
      setActiveCompany(res.data);
    } catch (error) {
      console.error('Failed to load company details:', error);
    } finally {
      setCompanyLoading(false);
    }
  };

  const getMessageStats = (messages) => {
    const stats = { total: 0, draft: 0, sent: 0, failed: 0, initial: 0, followup: 0 };
    (messages || []).forEach((m) => {
      stats.total++;
      if (m.status === 'DRAFT') stats.draft++;
      else if (m.status === 'SENT') stats.sent++;
      else if (m.status === 'FAILED') stats.failed++;
      if (m.stage === 'INITIAL') stats.initial++;
      else stats.followup++;
    });
    return stats;
  };

  // Unique industries from campaigns
  const uniqueIndustries = Array.from(new Set(campaigns.map((c) => c.industry).filter(Boolean)));

  // Filter campaigns
  const filteredCampaigns = campaigns.filter((c) => {
    if (filters.industry !== 'all' && c.industry !== filters.industry) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!c.name?.toLowerCase().includes(term) && !c.industry?.toLowerCase().includes(term)) return false;
    }
    const stats = getMessageStats(c.messages);
    if (filters.status === 'active' && stats.draft === 0) return false;
    if (filters.status === 'completed' && stats.draft > 0) return false;
    // Date filters
    if (filters.dateFrom && c.created_at) {
      const createdDate = new Date(c.created_at).setHours(0, 0, 0, 0);
      const fromDate = new Date(filters.dateFrom).setHours(0, 0, 0, 0);
      if (createdDate < fromDate) return false;
    }
    if (filters.dateTo && c.created_at) {
      const createdDate = new Date(c.created_at).setHours(0, 0, 0, 0);
      const toDate = new Date(filters.dateTo).setHours(23, 59, 59, 999);
      if (createdDate > toDate) return false;
    }
    return true;
  });

  // Aggregate stats
  const totalCampaigns = campaigns.length;
  const totalMessages = campaigns.reduce((acc, c) => acc + (c.messages?.length || 0), 0);
  const totalSent = campaigns.reduce((acc, c) => acc + getMessageStats(c.messages).sent, 0);
  const totalDraft = campaigns.reduce((acc, c) => acc + getMessageStats(c.messages).draft, 0);

  // Get unique companies from campaign messages
  const getCampaignCompanies = (messages) => {
    const companyMap = new Map();
    (messages || []).forEach((m) => {
      if (!companyMap.has(m.company_id)) {
        companyMap.set(m.company_id, { id: m.company_id, messages: [] });
      }
      companyMap.get(m.company_id).messages.push(m);
    });
    return Array.from(companyMap.values());
  };

  const columns = [
    {
      key: 'name',
      label: 'Campaign',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{row.name}</p>
            <p className="text-xs text-slate-500">{row.industry}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'industry',
      label: 'Industry',
      render: (value) => <Badge variant="default">{value}</Badge>,
    },
    {
      key: 'companies',
      label: 'Companies',
      render: (_, row) => {
        const companyCount = new Set((row.messages || []).map((m) => m.company_id)).size;
        return <span className="text-sm text-slate-700">{companyCount}</span>;
      },
    },
    {
      key: 'messages',
      label: 'Messages',
      render: (_, row) => {
        const stats = getMessageStats(row.messages);
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-900">{stats.total}</span>
            <span className="text-xs text-slate-400">
              ({stats.sent} sent, {stats.draft} draft)
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => {
        const stats = getMessageStats(row.messages);
        if (stats.draft === 0 && stats.sent > 0) {
          return <Badge variant="success">Completed</Badge>;
        } else if (stats.sent > 0) {
          return <Badge variant="warning">In Progress</Badge>;
        }
        return <Badge variant="default">Ready</Badge>;
      },
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (value) => (
        <span className="text-xs text-slate-500">
          {value ? new Date(value).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => {
        const stats = getMessageStats(row.messages);
        const hasInitialDrafts = (row.messages || []).some(
          (m) => m.stage === 'INITIAL' && m.status === 'DRAFT'
        );
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {hasInitialDrafts && (
              <Button
                size="sm"
                onClick={(e) => handleStartNow(row.id, e)}
                loading={startingId === row.id}
                icon={Play}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-xs"
              >
                Start Now
              </Button>
            )}
            <Button
              size="sm"
              variant="danger"
              icon={Trash2}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete([row.id]);
              }}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero / header */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-indigo-50 px-6 py-5 lg:px-8 lg:py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide flex items-center gap-1">
            <Megaphone className="w-3.5 h-3.5" />
            Campaign Manager
          </p>
          <h1 className="mt-1 text-2xl lg:text-3xl font-semibold text-slate-900">
            Outreach Campaigns
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create campaigns to send personalized messages to companies. Start immediately or schedule for later.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Total campaigns: {totalCampaigns} · Messages: {totalMessages} · Sent: {totalSent} · Pending: {totalDraft}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button
            onClick={() => setCreateModalOpen(true)}
            icon={Plus}
            className="bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 hover:brightness-105 shadow-lg shadow-violet-200"
          >
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Campaigns</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{totalCampaigns}</p>
            <p className="mt-1 text-[11px] text-slate-400">All time</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-violet-100">
            <Megaphone className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Messages</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{totalMessages}</p>
            <p className="mt-1 text-[11px] text-slate-400">Email & WhatsApp combined</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-sky-100">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sent</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{totalSent}</p>
            <p className="mt-1 text-[11px] text-slate-400">Successfully delivered</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{totalDraft}</p>
            <p className="mt-1 text-[11px] text-slate-400">Awaiting send</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white shadow-md shadow-amber-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters card */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-indigo-50 p-5 lg:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Filters</p>
            <p className="text-xs text-slate-500 mt-0.5">Filter campaigns by name, industry, or status.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFilters({ industry: 'all', status: 'all', dateFrom: '', dateTo: '' });
              setSearchTerm('');
            }}
            className="self-start text-xs font-medium text-violet-700 hover:text-violet-800"
          >
            Reset filters
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Campaign name or industry..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Industry</label>
            <select
              value={filters.industry}
              onChange={(e) => setFilters((prev) => ({ ...prev, industry: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="all">All industries</option>
              {uniqueIndustries.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="active">Active (has drafts)</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Created From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Created To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div className="md:col-span-3 flex items-end justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={loadCampaigns}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredCampaigns}
        loading={loading}
        selectedRows={selectedRows}
        onSelectRow={(id) =>
          setSelectedRows((prev) =>
            prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
          )
        }
        onSelectAll={(checked) =>
          setSelectedRows(checked ? filteredCampaigns.map((c) => c.id) : [])
        }
        emptyMessage="No campaigns found. Click 'Create Campaign' to get started!"
        actions={
          selectedRows.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={() => handleDelete(selectedRows)}
              >
                Delete ({selectedRows.length})
              </Button>
            </div>
          )
        }
        showSearch={false}
        onRowClick={handleRowClick}
      />

      {/* Create Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Campaign"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-100">
            <p className="text-sm text-violet-700">
              <Megaphone className="w-4 h-4 inline mr-1" />
              Generate personalized messages for companies. Select a date to target companies fetched on that day.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Industry *
              </label>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => {
                  const newIndustry = e.target.value;
                  const autoName = updateCampaignName(newIndustry, form.fetched_on);
                  setForm({ ...form, industry: newIndustry, campaign_name: autoName || form.campaign_name });
                }}
                placeholder="e.g., IT, Software, Healthcare"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                Companies Fetched On
              </label>
              <input
                type="date"
                value={form.fetched_on}
                onChange={(e) => {
                  const newDate = e.target.value;
                  const autoName = updateCampaignName(form.industry, newDate);
                  setForm({ ...form, fetched_on: newDate, campaign_name: autoName || form.campaign_name });
                }}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              value={form.campaign_name}
              onChange={(e) => setForm({ ...form, campaign_name: e.target.value })}
              placeholder={updateCampaignName(form.industry, form.fetched_on) || 'Auto-generated from Industry + Date'}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-400 mt-1">
              Leave empty to auto-generate: Industry - Date
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Companies
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={form.limit}
              onChange={(e) => setForm({ ...form, limit: parseInt(e.target.value) || 10 })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-slate-600 mb-2">Scheduling (Optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Schedule Date (IST)
                </label>
                <input
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Schedule Time (IST)
                </label>
                <input
                  type="time"
                  value={form.scheduled_time}
                  onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Leave empty for immediate sending. Use "Start Now" after creation.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={creating}
              disabled={!form.industry}
              className="bg-gradient-to-r from-violet-600 to-purple-600"
            >
              Create Campaign
            </Button>
          </div>
        </div>
      </Modal>

      {/* Campaign Detail Modal */}
      <Modal
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setActiveCampaign(null);
        }}
        title="Campaign Details"
        size="xl"
      >
        {detailLoading || !activeCampaign ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Campaign hero */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-2xl shadow-sm shadow-violet-50 px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center text-white">
                  <Megaphone className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{activeCampaign.name}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{activeCampaign.industry}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Created on {new Date(activeCampaign.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(activeCampaign.messages || []).some((m) => m.stage === 'INITIAL' && m.status === 'DRAFT') && (
                  <Button
                    onClick={() => handleStartNow(activeCampaign.id)}
                    loading={startingId === activeCampaign.id}
                    icon={Play}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500"
                  >
                    Start Now
                  </Button>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(() => {
                const stats = getMessageStats(activeCampaign.messages);
                const companyCount = new Set((activeCampaign.messages || []).map((m) => m.company_id)).size;
                return (
                  <>
                    <div className="bg-slate-50/80 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-slate-900">{companyCount}</p>
                      <p className="text-xs text-slate-500">Companies</p>
                    </div>
                    <div className="bg-slate-50/80 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-slate-900">{stats.total}</p>
                      <p className="text-xs text-slate-500">Messages</p>
                    </div>
                    <div className="bg-emerald-50/80 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-emerald-600">{stats.sent}</p>
                      <p className="text-xs text-slate-500">Sent</p>
                    </div>
                    <div className="bg-amber-50/80 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-amber-600">{stats.draft}</p>
                      <p className="text-xs text-slate-500">Pending</p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Companies in this campaign */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-2xl p-5 shadow-sm shadow-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Companies in this campaign</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {getCampaignCompanies(activeCampaign.messages).map((companyData) => {
                  const msgStats = {
                    total: companyData.messages.length,
                    sent: companyData.messages.filter((m) => m.status === 'SENT').length,
                    draft: companyData.messages.filter((m) => m.status === 'DRAFT').length,
                  };
                  const companyName = companyNamesMap[companyData.id] || `Company #${companyData.id}`;
                  return (
                    <div
                      key={companyData.id}
                      onClick={() => handleCompanyClick(companyData.id)}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 hover:bg-slate-100/80 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                          {companyName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{companyName}</p>
                          <p className="text-xs text-slate-500">
                            {msgStats.total} messages · {msgStats.sent} sent · {msgStats.draft} pending
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  );
                })}
                {getCampaignCompanies(activeCampaign.messages).length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No companies in this campaign.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Company Detail Modal (nested) */}
      <Modal
        isOpen={companyDetailOpen}
        onClose={() => {
          setCompanyDetailOpen(false);
          setActiveCompany(null);
        }}
        title="Company Messages"
        size="lg"
      >
        {companyLoading || !activeCompany ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Company header */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setCompanyDetailOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold">
                {activeCompany.name?.charAt(0) || '?'}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{activeCompany.name}</h3>
                <p className="text-xs text-slate-500">{activeCompany.industry} · {activeCompany.country}</p>
              </div>
            </div>

            {/* Contact info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{activeCompany.email || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{activeCompany.phone || '—'}</span>
              </div>
              {activeCompany.website && (
                <a
                  href={activeCompany.website.startsWith('http') ? activeCompany.website : `https://${activeCompany.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
                >
                  <Globe className="w-4 h-4" />
                  <span>Visit website</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Messages for this company */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-2xl p-5 shadow-sm shadow-slate-100">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Messages</h4>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {(activeCompany.messages || []).map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        msg.type === 'EMAIL' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {msg.type === 'EMAIL' ? <Mail className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          {msg.type} · {msg.stage}
                        </p>
                        <p className="text-sm text-slate-800 line-clamp-2">
                          {msg.subject || msg.content?.substring(0, 80)}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {msg.sent_at
                            ? `Sent ${new Date(msg.sent_at).toLocaleString()}`
                            : `Scheduled for ${new Date(msg.scheduled_for).toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        msg.status === 'SENT' ? 'success' :
                        msg.status === 'FAILED' ? 'danger' :
                        msg.status === 'DRAFT' ? 'warning' : 'default'
                      }
                    >
                      {msg.status}
                    </Badge>
                  </div>
                ))}
                {(activeCompany.messages || []).length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No messages for this company.</p>
                )}
              </div>
            </div>

            {/* Replies */}
            {activeCompany.replies && activeCompany.replies.length > 0 && (
              <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-5">
                <h4 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Replies ({activeCompany.replies.length})
                </h4>
                <div className="space-y-2">
                  {activeCompany.replies.slice(0, 3).map((reply) => (
                    <div key={reply.id} className="bg-white/60 rounded-lg px-3 py-2">
                      <p className="text-xs text-emerald-600">
                        {new Date(reply.replied_at).toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-700 mt-1">
                        {reply.reply_content || 'Reply received'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
