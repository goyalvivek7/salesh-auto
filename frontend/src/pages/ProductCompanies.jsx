import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Search,
  ChevronLeft,
  ChevronRight,
  Package,
  Mail,
  MessageSquare,
  Globe,
  RefreshCw,
  Users,
  Phone,
  ExternalLink,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import Button from '../components/Button';
import Badge from '../components/Badge';
import CompanyDetailModal from '../components/CompanyDetailModal';
import { getProducts, getCompany } from '../services/api';
import api from '../services/api';

export default function ProductCompanies() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeCompany, setActiveCompany] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch products for filter dropdown
  const { data: productsData } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => getProducts({ page: 1, page_size: 100 }),
  });

  // Fetch companies associated with products
  const { data: companiesData, isLoading, refetch } = useQuery({
    queryKey: ['product-companies-all', page, search, selectedProduct, industry, country],
    queryFn: async () => {
      const params = { page, page_size: 20, search, has_product: true };
      if (selectedProduct) {
        const response = await api.get(`/products/${selectedProduct}/companies`, { params });
        return response;
      } else {
        const response = await api.get('/companies', { params });
        return response;
      }
    },
  });

  const products = productsData?.data?.items || [];
  const companies = companiesData?.data?.items || [];
  const totalPages = companiesData?.data?.total_pages || 1;
  const total = companiesData?.data?.total || 0;
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

  const handleRowClick = async (row) => {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      const res = await getCompany(row.id);
      setActiveCompany(res.data);
    } catch (error) {
      console.error('Failed to load company details:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Hero Section */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-indigo-50 px-6 py-5 lg:px-8 lg:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">PRODUCTS · COMPANIES</p>
              <h1 className="text-xl font-semibold text-slate-900">Product Companies</h1>
              <p className="text-sm text-slate-500">Companies associated with products</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-600">{total}</p>
            <p className="text-xs text-slate-500">Total Companies</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Total Companies</p>
              <p className="text-xl font-bold text-slate-900">{total}</p>
              <p className="text-[11px] text-slate-400">All products</p>
            </div>
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">With Outreach</p>
              <p className="text-xl font-bold text-slate-900">0</p>
              <p className="text-[11px] text-slate-400">Email or WhatsApp sent</p>
            </div>
            <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-teal-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">With Replies</p>
              <p className="text-xl font-bold text-slate-900">0</p>
              <p className="text-[11px] text-slate-400">Qualified leads</p>
            </div>
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Missing Contacts</p>
              <p className="text-xl font-bold text-slate-900">0</p>
              <p className="text-[11px] text-slate-400">No email or phone</p>
            </div>
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <Mail className="w-4 h-4 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-indigo-50 p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-indigo-600 uppercase">FILTERS</p>
            <p className="text-xs text-slate-500">Filter companies by product, industry, or search term</p>
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
              placeholder="Name, website, industry..."
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
            <label className="block text-xs text-slate-500 mb-1">Industry</label>
            <select
              value={industry}
              onChange={(e) => { setIndustry(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="">All Industries</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Country</label>
            <select
              value={country}
              onChange={(e) => { setCountry(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="">All Countries</option>
            </select>
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
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Product</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Outreach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No companies found</p>
                    <p className="text-sm text-slate-400">Fetch clients for a product to see them here</p>
                  </td>
                </tr>
              ) : (
                companies.map((item) => {
                  const company = item.company || item;
                  const productName = item.product?.name;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => handleRowClick(company)}
                    >
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-900">{company.name}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">{company.country || '-'}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{company.email || '-'}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{company.phone || '-'}</td>
                      <td className="py-3 px-4">
                        {company.website ? (
                          <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Visit
                          </a>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {productName && (
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-lg">
                            {productName}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">-</td>
                    </tr>
                  );
                })
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
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-indigo-600 text-white text-sm rounded">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <CompanyDetailModal
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setActiveCompany(null);
        }}
        company={activeCompany}
        loading={detailLoading}
        onUpdated={(updated) => {
          setActiveCompany(updated);
          refetch();
        }}
      />
    </div>
  );
}
