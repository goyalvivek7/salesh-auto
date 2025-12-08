import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Download,
  Trash2,
  Building2,
  Globe,
  Mail,
  Phone,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Loader2,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Badge from '../components/Badge';
import {
  getCompanies,
  getCompany,
  fetchCompaniesFromAI,
  deleteCompanies,
  exportCompanies,
  updateCompany,
} from '../services/api';

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [selectedRows, setSelectedRows] = useState([]);
  const [fetchModalOpen, setFetchModalOpen] = useState(false);
  const [fetchForm, setFetchForm] = useState({
    industry: '',
    country: '',
    count: 10,
  });
  const [fetching, setFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeCompany, setActiveCompany] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    industry: '',
    country: '',
    email: '',
    phone: '',
    website: '',
  });
  const [savingCompany, setSavingCompany] = useState(false);
  const [filters, setFilters] = useState({
    industry: 'all',
    country: 'all',
    replies: 'all',
    dateFrom: '',
    dateTo: '',
  });

  const loadCompanies = useCallback(async (page = 1, search = '') => {
    try {
      setLoading(true);
      const res = await getCompanies({ page, page_size: 20, search });
      setCompanies(res.data.items);
      setPagination({
        page: res.data.page,
        pageSize: res.data.page_size,
        total: res.data.total,
        totalPages: res.data.total_pages,
      });
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleSearch = useCallback(
    (term) => {
      setSearchTerm(term);
      const timeoutId = setTimeout(() => {
        loadCompanies(1, term);
      }, 300);
      return () => clearTimeout(timeoutId);
    },
    [loadCompanies]
  );

  const handleFetchCompanies = async () => {
    if (!fetchForm.industry || !fetchForm.country) return;

    try {
      setFetching(true);
      await fetchCompaniesFromAI(fetchForm);
      setFetchModalOpen(false);
      setFetchForm({ industry: '', country: '', count: 10 });
      loadCompanies();
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      alert('Failed to fetch companies. Please try again.');
    } finally {
      setFetching(false);
    }
  };

  const handleDelete = async () => {
    if (selectedRows.length === 0) return;
    if (!confirm(`Delete ${selectedRows.length} companies?`)) return;

    try {
      await deleteCompanies(selectedRows);
      setSelectedRows([]);
      loadCompanies(pagination.page, searchTerm);
    } catch (error) {
      console.error('Failed to delete companies:', error);
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportCompanies();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'companies.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const handleRowClick = async (row) => {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      const res = await getCompany(row.id);
      setActiveCompany(res.data);
      setEditMode(false);
    } catch (error) {
      console.error('Failed to load company details:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const startEditingCompany = () => {
    if (!activeCompany) return;
    setEditForm({
      name: activeCompany.name || '',
      industry: activeCompany.industry || '',
      country: activeCompany.country || '',
      email: activeCompany.email || '',
      phone: activeCompany.phone || '',
      website: activeCompany.website || '',
    });
    setEditMode(true);
  };

  const cancelEditingCompany = () => {
    setEditMode(false);
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    if (!activeCompany) return;
    try {
      setSavingCompany(true);
      const payload = {
        name: editForm.name || null,
        industry: editForm.industry || null,
        country: editForm.country || null,
        email: editForm.email || null,
        phone: editForm.phone || null,
        website: editForm.website || null,
      };
      const res = await updateCompany(activeCompany.id, payload);
      setActiveCompany(res.data);
      setCompanies((prev) =>
        prev.map((company) => (company.id === res.data.id ? res.data : company))
      );
      setEditMode(false);
    } catch (error) {
      console.error('Failed to update company:', error);
      alert('Failed to update company. Please try again.');
    } finally {
      setSavingCompany(false);
    }
  };

  const hasReplies = (row) => (row.replies || []).length > 0;

  const isStageSent = (row, type, stage) => {
    const messages = row.messages || [];
    return messages.some(
      (msg) =>
        msg.type === type &&
        msg.stage === stage &&
        ['SENT', 'DELIVERED', 'READ'].includes(msg.status)
    );
  };

  const totalCompanies = pagination.total || companies.length;
  const companiesWithOutreach = companies.filter(
    (c) => (c.messages || []).some((m) => m.status !== 'DRAFT')
  ).length;
  const companiesWithReplies = companies.filter(hasReplies).length;
  const companiesWithoutContact = companies.filter(
    (c) => !c.email && !c.phone
  ).length;

  const uniqueIndustries = Array.from(
    new Set(companies.map((c) => c.industry).filter(Boolean))
  );
  const uniqueCountries = Array.from(
    new Set(companies.map((c) => c.country).filter(Boolean))
  );

  const filteredCompanies = companies.filter((c) => {
    if (filters.industry !== 'all' && c.industry !== filters.industry) return false;
    if (filters.country !== 'all' && c.country !== filters.country) return false;
    if (filters.replies === 'replied' && !hasReplies(c)) return false;
    if (filters.replies === 'no_replies' && hasReplies(c)) return false;
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

  const columns = [
    {
      key: 'name',
      label: 'Company',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold">
            {row.name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            <p className="text-xs text-gray-500">{row.industry}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'country',
      label: 'Country',
      render: (value) => (
        <Badge variant="default">{value}</Badge>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (value) =>
        value ? (
          <a
            href={`mailto:${value}`}
            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="text-sm">{value}</span>
          </a>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (value) =>
        value ? (
          <span className="flex items-center gap-1 text-sm text-gray-700">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            {value}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        ),
    },
    {
      key: 'website',
      label: 'Website',
      render: (value) =>
        value ? (
          <a
            href={value.startsWith('http') ? value : `https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm"
          >
            <Globe className="w-3.5 h-3.5" />
            Visit
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        ),
    },
    {
      key: 'created_at',
      label: 'Added',
      render: (value) => (
        <span className="text-xs text-slate-500">
          {value ? new Date(value).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'outreach',
      label: 'Outreach',
      render: (_, row) => {
        const stages = [
          { key: 'INITIAL', label: 'I' },
          { key: 'FOLLOWUP_1', label: 'F1' },
          { key: 'FOLLOWUP_2', label: 'F2' },
        ];
        return (
          <div className="space-y-1 text-[11px]">
            <div className="flex items-center gap-1">
              
              {stages.map((stage) => {
                const sent = isStageSent(row, 'WHATSAPP', stage.key);
                return (
                  <div
                    key={stage.key}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                      sent
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <MessageSquare
                      className={`w-3 h-3 ${
                        sent ? 'text-emerald-500' : 'text-slate-300'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-1">
              
              {stages.map((stage) => {
                const sent = isStageSent(row, 'EMAIL', stage.key);
                return (
                  <div
                    key={stage.key}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                      sent
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Mail
                      className={`w-3 h-3 ${
                        sent ? 'text-indigo-500' : 'text-slate-300'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      },
    },
    {
      key: 'replies',
      label: 'Reply',
      render: (_, row) => {
        const replied = hasReplies(row);
        return (
          <div className="flex items-center justify-start">
            {replied ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 text-[11px] font-medium">
                <CheckCircle2 className="w-3 h-3" />
                Replied
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">No reply</span>
            )}
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
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            Company pipeline
          </p>
          <h1 className="mt-1 text-2xl lg:text-3xl font-semibold text-slate-900">
            Companies in your outreach workspace
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage AI-discovered companies, see who has outreach scheduled, and track who replied.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Total companies: {totalCompanies.toLocaleString()} · With outreach: {companiesWithOutreach.toLocaleString()} · With replies: {companiesWithReplies.toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row  items-stretch sm:items-center gap-3">
          <Button
            onClick={() => setFetchModalOpen(true)}
            icon={Sparkles}
            className="bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-400 hover:brightness-105 shadow-lg shadow-sky-200"
          >
            AI Fetch Companies
          </Button>
          <Button variant="outline" size="sm" icon={Download} onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total companies</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{totalCompanies.toLocaleString()}</p>
            <p className="mt-1 text-[11px] text-slate-400">All industries and countries</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-md shadow-sky-100">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">With outreach</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{companiesWithOutreach.toLocaleString()}</p>
            <p className="mt-1 text-[11px] text-slate-400">At least one email or WhatsApp generated</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-sky-100">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">With replies</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{companiesWithReplies.toLocaleString()}</p>
            <p className="mt-1 text-[11px] text-slate-400">Qualified leads from email or WhatsApp</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Missing contacts</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{companiesWithoutContact.toLocaleString()}</p>
            <p className="mt-1 text-[11px] text-slate-400">No email or phone available</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white shadow-md shadow-amber-100">
            <Mail className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters card */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-indigo-50 p-5 lg:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide">Filters</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Refine results by industry, country, replies, or search term.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFilters({ industry: 'all', country: 'all', replies: 'all', dateFrom: '', dateTo: '' })}
            className="self-start text-xs font-medium text-sky-700 hover:text-sky-800"
          >
            Reset filters
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value;
                setSearchTerm(value);
                handleSearch(value);
              }}
              placeholder="Name, website, industry..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          {/* Industry */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Industry</label>
            <select
              value={filters.industry}
              onChange={(e) => setFilters((prev) => ({ ...prev, industry: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All industries</option>
              {uniqueIndustries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>
          {/* Country */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Country</label>
            <select
              value={filters.country}
              onChange={(e) => setFilters((prev) => ({ ...prev, country: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All countries</option>
              {uniqueCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {/* Replies */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Replies</label>
            <select
              value={filters.replies}
              onChange={(e) => setFilters((prev) => ({ ...prev, replies: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="replied">Has replies</option>
              <option value="no_replies">No replies</option>
            </select>
          </div>
        </div>
        {/* Date filters row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Added From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Added To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2 flex items-end justify-end gap-2">
            <Button variant="outline" size="sm" icon={Download} onClick={handleExport}>
              Export
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={() => loadCompanies(pagination.page, searchTerm)}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredCompanies}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => loadCompanies(page, searchTerm)}
        searchPlaceholder="Search companies..."
        selectedRows={selectedRows}
        onSelectRow={(id) =>
          setSelectedRows((prev) =>
            prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
          )
        }
        onSelectAll={(checked) =>
          setSelectedRows(checked ? filteredCompanies.map((c) => c.id) : [])
        }
        emptyMessage="No companies found. Click 'AI Fetch Companies' to get started!"
        actions={
          selectedRows.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={handleDelete}
              >
                Delete ({selectedRows.length})
              </Button>
            </div>
          )
        }
        showSearch={false}
        onRowClick={handleRowClick}
      />

      {/* Fetch Modal */}
      <Modal
        isOpen={fetchModalOpen}
        onClose={() => setFetchModalOpen(false)}
        title="Fetch Companies with AI"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl border border-indigo-100">
            <p className="text-sm text-indigo-700">
              <Sparkles className="w-4 h-4 inline mr-1" />
              AI will find companies matching your criteria using OpenAI and Gemini, then scrape their contact details.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Industry
            </label>
            <input
              type="text"
              value={fetchForm.industry}
              onChange={(e) =>
                setFetchForm({ ...fetchForm, industry: e.target.value })
              }
              placeholder="e.g., Software, Healthcare, Finance"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              value={fetchForm.country}
              onChange={(e) =>
                setFetchForm({ ...fetchForm, country: e.target.value })
              }
              placeholder="e.g., USA, India, UK"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Companies (1-30)
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={fetchForm.count}
              onChange={(e) =>
                setFetchForm({ ...fetchForm, count: parseInt(e.target.value) || 10 })
              }
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setFetchModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleFetchCompanies}
              loading={fetching}
              disabled={!fetchForm.industry || !fetchForm.country}
              className="bg-gradient-to-r from-indigo-600 to-violet-600"
            >
              Fetch Companies
            </Button>
          </div>
        </div>
      </Modal>

      {/* Company Detail Modal */}
      <Modal
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setActiveCompany(null);
          setEditMode(false);
        }}
        title="Company details"
        size="xl"
      >
        {detailLoading || !activeCompany ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Hero card */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-2xl shadow-sm shadow-indigo-50 px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 flex items-center justify-center text-white font-semibold text-lg">
                  {activeCompany.name?.charAt(0) || '?'}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{activeCompany.name}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {activeCompany.industry} • {activeCompany.country}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Added on{' '}
                    {new Date(activeCompany.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                {activeCompany.website && (
                  <a
                    href={activeCompany.website.startsWith('http') ? activeCompany.website : `https://${activeCompany.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-indigo-600 text-xs font-medium shadow-sm hover:bg-slate-50"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Visit website
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {activeCompany.email && (
                  <a
                    href={`mailto:${activeCompany.email}`}
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
                    {activeCompany && (
                      <button
                        type="button"
                        onClick={editMode ? cancelEditingCompany : startEditingCompany}
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
                          onClick={cancelEditingCompany}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingCompany}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {savingCompany ? 'Saving...' : 'Save changes'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-400 text-xs">Email</p>
                        <p className="text-slate-700 break-all">{activeCompany.email || '—'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Phone</p>
                        <p className="text-slate-700">{activeCompany.phone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Country</p>
                        <p className="text-slate-700">{activeCompany.country}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Website</p>
                        <p className="text-slate-700 break-all">{activeCompany.website || '—'}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-2xl p-5 shadow-sm shadow-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">Recent activity</h3>
                    <span className="text-xs text-slate-400">
                      {activeCompany.messages?.length || 0} messages · {activeCompany.replies?.length || 0} replies
                    </span>
                  </div>
                  {activeCompany.messages && activeCompany.messages.length > 0 ? (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {activeCompany.messages.slice(0, 5).map((msg) => (
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
                            variant={msg.status === 'SENT' ? 'success' : msg.status === 'DRAFT' ? 'warning' : 'default'}
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
                      <span className="font-medium text-slate-900">{activeCompany.messages?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Sent</span>
                      <span className="font-medium text-slate-900">
                        {(activeCompany.messages || []).filter((m) => m.status === 'SENT').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Draft</span>
                      <span className="font-medium text-slate-900">
                        {(activeCompany.messages || []).filter((m) => m.status === 'DRAFT').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Replies</span>
                      <span className="font-medium text-slate-900">{activeCompany.replies?.length || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-2xl p-5 shadow-sm shadow-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Latest reply</h3>
                  {activeCompany.replies && activeCompany.replies.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400">
                        {new Date(activeCompany.replies[0].replied_at).toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {activeCompany.replies[0].reply_content || 'Reply received'}
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
    </div>
  );
}
