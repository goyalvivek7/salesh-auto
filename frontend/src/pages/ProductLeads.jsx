import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  ChevronLeft,
  ChevronRight,
  Flame,
  MessageSquare,
  Mail,
  RefreshCw,
  Download,
  Star,
  Building2,
  Phone,
  Globe,
  ExternalLink,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import Badge from '../components/Badge';
import { getProducts, getProductLeads } from '../services/api';
import api from '../services/api';

export default function ProductLeads() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [intentFilter, setIntentFilter] = useState('');
  const [industry, setIndustry] = useState('');
  const [activeTab, setActiveTab] = useState('qualified');

  const { data: productsData } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => getProducts({ page: 1, page_size: 100 }),
  });

  const { data: leadsData, isLoading, refetch } = useQuery({
    queryKey: ['product-leads-all', page, selectedProduct, intentFilter],
    queryFn: async () => {
      if (selectedProduct) {
        const params = { page, page_size: 20 };
        if (intentFilter) params.intent = intentFilter;
        return getProductLeads(selectedProduct, params);
      }
      return { data: { items: [], total: 0, total_pages: 1 } };
    },
    enabled: !!selectedProduct,
  });

  const products = productsData?.data?.items || [];
  const leads = leadsData?.data?.items || [];
  const totalPages = leadsData?.data?.total_pages || 1;
  const total = leadsData?.data?.total || 0;
  const pageSize = 20;
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const resetFilters = () => {
    setSearch('');
    setSelectedProduct('');
    setIntentFilter('');
    setIndustry('');
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Hero Section */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-teal-50 px-6 py-5 lg:px-8 lg:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-teal-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide">LEADS & REPLIES</p>
              <h1 className="text-xl font-semibold text-slate-900">Qualified leads and reply inbox</h1>
              <p className="text-sm text-slate-500">
                Companies that responded to your outreach campaigns. Track and manage qualified leads.
                <br />
                <span className="text-teal-600">{total} qualified leads · 0 total replies</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-teal-600">{total}</p>
            <p className="text-xs text-slate-500">Total Leads</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Qualified Leads</p>
              <p className="text-xl font-bold text-slate-900">{total}</p>
              <p className="text-[11px] text-slate-400">Hot prospects ready for follow up</p>
            </div>
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <Star className="w-4 h-4 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Total Replies</p>
              <p className="text-xl font-bold text-slate-900">0</p>
              <p className="text-[11px] text-slate-400">All responses received</p>
            </div>
            <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-teal-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Email Replies</p>
              <p className="text-xl font-bold text-slate-900">0</p>
              <p className="text-[11px] text-slate-400">From email campaigns</p>
            </div>
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Mail className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">WhatsApp Replies</p>
              <p className="text-xl font-bold text-slate-900">0</p>
              <p className="text-[11px] text-slate-400">From WhatsApp campaigns</p>
            </div>
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-teal-50 p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-teal-600 uppercase">FILTERS</p>
            <p className="text-xs text-slate-500">Filter leads and replies by source, industry, or date</p>
          </div>
          <button onClick={resetFilters} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
            Reset Filters
          </button>
        </div>
        <div className="grid grid-cols-6 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Search</label>
            <input
              type="text"
              placeholder="Company, Industry..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Product</label>
            <select
              value={selectedProduct}
              onChange={(e) => { setSelectedProduct(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none bg-white"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none bg-white"
            >
              <option value="">All Industries</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Reply From</label>
            <input type="date" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Reply To</label>
            <input type="date" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none" />
          </div>
          <div className="flex items-end gap-2">
            <button className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button onClick={() => refetch()} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('qualified')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
            activeTab === 'qualified' 
              ? 'bg-teal-600 text-white' 
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Flame className="w-4 h-4" />
          Qualified Leads
          <span className={`px-1.5 py-0.5 text-xs rounded ${activeTab === 'qualified' ? 'bg-teal-500' : 'bg-slate-100'}`}>
            {total}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('replies')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
            activeTab === 'replies' 
              ? 'bg-teal-600 text-white' 
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          All Replies
          <span className={`px-1.5 py-0.5 text-xs rounded ${activeTab === 'replies' ? 'bg-teal-500' : 'bg-slate-100'}`}>
            0
          </span>
        </button>
      </div>

      {/* Content - Lead Cards */}
      {!selectedProduct ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/70 shadow-sm shadow-slate-100 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Select a product to view leads</p>
          <p className="text-sm text-slate-400 mt-1">Choose a product from the filter above to see its qualified leads</p>
        </div>
      ) : isLoading ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/70 shadow-sm shadow-slate-100 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/70 shadow-sm shadow-slate-100 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No qualified leads yet</p>
          <p className="text-sm text-slate-400 mt-1">Leads will appear here when companies reply to your outreach</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Lead Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 p-5 hover:shadow-md transition-shadow"
              >
                {/* Lead Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-semibold">
                      {lead.company?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {lead.company?.name || `Company #${lead.company_id}`}
                      </h3>
                      <p className="text-xs text-slate-500">{lead.company?.industry || 'Unknown Industry'}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      lead.intent === 'HOT' ? 'danger' :
                      lead.intent === 'WARM' ? 'warning' : 'info'
                    }
                  >
                    <Flame className="w-3 h-3 mr-1" />
                    {lead.intent}
                  </Badge>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  {lead.company?.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <a href={`mailto:${lead.company.email}`} className="text-indigo-600 hover:underline">
                        {lead.company.email}
                      </a>
                    </div>
                  )}
                  {lead.company?.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {lead.company.phone}
                    </div>
                  )}
                  {lead.company?.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="w-4 h-4 text-slate-400" />
                      <a
                        href={lead.company.website.startsWith('http') ? lead.company.website : `https://${lead.company.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        Visit Website <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(lead.created_at).toLocaleDateString()}
                  </div>
                  {lead.company?.country && (
                    <Badge variant="default">{lead.company.country}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70">
              <p className="text-sm text-slate-500">
                Showing {total > 0 ? startItem : 0} to {endItem} of {total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 bg-teal-600 text-white text-sm rounded">{page}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
