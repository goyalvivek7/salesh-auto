import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Megaphone,
  MessageSquare,
  CheckCircle,
  Clock,
  RefreshCw,
  Send,
  Plus,
  Trash2,
  X,
  Play,
  Loader2,
  Mail,
  Building2,
  Calendar,
  BarChart3,
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { getProducts, getCampaign, generateProductCampaign, startCampaignNow, getProductTemplates } from '../services/api';
import api from '../services/api';

export default function ProductCampaigns() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [status, setStatus] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  
  // Create Campaign Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    product_id: '',
    type: 'BOTH',
    target_count: 50,
  });
  const { data: createTemplatesData } = useQuery({
    queryKey: ['product-templates-for-create', createForm.product_id],
    queryFn: () => getProductTemplates(createForm.product_id),
    enabled: createOpen && !!createForm.product_id,
  });
  
  // Campaign Details Modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState(null);

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

  // Create campaign mutation
  const createMutation = useMutation({
    mutationFn: (data) => {
      const templates = createTemplatesData?.data || {};
      const templateIds = {
        email: {
          initial: templates.email_initial?.id,
          followup_1: templates.email_followup_1?.id,
          followup_2: templates.email_followup_2?.id,
        },
        whatsapp: {
          initial: templates.whatsapp_initial?.id,
          followup_1: templates.whatsapp_followup_1?.id,
          followup_2: templates.whatsapp_followup_2?.id,
        },
      };
      return generateProductCampaign(data.product_id, {
        name: data.name,
        type: data.type,
        target_count: data.target_count,
        templates: templateIds,
      });
    },
    onSuccess: () => {
      setCreateOpen(false);
      setCreateForm({ name: '', product_id: '', type: 'BOTH', target_count: 50 });
      refetch();
    },
  });

  // Start campaign mutation
  const startMutation = useMutation({
    mutationFn: (id) => startCampaignNow(id),
    onSuccess: () => {
      refetch();
      if (activeCampaign) {
        loadCampaignDetails(activeCampaign.id);
      }
    },
  });

  const resetFilters = () => {
    setSearch('');
    setSelectedProduct('');
    setStatus('');
    setPage(1);
  };

  const loadCampaignDetails = async (id) => {
    try {
      setDetailLoading(true);
      const res = await getCampaign(id);
      setActiveCampaign(res.data);
    } catch (error) {
      console.error('Failed to load campaign details:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRowClick = (row) => {
    setDetailOpen(true);
    loadCampaignDetails(row.id);
  };

  // Helper functions for campaign stats
  const getMessageStats = (campaign) => {
    const messages = campaign?.messages || [];
    const sent = messages.filter((m) => ['SENT', 'DELIVERED', 'READ'].includes(m.status)).length;
    const pending = messages.filter((m) => m.status === 'PENDING').length;
    const failed = messages.filter((m) => m.status === 'FAILED').length;
    return { total: messages.length, sent, pending, failed };
  };

  const getCampaignCompanies = (campaign) => {
    const messages = campaign?.messages || [];
    const companyIds = [...new Set(messages.map((m) => m.company_id))];
    return companyIds.length;
  };

  // Status badge helper
  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: { variant: 'warning', label: 'Pending' },
      ACTIVE: { variant: 'info', label: 'Active' },
      COMPLETED: { variant: 'success', label: 'Completed' },
      PAUSED: { variant: 'default', label: 'Paused' },
    };
    const s = statusMap[status] || { variant: 'default', label: status || 'Draft' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  // Define columns
  const columns = [
    {
      key: 'name',
      label: 'Campaign',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            <p className="text-xs text-gray-500">{row.type || 'EMAIL'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'product',
      label: 'Product',
      render: (_, row) => row.product?.name ? (
        <Badge variant="info">{row.product.name}</Badge>
      ) : (
        <span className="text-gray-400 text-sm">—</span>
      ),
    },
    {
      key: 'companies',
      label: 'Companies',
      render: (_, row) => (
        <div className="flex items-center gap-1.5 text-sm text-gray-700">
          <Building2 className="w-3.5 h-3.5 text-gray-400" />
          {row.companies_count || getCampaignCompanies(row)}
        </div>
      ),
    },
    {
      key: 'messages',
      label: 'Messages',
      render: (_, row) => {
        const stats = getMessageStats(row);
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">{stats.total}</span>
            {stats.sent > 0 && (
              <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                {stats.sent} sent
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => getStatusBadge(row.status),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (_, row) => (
        <span className="text-xs text-slate-500">
          {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
        </span>
      ),
    },
  ];

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
          <div className="flex items-center gap-3">
            <Button
              icon={Plus}
              onClick={() => setCreateOpen(true)}
            >
              Create Campaign
            </Button>
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
      <DataTable
        columns={columns}
        data={campaigns}
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
          setSelectedRows(checked ? campaigns.map((c) => c.id) : [])
        }
        emptyMessage="No product campaigns found. Create a campaign to get started."
        actions={
          selectedRows.length > 0 && (
            <div className="flex justify-end gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={Play}
                onClick={() => {
                  selectedRows.forEach((id) => startMutation.mutate(id));
                  setSelectedRows([]);
                }}
              >
                Start ({selectedRows.length})
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={() => {
                  if (confirm(`Delete ${selectedRows.length} campaigns?`)) {
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

      {/* Create Campaign Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Product Campaign"
        size="md"
      >
        <div className="space-y-5">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-white/60 px-4 py-3 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <div className="mt-0.5">
                <Megaphone className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Generate personalized messages for product companies.</p>
                <p className="text-xs text-slate-500 mt-0.5">Select a product and we’ll use its email/WhatsApp templates to create outreach.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product *</label>
                <select
                  value={createForm.product_id}
                  onChange={(e) => setCreateForm({ ...createForm, product_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm"
                >
                  <option value="">Select a product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Auto-generated if empty"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">Leave empty to auto-generate from product and date.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Campaign Type</label>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm"
                >
                  <option value="EMAIL">Email</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="BOTH">Both</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Companies</label>
                <input
                  type="number"
                  value={createForm.target_count}
                  onChange={(e) => setCreateForm({ ...createForm, target_count: parseInt(e.target.value) || 0 })}
                  min={1}
                  max={500}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="attach-brochure"
                  type="checkbox"
                  checked={createForm.attach_brochure ?? true}
                  onChange={(e) => setCreateForm({ ...createForm, attach_brochure: e.target.checked })}
                  className="w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500"
                />
                <label htmlFor="attach-brochure" className="text-sm text-slate-700">Attach brochure to initial messages</label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              icon={Plus}
              onClick={() => createMutation.mutate(createForm)}
              disabled={!createForm.product_id || createMutation.isPending}
              className="bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 text-white"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Campaign Details Modal */}
      <Modal
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setActiveCampaign(null);
        }}
        title="Campaign Details"
        size="lg"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : activeCampaign ? (
          <div className="space-y-6">
            {/* Campaign Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white">
                  <Megaphone className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{activeCampaign.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(activeCampaign.status)}
                    <span className="text-sm text-gray-500">{activeCampaign.type || 'EMAIL'}</span>
                  </div>
                </div>
              </div>
              {activeCampaign.status !== 'COMPLETED' && (
                <Button
                  icon={Play}
                  size="sm"
                  onClick={() => startMutation.mutate(activeCampaign.id)}
                  disabled={startMutation.isPending}
                >
                  {startMutation.isPending ? 'Starting...' : 'Start Now'}
                </Button>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Building2 className="w-4 h-4" />
                  Companies
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {getCampaignCompanies(activeCampaign)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <MessageSquare className="w-4 h-4" />
                  Messages
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {getMessageStats(activeCampaign).total}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-emerald-600 text-sm mb-1">
                  <CheckCircle className="w-4 h-4" />
                  Sent
                </div>
                <p className="text-2xl font-bold text-emerald-600">
                  {getMessageStats(activeCampaign).sent}
                </p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-600 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  Pending
                </div>
                <p className="text-2xl font-bold text-amber-600">
                  {getMessageStats(activeCampaign).pending}
                </p>
              </div>
            </div>

            {/* Campaign Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Campaign Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Product:</span>
                  <span className="ml-2 font-medium">{activeCampaign.product?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-2 font-medium">
                    {activeCampaign.created_at ? new Date(activeCampaign.created_at).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Type:</span>
                  <span className="ml-2 font-medium">{activeCampaign.type || 'EMAIL'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className="ml-2 font-medium">{activeCampaign.status || 'Draft'}</span>
                </div>
              </div>
            </div>

            {/* Messages List */}
            {activeCampaign.messages && activeCampaign.messages.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Recent Messages ({activeCampaign.messages.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activeCampaign.messages.slice(0, 10).map((msg) => (
                    <div
                      key={msg.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          msg.type === 'EMAIL' ? 'bg-indigo-100' : 'bg-emerald-100'
                        }`}>
                          {msg.type === 'EMAIL' ? (
                            <Mail className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <MessageSquare className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {msg.company?.name || 'Unknown Company'}
                          </p>
                          <p className="text-xs text-gray-500">{msg.stage}</p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          ['SENT', 'DELIVERED', 'READ'].includes(msg.status)
                            ? 'success'
                            : msg.status === 'FAILED'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {msg.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Campaign not found</p>
        )}
      </Modal>
    </div>
  );
}
