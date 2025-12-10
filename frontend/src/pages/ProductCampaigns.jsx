import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Megaphone,
  ChevronLeft,
  ChevronRight,
  Package,
  MessageSquare,
  CheckCircle,
  Clock,
  RefreshCw,
  Send,
} from 'lucide-react';
import { getProducts } from '../services/api';
import api from '../services/api';

export default function ProductCampaigns() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [status, setStatus] = useState('');

  const { data: productsData } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => getProducts({ page: 1, page_size: 100 }),
  });

  const { data: campaignsData, isLoading, refetch } = useQuery({
    queryKey: ['product-campaigns-all', page, search, selectedProduct, status],
    queryFn: async () => {
      const params = { page, page_size: 20, has_product: true, search };
      if (selectedProduct) {
        return await api.get(`/products/${selectedProduct}/campaigns`, { params });
      }
      return await api.get('/campaigns', { params });
    },
  });

  const products = productsData?.data?.items || [];
  const campaigns = campaignsData?.data?.items || [];
  const totalPages = campaignsData?.data?.total_pages || 1;
  const total = campaignsData?.data?.total || 0;
  const pageSize = 20;
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const resetFilters = () => {
    setSearch('');
    setSelectedProduct('');
    setStatus('');
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Hero Section */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-indigo-50 px-6 py-5 lg:px-8 lg:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">PRODUCTS · CAMPAIGNS</p>
              <h1 className="text-xl font-semibold text-slate-900">Product Campaigns</h1>
              <p className="text-sm text-slate-500">
                Total campaigns: {total} · Messages: 0 · Sent: 0 · Pending: 0
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-600">{total}</p>
            <p className="text-xs text-slate-500">Total Campaigns</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Total Campaigns</p>
              <p className="text-xl font-bold text-slate-900">{total}</p>
              <p className="text-[11px] text-slate-400">All time</p>
            </div>
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Total Messages</p>
              <p className="text-xl font-bold text-slate-900">0</p>
              <p className="text-[11px] text-slate-400">Email & WhatsApp combined</p>
            </div>
            <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-teal-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Sent</p>
              <p className="text-xl font-bold text-emerald-600">0</p>
              <p className="text-[11px] text-slate-400">Successfully delivered</p>
            </div>
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Pending</p>
              <p className="text-xl font-bold text-amber-600">0</p>
              <p className="text-[11px] text-slate-400">Awaiting send</p>
            </div>
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-indigo-50 p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-indigo-600 uppercase">FILTERS</p>
            <p className="text-xs text-slate-500">Filter campaigns by name, product, or status</p>
          </div>
          <button onClick={resetFilters} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
            Reset Filters
          </button>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Search</label>
            <input
              type="text"
              placeholder="Campaign name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Product</label>
            <select
              value={selectedProduct}
              onChange={(e) => { setSelectedProduct(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Created From</label>
            <input
              type="date"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            />
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
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Campaign</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Product</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Companies</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Messages</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No product campaigns found</p>
                    <p className="text-sm text-slate-400">Generate a campaign from a product page</p>
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-900">{campaign.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      {campaign.product?.name && (
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-lg">
                          {campaign.product.name}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{campaign.companies_count || 0}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{campaign.messages?.length || 0}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg">
                        {campaign.status || 'Draft'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-500">
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </td>
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
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-indigo-600 text-white text-sm rounded">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
