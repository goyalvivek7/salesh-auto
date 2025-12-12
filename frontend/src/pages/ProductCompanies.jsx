import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Mail,
  MessageSquare,
  Globe,
  RefreshCw,
  Users,
  Phone,
  ExternalLink,
  Download,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import DataTable from '../components/DataTable';
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
  const [selectedRows, setSelectedRows] = useState([]);

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
    const company = row.company || row;
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      const res = await getCompany(company.id);
      setActiveCompany(res.data);
    } catch (error) {
      console.error('Failed to load company details:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  // Helper to check if a stage was sent
  const isStageSent = (row, type, stage) => {
    const company = row.company || row;
    const messages = company.messages || [];
    return messages.some(
      (msg) =>
        msg.type === type &&
        msg.stage === stage &&
        ['SENT', 'DELIVERED', 'READ'].includes(msg.status)
    );
  };

  const hasReplies = (row) => {
    const company = row.company || row;
    return (company.replies || []).length > 0;
  };

  // Define columns matching Services Companies style
  const columns = [
    {
      key: 'name',
      label: 'Company',
      render: (_, row) => {
        const company = row.company || row;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold">
              {company.name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="font-medium text-gray-900">{company.name}</p>
              <p className="text-xs text-gray-500">{company.industry}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'country',
      label: 'Country',
      render: (_, row) => {
        const company = row.company || row;
        return company.country ? (
          <Badge variant="default">{company.country}</Badge>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        );
      },
    },
    {
      key: 'email',
      label: 'Email',
      render: (_, row) => {
        const company = row.company || row;
        return company.email ? (
          <a
            href={`mailto:${company.email}`}
            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="text-sm">{company.email}</span>
          </a>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        );
      },
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (_, row) => {
        const company = row.company || row;
        return company.phone ? (
          <span className="flex items-center gap-1 text-sm text-gray-700">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            {company.phone}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        );
      },
    },
    {
      key: 'website',
      label: 'Website',
      render: (_, row) => {
        const company = row.company || row;
        return company.website ? (
          <a
            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm"
          >
            <Globe className="w-3.5 h-3.5" />
            Visit
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        );
      },
    },
    {
      key: 'created_at',
      label: 'Added',
      render: (_, row) => {
        const company = row.company || row;
        return (
          <span className="text-xs text-slate-500">
            {company.created_at ? new Date(company.created_at).toLocaleDateString() : '—'}
          </span>
        );
      },
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
      <DataTable
        columns={columns}
        data={companies}
        loading={isLoading}
        pagination={{
          page,
          pageSize,
          total,
          totalPages,
        }}
        onPageChange={(newPage) => setPage(newPage)}
        selectedRows={selectedRows}
        onSelectRow={(id) =>
          setSelectedRows((prev) =>
            prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
          )
        }
        onSelectAll={(checked) =>
          setSelectedRows(checked ? companies.map((c) => c.id) : [])
        }
        emptyMessage="No companies found. Fetch clients for a product to see them here."
        actions={
          selectedRows.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={() => {
                  if (confirm(`Delete ${selectedRows.length} companies?`)) {
                    setSelectedRows([]);
                  }
                }}
              >
                Delete ({selectedRows.length})
              </Button>
            </div>
          )
        }
        showSearch={false}
        onRowClick={handleRowClick}
      />

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
