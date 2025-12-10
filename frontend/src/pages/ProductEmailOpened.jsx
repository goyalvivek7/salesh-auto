import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Globe,
  RefreshCw,
  Users,
  Calendar,
} from 'lucide-react';
import { getProducts } from '../services/api';
import api from '../services/api';

export default function ProductEmailOpened() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');

  const { data: productsData } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => getProducts({ page: 1, page_size: 100 }),
  });

  const { data: opensData, isLoading, refetch } = useQuery({
    queryKey: ['product-email-opens', page, selectedProduct, search],
    queryFn: async () => {
      const params = { page, page_size: 20 };
      if (selectedProduct) params.product_id = selectedProduct;
      return await api.get('/products/email-opens', { params });
    },
  });

  const products = productsData?.data?.items || [];
  const opens = opensData?.data?.items || [];
  const totalPages = opensData?.data?.total_pages || 1;
  const total = opensData?.data?.total || 0;
  const pageSize = 20;
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const resetFilters = () => {
    setSearch('');
    setSelectedProduct('');
    setIndustry('');
    setCountry('');
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Hero Section */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-emerald-50 px-6 py-5 lg:px-8 lg:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">ENGAGED COMPANIES</p>
              <h1 className="text-xl font-semibold text-slate-900">Companies that opened your emails</h1>
              <p className="text-sm text-slate-500">
                Opened companies: {total} · With replies: 0 · Opened in last 7 days: 0
              </p>
            </div>
          </div>
          <button onClick={() => refetch()} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Opened Companies</p>
              <p className="text-xl font-bold text-slate-900">{total}</p>
              <p className="text-[11px] text-slate-400">Have opened at least one email</p>
            </div>
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Eye className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">With Replies</p>
              <p className="text-xl font-bold text-slate-900">0</p>
              <p className="text-[11px] text-slate-400">Opened and replied via any channel</p>
            </div>
            <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-teal-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Opened Last 7 Days</p>
              <p className="text-xl font-bold text-emerald-600">0</p>
              <p className="text-[11px] text-slate-400">Recent engagement</p>
            </div>
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Avg Opens / Company</p>
              <p className="text-xl font-bold text-slate-900">0</p>
              <p className="text-[11px] text-slate-400">Across opened companies</p>
            </div>
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-emerald-50 p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase">FILTERS</p>
            <p className="text-xs text-slate-500">Refine results by industry, country, replies, or last opened date</p>
          </div>
          <button onClick={resetFilters} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
            Reset Filters
          </button>
        </div>
        <div className="grid grid-cols-6 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Search</label>
            <input
              type="text"
              placeholder="Name, industry, country..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Product</label>
            <select
              value={selectedProduct}
              onChange={(e) => { setSelectedProduct(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
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
            <label className="block text-xs text-slate-500 mb-1">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none bg-white"
            >
              <option value="">All Countries</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Last Opened From</label>
            <input type="date" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none" />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => refetch()}
              className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/70 shadow-sm shadow-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Company</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Country</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Email</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Phone</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Website</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Last Opened</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Opens</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Reply</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                  </td>
                </tr>
              ) : opens.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Eye className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No opened companies yet</p>
                    <p className="text-sm text-slate-400">Once contacts open your emails, they will appear here</p>
                  </td>
                </tr>
              ) : (
                opens.map((open) => (
                  <tr key={open.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900">{open.company_name || 'Unknown'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{open.country || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{open.email || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{open.phone || '-'}</td>
                    <td className="py-3 px-4">
                      {open.website ? (
                        <a href={open.website} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline text-sm flex items-center gap-1">
                          <Globe className="w-3 h-3" /> Visit
                        </a>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-500">{open.opened_at ? new Date(open.opened_at).toLocaleDateString() : '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{open.open_count || 1}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">-</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-500">
            Showing {total > 0 ? startItem : 0} to {endItem} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-emerald-600 text-white text-sm rounded">{page}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
