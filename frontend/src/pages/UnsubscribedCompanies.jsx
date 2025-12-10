import { useState, useEffect, useCallback } from 'react';
import {
  UserX,
  Building2,
  Globe,
  Mail,
  Phone,
  RefreshCw,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { getServiceUnsubscribes, removeFromUnsubscribeList } from '../services/api';

export default function UnsubscribedCompanies() {
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
  });

  const loadUnsubscribedCompanies = useCallback(async (page = 1, search = '') => {
    try {
      setLoading(true);
      // Use service-specific endpoint with /services/ prefix
      const res = await getServiceUnsubscribes({ page, page_size: 20, search });
      const items = res.data.items || [];
      setCompanies(items);
      setPagination({
        page: res.data.page,
        pageSize: res.data.page_size,
        total: res.data.total,
        totalPages: res.data.total_pages,
      });
    } catch (error) {
      console.error('Failed to load unsubscribed companies:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnsubscribedCompanies();
  }, [loadUnsubscribedCompanies]);

  const handleSearch = useCallback(
    (term) => {
      setSearchTerm(term);
      const timeoutId = setTimeout(() => {
        loadUnsubscribedCompanies(1, term);
      }, 300);
      return () => clearTimeout(timeoutId);
    },
    [loadUnsubscribedCompanies]
  );

  const handleResubscribe = async (id) => {
    if (!window.confirm('Are you sure you want to re-subscribe this company? They will start receiving emails again.')) {
      return;
    }
    try {
      await removeFromUnsubscribeList(id);
      loadUnsubscribedCompanies(pagination.page, searchTerm);
    } catch (error) {
      console.error('Failed to re-subscribe:', error);
      alert('Failed to re-subscribe company');
    }
  };

  const totalCompanies = pagination.total || companies.length;

  const recentUnsubscribedCount = companies.filter((c) => {
    if (!c.unsubscribed_at) return false;
    const unsubDate = new Date(c.unsubscribed_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return unsubDate >= sevenDaysAgo;
  }).length;

  const uniqueIndustries = Array.from(new Set(companies.map((c) => c.industry).filter(Boolean)));
  const uniqueCountries = Array.from(new Set(companies.map((c) => c.country).filter(Boolean)));

  const filteredCompanies = companies.filter((c) => {
    if (filters.industry !== 'all' && c.industry !== filters.industry) return false;
    if (filters.country !== 'all' && c.country !== filters.country) return false;
    return true;
  });

  const columns = [
    {
      key: 'name',
      label: 'Company',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center text-white font-semibold">
            {row.name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            <p className="text-xs text-gray-500">{row.industry || 'Unknown industry'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'country',
      label: 'Country',
      render: (value) => value ? <Badge variant="default">{value}</Badge> : <span className="text-gray-400 text-sm">—</span>,
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
      key: 'reason',
      label: 'Reason',
      render: (value) => (
        <span className="text-xs text-slate-600 max-w-[200px] truncate block" title={value}>
          {value || 'No reason provided'}
        </span>
      ),
    },
    {
      key: 'unsubscribed_at',
      label: 'Unsubscribed At',
      render: (value) => (
        <span className="text-xs text-slate-500">
          {value ? new Date(value).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          icon={RotateCcw}
          onClick={() => handleResubscribe(row.id)}
          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
        >
          Re-subscribe
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero / header */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-red-50 px-6 py-5 lg:px-8 lg:py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide flex items-center gap-1">
            <UserX className="w-3.5 h-3.5" />
            Unsubscribed Companies
          </p>
          <h1 className="mt-1 text-2xl lg:text-3xl font-semibold text-slate-900">
            Companies that opted out
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            These companies have unsubscribed from your outreach emails.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Total unsubscribed: {totalCompanies.toLocaleString()} · Last 7 days: {recentUnsubscribedCount.toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() => loadUnsubscribedCompanies(pagination.page, searchTerm)}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Unsubscribed</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{totalCompanies.toLocaleString()}</p>
            <p className="mt-1 text-[11px] text-slate-400">Companies that opted out</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-rose-400 flex items-center justify-center text-white shadow-md shadow-red-100">
            <UserX className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Last 7 Days</p>
            <p className="mt-1 text-2xl font-semibold text-red-600">{recentUnsubscribedCount.toLocaleString()}</p>
            <p className="mt-1 text-[11px] text-slate-400">Recent unsubscribes</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-orange-100">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Industries Affected</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{uniqueIndustries.length}</p>
            <p className="mt-1 text-[11px] text-slate-400">Unique industries</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-500 to-gray-400 flex items-center justify-center text-white shadow-md shadow-slate-100">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters card */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-red-50 p-5 lg:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Filters</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Search and filter unsubscribed companies.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFilters({ industry: 'all', country: 'all' });
              setSearchTerm('');
              loadUnsubscribedCompanies(1, '');
            }}
            className="self-start text-xs font-medium text-red-700 hover:text-red-800"
          >
            Reset filters
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
              placeholder="Name, email, industry..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          {/* Industry */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Industry</label>
            <select
              value={filters.industry}
              onChange={(e) => setFilters((prev) => ({ ...prev, industry: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="all">All countries</option>
              {uniqueCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredCompanies}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => loadUnsubscribedCompanies(page, searchTerm)}
        searchPlaceholder="Search unsubscribed companies..."
        selectedRows={[]}
        emptyMessage="No unsubscribed companies yet. Companies that opt out of your emails will appear here."
        actions={null}
        showSearch={false}
      />
    </div>
  );
}
