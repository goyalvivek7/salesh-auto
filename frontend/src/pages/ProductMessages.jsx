import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Send,
  Trash2,
  RefreshCw,
  Download,
  Mail,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  Package,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getProducts } from '../services/api';
import api from '../services/api';

export default function ProductMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [selectedProduct, setSelectedProduct] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
  });
  const [viewMessage, setViewMessage] = useState(null);
  const [sendingId, setSendingId] = useState(null);

  // Fetch products for filter
  const { data: productsData } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => getProducts({ page: 1, page_size: 100 }),
  });

  const products = productsData?.data?.items || [];

  const loadMessages = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: 20,
        has_product: true,
        ...(selectedProduct && { product_id: selectedProduct }),
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.status !== 'all' && { status: filters.status }),
      };
      const res = await api.get('/messages', { params });
      setMessages(res.data.items || []);
      setPagination({
        page: res.data.page,
        pageSize: res.data.page_size,
        total: res.data.total,
        totalPages: res.data.total_pages,
      });
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProduct, filters]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleSend = async (messageId, messageType = 'EMAIL') => {
    try {
      setSendingId(messageId);
      if (messageType === 'WHATSAPP') {
        await api.post(`/messages/${messageId}/send-whatsapp`);
      } else {
        await api.post(`/messages/${messageId}/send`);
      }
      loadMessages(pagination.page);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert(error.response?.data?.detail || 'Failed to send message');
    } finally {
      setSendingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      DRAFT: { bg: 'bg-slate-100', text: 'text-slate-600', icon: Clock },
      SENT: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2 },
      DELIVERED: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2 },
      READ: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: Eye },
      FAILED: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    }[status] || { bg: 'bg-slate-100', text: 'text-slate-600', icon: Clock };
    
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    if (type === 'EMAIL') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-sky-100 text-sky-700">
          <Mail className="w-3 h-3" />
          Email
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-700">
        <MessageSquare className="w-3 h-3" />
        WhatsApp
      </span>
    );
  };

  // Stats
  const sentCount = messages.filter((m) => m.status === 'SENT' || m.status === 'DELIVERED').length;
  const draftCount = messages.filter((m) => m.status === 'DRAFT').length;
  const failedCount = messages.filter((m) => m.status === 'FAILED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-indigo-50 px-6 py-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide flex items-center gap-1">
              <Package className="w-3 h-3" />
              Product Messages
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Messages for Products
            </h1>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          All outreach messages for product campaigns. Total: {pagination.total} messages
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-xl font-bold text-slate-900">{pagination.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Sent</p>
              <p className="text-xl font-bold text-emerald-600">{sentCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Draft</p>
              <p className="text-xl font-bold text-amber-600">{draftCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Failed</p>
              <p className="text-xl font-bold text-red-600">{failedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Product</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none appearance-none bg-white"
              >
                <option value="">All Products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="all">All Types</option>
              <option value="EMAIL">Email</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <button
            onClick={() => loadMessages(1)}
            className="px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Messages Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No product messages found</p>
            <p className="text-sm text-slate-400 mt-1">Messages will appear here when you create product campaigns</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Company</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Product</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Subject</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {messages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-900">{msg.company_name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-slate-600">{msg.product_name || '-'}</span>
                    </td>
                    <td className="py-3 px-4">{getTypeBadge(msg.type)}</td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-slate-600 truncate max-w-xs">
                        {msg.subject || msg.content?.substring(0, 40) + '...'}
                      </p>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(msg.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setViewMessage(msg)}
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {msg.status === 'DRAFT' && (
                          <button
                            onClick={() => handleSend(msg.id, msg.type)}
                            disabled={sendingId === msg.id}
                            className="p-2 rounded-lg hover:bg-emerald-100 text-emerald-600"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadMessages(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => loadMessages(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Message Modal */}
      {viewMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Message Details</h2>
              <button onClick={() => setViewMessage(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                {getTypeBadge(viewMessage.type)}
                {getStatusBadge(viewMessage.status)}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Company</p>
                  <p className="font-medium text-slate-900">{viewMessage.company_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Product</p>
                  <p className="font-medium text-slate-900">{viewMessage.product_name || '-'}</p>
                </div>
              </div>
              {viewMessage.subject && (
                <div>
                  <p className="text-xs text-slate-500">Subject</p>
                  <p className="font-medium text-slate-900">{viewMessage.subject}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500">Content</p>
                <div className="mt-2 p-4 bg-slate-50 rounded-xl text-sm text-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {viewMessage.content}
                </div>
              </div>
              {viewMessage.status === 'DRAFT' && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      handleSend(viewMessage.id, viewMessage.type);
                      setViewMessage(null);
                    }}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
