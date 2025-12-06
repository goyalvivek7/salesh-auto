import { useState, useEffect, useCallback } from 'react';
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
  Zap,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import {
  getMessages,
  sendMessage,
  deleteMessages,
  retryMessages,
  exportMessages,
} from '../services/api';

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    stage: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [viewMessage, setViewMessage] = useState(null);
  const [sendingId, setSendingId] = useState(null);

  const loadMessages = useCallback(async (page = 1, search = '') => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: 20,
        search,
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.stage !== 'all' && { stage: filters.stage }),
      };
      const res = await getMessages(params);
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
  }, [filters]);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleSend = async (messageId) => {
    try {
      setSendingId(messageId);
      await sendMessage(messageId);
      loadMessages(pagination.page);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert(error.response?.data?.detail || 'Failed to send message');
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async () => {
    if (selectedRows.length === 0) return;
    if (!confirm(`Delete ${selectedRows.length} messages?`)) return;

    try {
      await deleteMessages(selectedRows);
      setSelectedRows([]);
      loadMessages(pagination.page);
    } catch (error) {
      console.error('Failed to delete messages:', error);
    }
  };

  const handleRetry = async () => {
    const failedIds = selectedRows.filter((id) =>
      messages.find((m) => m.id === id && m.status === 'FAILED')
    );
    if (failedIds.length === 0) {
      alert('No failed messages selected');
      return;
    }

    try {
      await retryMessages(failedIds);
      setSelectedRows([]);
      loadMessages(pagination.page);
    } catch (error) {
      console.error('Failed to retry messages:', error);
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportMessages();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'messages.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      DRAFT: { variant: 'default', icon: Clock },
      SENT: { variant: 'success', icon: CheckCircle2 },
      DELIVERED: { variant: 'success', icon: CheckCircle2 },
      READ: { variant: 'primary', icon: Eye },
      FAILED: { variant: 'danger', icon: XCircle },
      CANCELLED: { variant: 'warning', icon: XCircle },
      SKIPPED: { variant: 'warning', icon: XCircle },
    };
    const config = variants[status] || variants.DRAFT;
    return (
      <Badge variant={config.variant}>
        <config.icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getTypeBadge = (type) => {
    if (type === 'EMAIL') {
      return (
        <Badge variant="primary">
          <Mail className="w-3 h-3 mr-1" />
          Email
        </Badge>
      );
    }
    return (
      <Badge variant="success">
        <MessageSquare className="w-3 h-3 mr-1" />
        WhatsApp
      </Badge>
    );
  };

  // Stats calculations
  const totalMessages = messages.length;
  const draftCount = messages.filter((m) => m.status === 'DRAFT').length;
  const sentCount = messages.filter((m) => m.status === 'SENT' || m.status === 'DELIVERED').length;
  const failedCount = messages.filter((m) => m.status === 'FAILED').length;
  const emailCount = messages.filter((m) => m.type === 'EMAIL').length;
  const whatsappCount = messages.filter((m) => m.type === 'WHATSAPP').length;

  // Filter messages by date (client-side)
  const filteredMessages = messages.filter((m) => {
    if (filters.dateFrom && m.created_at) {
      const createdDate = new Date(m.created_at).setHours(0, 0, 0, 0);
      const fromDate = new Date(filters.dateFrom).setHours(0, 0, 0, 0);
      if (createdDate < fromDate) return false;
    }
    if (filters.dateTo && m.created_at) {
      const createdDate = new Date(m.created_at).setHours(0, 0, 0, 0);
      const toDate = new Date(filters.dateTo).setHours(23, 59, 59, 999);
      if (createdDate > toDate) return false;
    }
    return true;
  });

  const columns = [
    {
      key: 'company_name',
      label: 'Company',
      render: (value) => (
        <span className="font-medium text-gray-900">{value}</span>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (value) => getTypeBadge(value),
    },
    {
      key: 'stage',
      label: 'Stage',
      render: (value) => (
        <span className="text-sm text-gray-600">{value?.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (value, row) => (
        <p className="text-sm text-gray-700 truncate max-w-xs">
          {value || row.content?.substring(0, 50) + '...'}
        </p>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => getStatusBadge(value),
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <div className="flex gap-1">
          <button
            onClick={() => setViewMessage(row)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
          >
            <Eye className="w-4 h-4" />
          </button>
          {row.status === 'DRAFT' && row.type === 'EMAIL' && (
            <button
              onClick={() => handleSend(row.id)}
              disabled={sendingId === row.id}
              className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-indigo-50 px-6 py-5 lg:px-8 lg:py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            Messages
          </p>
          <h1 className="mt-1 text-2xl lg:text-3xl font-semibold text-slate-900">
            Outreach messages across campaigns
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            All outreach messages across campaigns. Track email and WhatsApp delivery status.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Total: {pagination.total?.toLocaleString() || 0} messages · {emailCount} emails · {whatsappCount} WhatsApp
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Messages</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{pagination.total?.toLocaleString() || 0}</p>
            <p className="mt-1 text-[11px] text-slate-400">All types and statuses</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sent</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600">{sentCount}</p>
            <p className="mt-1 text-[11px] text-slate-400">Successfully delivered</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">{draftCount}</p>
            <p className="mt-1 text-[11px] text-slate-400">Scheduled or draft</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white shadow-md shadow-amber-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Failed</p>
            <p className="mt-1 text-2xl font-semibold text-red-600">{failedCount}</p>
            <p className="mt-1 text-[11px] text-slate-400">Delivery errors</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-rose-400 flex items-center justify-center text-white shadow-md shadow-red-100">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-indigo-50 p-5 lg:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Filters</p>
            <p className="text-xs text-slate-500 mt-0.5">Filter messages by type, status, stage, or date.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFilters({ type: 'all', status: 'all', stage: 'all', dateFrom: '', dateTo: '' });
              setSearchTerm('');
              loadMessages(1, '');
            }}
            className="self-start text-xs font-medium text-indigo-700 hover:text-indigo-800"
          >
            Reset filters
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                handleSearch(e.target.value);
                loadMessages(1, e.target.value);
              }}
              placeholder="Company, subject..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="EMAIL">Email</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="DELIVERED">Delivered</option>
              <option value="READ">Read</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Stage</label>
            <select
              value={filters.stage}
              onChange={(e) => setFilters((prev) => ({ ...prev, stage: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Stages</option>
              <option value="INITIAL">Initial</option>
              <option value="FOLLOWUP_1">Follow-up 1</option>
              <option value="FOLLOWUP_2">Follow-up 2</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Created From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Created To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="md:col-span-4 flex items-end justify-end gap-2">
            <Button variant="outline" size="sm" icon={Download} onClick={handleExport}>
              Export
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={() => loadMessages(pagination.page, searchTerm)}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredMessages}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => loadMessages(page, searchTerm)}
        searchPlaceholder="Search messages..."
        selectedRows={selectedRows}
        onSelectRow={(id) =>
          setSelectedRows((prev) =>
            prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
          )
        }
        onSelectAll={(checked) =>
          setSelectedRows(checked ? filteredMessages.map((m) => m.id) : [])
        }
        emptyMessage="No messages found. Messages will appear here when you create campaigns."
        actions={
          selectedRows.length > 0 && (
            <div className="flex justify-end gap-2">
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={handleDelete}
              >
                Delete ({selectedRows.length})
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                onClick={handleRetry}
              >
                Retry Failed
              </Button>
            </div>
          )
        }
        showSearch={false}
      />

      {/* View Message Modal */}
      <Modal
        isOpen={!!viewMessage}
        onClose={() => setViewMessage(null)}
        title="Message Details"
        size="lg"
      >
        {viewMessage && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {getTypeBadge(viewMessage.type)}
              {getStatusBadge(viewMessage.status)}
              <Badge variant="default">{viewMessage.stage?.replace('_', ' ')}</Badge>
            </div>

            <div className="bg-gradient-to-r from-slate-50 to-indigo-50/50 rounded-2xl p-4 border border-slate-100">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Company</label>
                  <p className="font-semibold text-slate-900 mt-1">{viewMessage.company_name}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Created</label>
                  <p className="font-medium text-slate-700 mt-1">
                    {new Date(viewMessage.created_at).toLocaleString()}
                  </p>
                </div>
                {viewMessage.sent_at && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase">Sent</label>
                    <p className="font-medium text-emerald-600 mt-1">
                      {new Date(viewMessage.sent_at).toLocaleString()}
                    </p>
                  </div>
                )}
                {viewMessage.scheduled_for && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase">Scheduled For</label>
                    <p className="font-medium text-amber-600 mt-1">
                      {new Date(viewMessage.scheduled_for).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {viewMessage.subject && (
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">Subject</label>
                <p className="text-slate-900 font-medium mt-1 text-lg">{viewMessage.subject}</p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Content</label>
              <div className="mt-2 p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                {viewMessage.content}
              </div>
            </div>

            {viewMessage.status === 'DRAFT' && viewMessage.type === 'EMAIL' && (
              <div className="flex justify-end pt-2">
                <Button
                  icon={Send}
                  onClick={() => {
                    handleSend(viewMessage.id);
                    setViewMessage(null);
                  }}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500"
                >
                  Send Now
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
