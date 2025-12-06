import { useState, useEffect, useCallback } from 'react';
import {
  Eye,
  Building2,
  Globe,
  Mail,
  Phone,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { getEmailOpenedCompanies } from '../services/api';

export default function EmailOpenedCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    industry: 'all',
    country: 'all',
    replies: 'all',
    dateFrom: '',
    dateTo: '',
  });

  const loadOpenedCompanies = useCallback(async (page = 1, search = '') => {
    try {
      setLoading(true);
      const res = await getEmailOpenedCompanies({ page, page_size: 20, search });
      const items = res.data.items || [];
      setCompanies(items);
      setPagination({
        page: res.data.page,
        pageSize: res.data.page_size,
        total: res.data.total,
        totalPages: res.data.total_pages,
      });
    } catch (error) {
      console.error('Failed to load opened companies:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOpenedCompanies();
  }, [loadOpenedCompanies]);

  const handleSearch = useCallback(
    (term) => {
      setSearchTerm(term);
      const timeoutId = setTimeout(() => {
        loadOpenedCompanies(1, term);
      }, 300);
      return () => clearTimeout(timeoutId);
    },
    [loadOpenedCompanies]
  );

  const totalCompanies = pagination.total || companies.length;
  const companiesWithReplies = companies.filter((c) => c.has_reply).length;

  const recentOpenedCount = companies.filter((c) => {
    if (!c.last_opened_at) return false;
    const openedDate = new Date(c.last_opened_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return openedDate >= sevenDaysAgo;
  }).length;

  const avgOpensPerCompany = companies.length
    ? (companies.reduce((sum, c) => sum + (c.open_count || 0), 0) / companies.length).toFixed(1)
    : 0;

  const uniqueIndustries = Array.from(new Set(companies.map((c) => c.industry).filter(Boolean)));
  const uniqueCountries = Array.from(new Set(companies.map((c) => c.country).filter(Boolean)));

  const filteredCompanies = companies.filter((c) => {
    if (filters.industry !== 'all' && c.industry !== filters.industry) return false;
    if (filters.country !== 'all' && c.country !== filters.country) return false;
    if (filters.replies === 'replied' && !c.has_reply) return false;
    if (filters.replies === 'no_replies' && c.has_reply) return false;

    if (filters.dateFrom && c.last_opened_at) {
      const openedDate = new Date(c.last_opened_at).setHours(0, 0, 0, 0);
      const fromDate = new Date(filters.dateFrom).setHours(0, 0, 0, 0);
      if (openedDate < fromDate) return false;
    }
    if (filters.dateTo && c.last_opened_at) {
      const openedDate = new Date(c.last_opened_at).setHours(0, 0, 0, 0);
      const toDate = new Date(filters.dateTo).setHours(23, 59, 59, 999);
      if (openedDate > toDate) return false;
    }

    return true;
  });

  const columns = [
    {
      key: 'name',
      label: 'Company',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-semibold">
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
      render: (value) => <Badge variant="default">{value}</Badge>,
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
      key: 'last_opened_at',
      label: 'Last Opened',
      render: (value) => (
        <span className="text-xs text-slate-500">
          {value ? new Date(value).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      key: 'open_count',
      label: 'Opens',
      render: (value) => (
        <Badge variant="default">{value || 0} opens</Badge>
      ),
    },
    {
      key: 'has_reply',
      label: 'Reply',
      render: (value) => (
        <div className="flex items-center justify-start">
          {value ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 text-[11px] font-medium">
              <CheckCircle2 className="w-3 h-3" />
              Replied
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">No reply</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero / header */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-emerald-50 px-6 py-5 lg:px-8 lg:py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            Engaged companies
          </p>
          <h1 className="mt-1 text-2xl lg:text-3xl font-semibold text-slate-900">
            Companies that opened your emails
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            A focused view of companies who have opened at least one outreach email.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Opened companies: {totalCompanies.toLocaleString()} · With replies: {companiesWithReplies.toLocaleString()} · Opened in last 7 days: {recentOpenedCount.toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() => loadOpenedCompanies(pagination.page, searchTerm)}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Opened companies</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{totalCompanies.toLocaleString()}</p>
            <p className="mt-1 text-[11px] text-slate-400">Have opened at least one email</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-100">
            <Eye className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">With replies</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{companiesWithReplies.toLocaleString()}</p>
            <p className="mt-1 text-[11px] text-slate-400">Opened and replied via any channel</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Opened last 7 days</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600">{recentOpenedCount.toLocaleString()}</p>
            <p className="mt-1 text-[11px] text-slate-400">Recent engagement</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-lime-400 flex items-center justify-center text-white shadow-md shadow-emerald-100">
            <Eye className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg opens / company</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{avgOpensPerCompany}</p>
            <p className="mt-1 text-[11px] text-slate-400">Across opened companies</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-sky-100">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters card */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-emerald-50 p-5 lg:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Filters</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Refine results by industry, country, replies, or last opened date.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFilters({ industry: 'all', country: 'all', replies: 'all', dateFrom: '', dateTo: '' });
              setSearchTerm('');
              loadOpenedCompanies(1, '');
            }}
            className="self-start text-xs font-medium text-emerald-700 hover:text-emerald-800"
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
              placeholder="Name, industry, country..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          {/* Industry */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Industry</label>
            <select
              value={filters.industry}
              onChange={(e) => setFilters((prev) => ({ ...prev, industry: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
            <label className="block text-xs font-medium text-slate-500 mb-1">Last opened from</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Last opened to</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2 flex items-end justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={() => loadOpenedCompanies(pagination.page, searchTerm)}
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
        onPageChange={(page) => loadOpenedCompanies(page, searchTerm)}
        searchPlaceholder="Search opened companies..."
        selectedRows={[]}
        emptyMessage="No opened companies yet. Once contacts open your emails, they will appear here."
        actions={null}
        showSearch={false}
      />
    </div>
  );
}
