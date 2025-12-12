import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Zap,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Settings,
  Clock,
  Mail,
  MessageSquare,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Package,
  Edit2,
} from 'lucide-react';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { getProducts } from '../services/api';
import api from '../services/api';

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'E-commerce',
  'Manufacturing',
  'Real Estate',
  'Education',
  'Hospitality',
  'Retail',
  'Logistics',
  'Consulting',
  'Marketing',
  'Legal',
  'Construction',
  'Food & Beverage',
];

const COUNTRIES = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Singapore',
  'UAE',
  'Japan',
];

const STATUS_CONFIG = {
  draft: { color: 'bg-gray-100 text-gray-700', icon: Settings, label: 'Draft' },
  scheduled: { color: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Scheduled' },
  running: { color: 'bg-emerald-100 text-emerald-700', icon: Play, label: 'Running' },
  paused: { color: 'bg-amber-100 text-amber-700', icon: Pause, label: 'Paused' },
  completed: { color: 'bg-violet-100 text-violet-700', icon: CheckCircle2, label: 'Completed' },
};

export default function ProductAutomation() {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    product_id: '',
    target_industries: [],
    target_countries: [],
    companies_per_run: 10,
    message_type: 'EMAIL',
    schedule_type: 'manual',
    schedule_time: '',
    is_active: true,
  });

  // Fetch products for dropdown
  const { data: productsData } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => getProducts({ page: 1, page_size: 100 }),
  });

  const products = productsData?.data?.items || [];
  const getProductMatch = (productId) =>
    products.find((p) => String(p.id) === String(productId));

  const getProductName = (automation) =>
    automation.product?.name || getProductMatch(automation.product_id)?.name || 'Not assigned';

  // Load automations
  const loadAutomations = async () => {
    try {
      setLoading(true);
      // Fetch product automations (singular endpoint + product filter)
      const res = await api.get('/automation/config', { params: { type: 'product', has_product: true } });
      const items = (res.data || []).map((a) => {
        if (a.product?.name) return a;
        const match = getProductMatch(a.product_id);
        return match ? { ...a, product: match } : a;
      });
      setAutomations(items);
    } catch (error) {
      console.error('Failed to load product automations:', error);
      setAutomations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAutomations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length]);



  const handleCreate = async () => {
    try {
      const productId = formData.product_id ? Number(formData.product_id) : null;
      if (!productId) {
        alert('Please select a product.');
        return;
      }
      // Derive backend-expected fields (match service automation schema) plus product context
      const [hourStr = '10', minuteStr = '0'] = (formData.schedule_time || '10:00').split(':');
      const payload = {
        name: formData.name,
        product_id: productId,
        // Send all selected industries/countries as comma-separated strings
        industries: formData.target_industries.join(',') || 'General',
        countries: formData.target_countries.join(',') || 'United States',
        daily_limit: Number(formData.companies_per_run) || 10,
        send_time_hour: Number(hourStr) || 10,
        send_time_minute: Number(minuteStr) || 0,
        followup_day_1: 3,
        followup_day_2: 7,
        run_duration_days: 7,
        message_type: formData.message_type || 'EMAIL',
        schedule_type: formData.schedule_type || 'manual',
        type: 'product',
        has_product: true,
      };
      await api.post('/automation/config', payload);
      // Optimistically update list with product name filled
      const match = getProductMatch(productId);
      setAutomations((prev) => [
        ...(prev || []),
        {
          ...payload,
          id: Date.now(), // temporary until reload
          status: 'draft',
          product: match,
        },
      ]);
      setShowCreateModal(false);
      resetForm();
      loadAutomations();
    } catch (error) {
      console.error('Failed to create automation:', error);
      const detail = error.response?.data?.detail || error.message || 'Unknown error';
      alert(`Failed to create automation: ${typeof detail === 'object' ? JSON.stringify(detail) : detail}`);
    }
  };

  const handleUpdate = async () => {
    if (!editingAutomation) return;
    try {
      const productId = formData.product_id ? Number(formData.product_id) : null;
      if (!productId) {
        alert('Please select a product.');
        return;
      }
      const [hourStr = '10', minuteStr = '0'] = (formData.schedule_time || '10:00').split(':');
      const payload = {
        name: formData.name,
        product_id: productId,
        // Send all selected industries/countries as comma-separated strings
        industries: formData.target_industries.join(',') || 'General',
        countries: formData.target_countries.join(',') || 'United States',
        daily_limit: Number(formData.companies_per_run) || 10,
        send_time_hour: Number(hourStr) || 10,
        send_time_minute: Number(minuteStr) || 0,
        followup_day_1: 3,
        followup_day_2: 7,
        run_duration_days: 7,
        message_type: formData.message_type || 'EMAIL',
        schedule_type: formData.schedule_type || 'manual',
        type: 'product',
        has_product: true,
      };
      await api.put(`/automation/config/${editingAutomation.id}`, payload);
      const match = getProductMatch(productId);
      setAutomations((prev) =>
        (prev || []).map((a) =>
          a.id === editingAutomation.id ? { ...a, ...payload, product: match } : a
        )
      );
      setShowCreateModal(false);
      setEditingAutomation(null);
      resetForm();
      loadAutomations();
    } catch (error) {
      console.error('Failed to update automation:', error);
      const detail = error.response?.data?.detail || error.message || 'Unknown error';
      alert(`Failed to update automation: ${typeof detail === 'object' ? JSON.stringify(detail) : detail}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this automation?')) return;
    try {
      await api.delete(`/automation/config/${id}`);
      loadAutomations();
    } catch (error) {
      console.error('Failed to delete automation:', error);
      alert('Failed to delete automation');
    }
  };

  const handleStart = async (id) => {
    try {
      setActionLoading(id);
      await api.post(`/automation/${id}/start`, { type: 'product' });
      loadAutomations();
    } catch (error) {
      console.error('Failed to start automation:', error);
      alert('Failed to start automation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async (id) => {
    try {
      setActionLoading(id);
      await api.post(`/automation/${id}/stop`, { type: 'product' });
      loadAutomations();
    } catch (error) {
      console.error('Failed to stop automation:', error);
      alert('Failed to stop automation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRunNow = async (id) => {
    if (!confirm('This will immediately fetch companies and create a product campaign. Continue?')) {
      return;
    }
    try {
      setActionLoading(id);
      await api.post(`/automation/${id}/run-now`, { type: 'product' });
      alert('Automation triggered! Companies are being fetched for this product...');
      loadAutomations();
    } catch (error) {
      console.error('Failed to run automation:', error);
      alert('Failed to run automation: ' + (error.response?.data?.detail || error.message));
    } finally {
      setActionLoading(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      product_id: '',
      target_industries: [],
      target_countries: [],
      companies_per_run: 10,
      message_type: 'EMAIL',
      schedule_type: 'manual',
      schedule_time: '',
      is_active: true,
    });
  };

  const openEditModal = (automation) => {
    setEditingAutomation(automation);
    setFormData({
      name: automation.name || '',
      product_id: automation.product_id || '',
      target_industries: automation.target_industries || [],
      target_countries: automation.target_countries || [],
      companies_per_run: automation.companies_per_run || 10,
      message_type: automation.message_type || 'EMAIL',
      schedule_type: automation.schedule_type || 'manual',
      schedule_time: automation.schedule_time || '',
      is_active: automation.is_active ?? true,
    });
    setShowCreateModal(true);
  };

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  // Stats from automations
  const totalAutomations = automations.length;
  const activeAutomations = automations.filter((a) => a.status === 'running').length;
  const pausedAutomations = automations.filter((a) => a.status === 'paused').length;

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-purple-50 px-6 py-5 lg:px-8 lg:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">PRODUCTS · AUTOMATION</p>
              <h1 className="text-xl font-semibold text-slate-900">Product Automation</h1>
              <p className="text-sm text-slate-500">
                Automate outreach campaigns for your products
              </p>
            </div>
          </div>
          <Button icon={Plus} onClick={() => { resetForm(); setShowCreateModal(true); }}>
            Create Automation
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Total Automations</p>
              <p className="text-xl font-bold text-slate-900">{totalAutomations}</p>
              <p className="text-[11px] text-slate-400">Product campaigns</p>
            </div>
            <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
              <Zap className="w-4 h-4 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Active</p>
              <p className="text-xl font-bold text-emerald-600">{activeAutomations}</p>
              <p className="text-[11px] text-slate-400">Currently running</p>
            </div>
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Play className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Paused</p>
              <p className="text-xl font-bold text-amber-600">{pausedAutomations}</p>
              <p className="text-[11px] text-slate-400">Temporarily stopped</p>
            </div>
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <Pause className="w-4 h-4 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Products</p>
              <p className="text-xl font-bold text-indigo-600">{products.length}</p>
              <p className="text-[11px] text-slate-400">Available for automation</p>
            </div>
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Package className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Automations List */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/70 shadow-sm shadow-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-purple-600 uppercase">AUTOMATIONS</p>
            <p className="text-xs text-slate-500">Manage your product automation workflows</p>
          </div>
          <button
            onClick={loadAutomations}
            className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : automations.length === 0 ? (
          <div className="text-center py-12">
            <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No product automations yet</p>
            <p className="text-sm text-slate-400 mt-1">Create an automation to start automated outreach for your products</p>
            <Button className="mt-4" icon={Plus} onClick={() => { resetForm(); setShowCreateModal(true); }}>
              Create Your First Automation
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {automations.map((automation) => (
              <div
                key={automation.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
              >
                {/* Automation Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{automation.name}</h3>
                      <p className="text-xs text-slate-500">
                        {getProductName(automation)}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(automation.status)}
                </div>

                {/* Automation Details */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Message Type</span>
                    <Badge variant={automation.message_type === 'EMAIL' ? 'info' : 'success'}>
                      {automation.message_type === 'EMAIL' ? (
                        <Mail className="w-3 h-3 mr-1" />
                      ) : (
                        <MessageSquare className="w-3 h-3 mr-1" />
                      )}
                      {automation.message_type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Companies/Run</span>
                    <span className="font-medium text-slate-700">{automation.companies_per_run || 10}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Schedule</span>
                    <span className="font-medium text-slate-700 capitalize">{automation.schedule_type || 'Manual'}</span>
                  </div>
                </div>

                {/* Industries & Countries */}
                {automation.target_industries?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-1">Industries</p>
                    <div className="flex flex-wrap gap-1">
                      {automation.target_industries.slice(0, 3).map((ind) => (
                        <span key={ind} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                          {ind}
                        </span>
                      ))}
                      {automation.target_industries.length > 3 && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded">
                          +{automation.target_industries.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  {automation.status === 'running' ? (
                    <button
                      onClick={() => handleStop(automation.id)}
                      disabled={actionLoading === automation.id}
                      className="flex-1 px-3 py-2 bg-amber-50 text-amber-600 rounded-lg text-sm font-medium hover:bg-amber-100 flex items-center justify-center gap-1"
                    >
                      {actionLoading === automation.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Pause className="w-4 h-4" />
                      )}
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStart(automation.id)}
                      disabled={actionLoading === automation.id}
                      className="flex-1 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-100 flex items-center justify-center gap-1"
                    >
                      {actionLoading === automation.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      Start
                    </button>
                  )}
                  <button
                    onClick={() => handleRunNow(automation.id)}
                    disabled={actionLoading === automation.id}
                    className="px-3 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100"
                    title="Run Now"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(automation)}
                    className="px-3 py-2 bg-slate-50 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-100"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(automation.id)}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingAutomation(null);
          resetForm();
        }}
        title={editingAutomation ? 'Edit Product Automation' : 'Create Product Automation'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Automation Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., SaaS Product Outreach"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-white"
            >
              <option value="">Select a product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message Type</label>
              <select
                value={formData.message_type}
                onChange={(e) => setFormData({ ...formData, message_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-white"
              >
                <option value="EMAIL">Email</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="BOTH">Both</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Companies per Run</label>
              <input
                type="number"
                value={formData.companies_per_run}
                onChange={(e) => setFormData({ ...formData, companies_per_run: parseInt(e.target.value) || 10 })}
                min={1}
                max={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Industries</label>
            <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg max-h-32 overflow-y-auto">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind}
                  type="button"
                  onClick={() => {
                    const industries = formData.target_industries.includes(ind)
                      ? formData.target_industries.filter((i) => i !== ind)
                      : [...formData.target_industries, ind];
                    setFormData({ ...formData, target_industries: industries });
                  }}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${formData.target_industries.includes(ind)
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                    }`}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Countries</label>
            <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg max-h-32 overflow-y-auto">
              {COUNTRIES.map((country) => (
                <button
                  key={country}
                  type="button"
                  onClick={() => {
                    const countries = formData.target_countries.includes(country)
                      ? formData.target_countries.filter((c) => c !== country)
                      : [...formData.target_countries, country];
                    setFormData({ ...formData, target_countries: countries });
                  }}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${formData.target_countries.includes(country)
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                    }`}
                >
                  {country}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Type</label>
              <select
                value={formData.schedule_type}
                onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-white"
              >
                <option value="manual">Manual</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            {formData.schedule_type !== 'manual' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Time</label>
                <input
                  type="time"
                  value={formData.schedule_time}
                  onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                setEditingAutomation(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              icon={editingAutomation ? CheckCircle2 : Plus}
              onClick={editingAutomation ? handleUpdate : handleCreate}
              disabled={!formData.name || !formData.product_id}
            >
              {editingAutomation ? 'Save Changes' : 'Create Automation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
