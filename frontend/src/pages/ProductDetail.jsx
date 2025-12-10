import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  ArrowLeft,
  Users,
  Megaphone,
  Target,
  FileText,
  Upload,
  Trash2,
  Download,
  Play,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Building2,
  Mail,
  Phone,
  Globe,
  Star,
  Calendar,
  Filter,
  FileEdit,
  Save,
  X,
} from 'lucide-react';
import {
  getProduct,
  getProductCompanies,
  getProductCampaigns,
  getProductAssets,
  getProductTemplates,
  createProductTemplate,
  fetchClientsForProduct,
  generateProductCampaign,
  uploadProductAsset,
  deleteProductAsset,
  startCampaignNow,
  getCompany,
  updateCompany,
} from '../services/api';
import { useToast } from '../components/Toast';
import CompanyDetailModal from '../components/CompanyDetailModal';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('companies');
  const [page, setPage] = useState(1);
  const [showFetchModal, setShowFetchModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [fetchForm, setFetchForm] = useState({ limit: 10, country: '' });
  const [campaignForm, setCampaignForm] = useState({
    campaign_name: '',
    limit: 10,
    attach_brochure: true,
  });

  // When navigating between different products, reset pagination so
  // the companies/campaigns lists and counts line up for each product.
  useEffect(() => {
    setPage(1);
  }, [id]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    template_type: 'email',
    stage: 'initial',
    name: '',
    subject: '',
    content: '',
  });

  // Local company detail modal state (for clicking companies in the product view)
  const [companyDetailOpen, setCompanyDetailOpen] = useState(false);
  const [companyDetailLoading, setCompanyDetailLoading] = useState(false);
  const [activeCompany, setActiveCompany] = useState(null);

  // Fetch product details
  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id),
  });

  // Fetch companies for this product
  const { data: companiesData, isLoading: companiesLoading } = useQuery({
    queryKey: ['product-companies', id, page],
    queryFn: () => getProductCompanies(id, { page, page_size: 10 }),
    enabled: activeTab === 'companies',
  });

  // Fetch campaigns for this product
  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: ['product-campaigns', id, page],
    queryFn: () => getProductCampaigns(id, { page, page_size: 10 }),
    enabled: activeTab === 'campaigns',
  });

  // Fetch assets
  const { data: assetsData } = useQuery({
    queryKey: ['product-assets', id],
    queryFn: () => getProductAssets(id),
    enabled: activeTab === 'assets',
  });

  // Fetch templates
  const { data: templatesData } = useQuery({
    queryKey: ['product-templates', id],
    queryFn: () => getProductTemplates(id),
    enabled: activeTab === 'templates',
  });

  // Fetch clients mutation
  const fetchClientsMutation = useMutation({
    mutationFn: (data) => fetchClientsForProduct(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['product', id]);
      queryClient.invalidateQueries(['product-companies', id]);
      showToast(`Fetched ${response.data.companies_fetched} companies`, 'success');
      setShowFetchModal(false);
    },
    onError: (error) => {
      showToast(error.response?.data?.detail || 'Failed to fetch clients', 'error');
    },
  });

  // Generate campaign mutation
  const generateCampaignMutation = useMutation({
    mutationFn: (data) => generateProductCampaign(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['product', id]);
      queryClient.invalidateQueries(['product-campaigns', id]);
      showToast('Campaign generated successfully', 'success');
      setShowCampaignModal(false);
    },
    onError: (error) => {
      showToast(error.response?.data?.detail || 'Failed to generate campaign', 'error');
    },
  });

  // Upload asset mutation
  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('asset_type', 'brochure');
      formData.append('is_primary', 'true');
      return uploadProductAsset(id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['product-assets', id]);
      queryClient.invalidateQueries(['product', id]);
      showToast('Asset uploaded successfully', 'success');
    },
    onError: (error) => {
      showToast(error.response?.data?.detail || 'Failed to upload asset', 'error');
    },
  });

  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: (assetId) => deleteProductAsset(id, assetId),
    onSuccess: () => {
      queryClient.invalidateQueries(['product-assets', id]);
      queryClient.invalidateQueries(['product', id]);
      showToast('Asset deleted successfully', 'success');
    },
  });

  // Start campaign mutation
  const startCampaignMutation = useMutation({
    mutationFn: startCampaignNow,
    onSuccess: () => {
      queryClient.invalidateQueries(['product-campaigns', id]);
      showToast('Campaign started successfully', 'success');
    },
    onError: (error) => {
      showToast(error.response?.data?.detail || 'Failed to start campaign', 'error');
    },
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: (data) => createProductTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['product-templates', id]);
      showToast('Template saved successfully', 'success');
      setShowTemplateModal(false);
      setTemplateForm({ template_type: 'email', stage: 'initial', name: '', subject: '', content: '' });
    },
    onError: (error) => {
      showToast(error.response?.data?.detail || 'Failed to save template', 'error');
    },
  });

  const openTemplateModal = (type, stage, existingTemplate = null) => {
    setEditingTemplate(existingTemplate);
    setTemplateForm({
      template_type: type,
      stage: stage,
      name: existingTemplate?.name || `${type === 'email' ? 'Email' : 'WhatsApp'} - ${stage.replace('_', ' ')}`,
      subject: existingTemplate?.subject || '',
      content: existingTemplate?.content || '',
    });
    setShowTemplateModal(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  // Open company detail modal from a company id
  const openCompanyModal = async (companyId) => {
    try {
      setCompanyDetailOpen(true);
      setCompanyDetailLoading(true);
      const res = await getCompany(companyId);
      setActiveCompany(res.data);
    } catch (error) {
      console.error('Failed to load company details:', error);
      showToast('Failed to load company details', 'error');
    } finally {
      setCompanyDetailLoading(false);
    }
  };

  if (productLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const product = productData?.data;
  const companies = companiesData?.data?.items || [];
  const campaigns = campaignsData?.data?.items || [];
  const assets = assetsData?.data || [];
  const templates = templatesData?.data || {};
  const totalPages = activeTab === 'companies'
    ? companiesData?.data?.total_pages || 1
    : campaignsData?.data?.total_pages || 1;

  // Keep counts in sync with what the tabs actually load
  const companiesTotal = companiesData?.data?.total ?? product?.companies_count ?? 0;
  const campaignsTotal = campaignsData?.data?.total ?? product?.campaigns_count ?? 0;

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Product not found</p>
        <button
          onClick={() => navigate('/products')}
          className="mt-4 text-indigo-600 hover:underline"
        >
          Back to Products
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/products')}
          className="p-2 hover:bg-slate-100 rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
              <p className="text-slate-500">{product.short_description || product.slug}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate(`/products/${id}/analytics`)}
          className="px-4 py-2 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-100"
        >
          View Analytics
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Companies</p>
              <p className="text-xl font-bold text-slate-900">{companiesTotal}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Campaigns</p>
              <p className="text-xl font-bold text-slate-900">{campaignsTotal}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Messages Sent</p>
              <p className="text-xl font-bold text-slate-900">{product.messages_sent || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Qualified Leads</p>
              <p className="text-xl font-bold text-slate-900">{product.qualified_leads_count || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowFetchModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-sky-500 text-white rounded-xl hover:shadow-lg"
        >
          <RefreshCw className="w-4 h-4" />
          Fetch Clients
        </button>
        <button
          onClick={() => setShowCampaignModal(true)}
          disabled={!companiesTotal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Megaphone className="w-4 h-4" />
          Generate Campaign
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".pdf,.png,.jpg,.jpeg,.pptx"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
        >
          <Upload className="w-4 h-4" />
          Upload Brochure
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 overflow-hidden">
        <div className="flex border-b">
          {['companies', 'campaigns', 'templates', 'assets'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setPage(1);
              }}
              className={`flex-1 px-4 py-3 text-sm font-medium capitalize ${
                activeTab === tab
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab === 'companies' && <Users className="w-4 h-4 inline mr-2" />}
              {tab === 'campaigns' && <Megaphone className="w-4 h-4 inline mr-2" />}
              {tab === 'templates' && <FileEdit className="w-4 h-4 inline mr-2" />}
              {tab === 'assets' && <FileText className="w-4 h-4 inline mr-2" />}
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Companies Tab */}
          {activeTab === 'companies' && (
            <div>
              {companiesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                </div>
              ) : companies.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No companies fetched yet</p>
                  <button
                    onClick={() => setShowFetchModal(true)}
                    className="mt-2 text-indigo-600 hover:underline"
                  >
                    Fetch clients now
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {companies.map((cp) => (
                    <div
                      key={cp.id}
                      onClick={() => openCompanyModal(cp.company_id)}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">
                            {cp.company?.name || 'Unknown Company'}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-slate-500">
                            {cp.company?.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {cp.company.email}
                              </span>
                            )}
                            {cp.company?.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {cp.company.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="font-medium">{cp.relevance_score?.toFixed(0) || 0}</span>
                          </div>
                          <p className="text-xs text-slate-400">Relevance</p>
                        </div>
                        {cp.company?.website && (
                          <a
                            href={cp.company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <Globe className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div>
              {campaignsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No campaigns yet</p>
                  <button
                    onClick={() => setShowCampaignModal(true)}
                    disabled={!product.companies_count}
                    className="mt-2 text-indigo-600 hover:underline disabled:opacity-50"
                  >
                    Generate a campaign
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      onClick={() => navigate(`/campaigns?id=${campaign.id}`)}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                          <Megaphone className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">{campaign.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {new Date(campaign.created_at).toLocaleDateString()}
                            <span className="text-slate-300">|</span>
                            <span>{campaign.messages?.length || 0} messages</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); startCampaignMutation.mutate(campaign.id); }}
                        disabled={startCampaignMutation.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                      >
                        <Play className="w-3 h-3" />
                        Start
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              {/* Email Templates */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Templates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {['initial', 'followup_1', 'followup_2'].map((stage) => {
                    const template = templates[`email_${stage}`];
                    return (
                      <div
                        key={`email_${stage}`}
                        onClick={() => openTemplateModal('email', stage, template)}
                        className="p-4 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-slate-700 capitalize">
                            {stage.replace('_', ' ')}
                          </span>
                          {template ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Set</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">Not set</span>
                          )}
                        </div>
                        {template ? (
                          <p className="text-sm text-slate-500 line-clamp-2">{template.subject || template.name}</p>
                        ) : (
                          <p className="text-sm text-slate-400">Click to add template</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              

              {/* Template Variables Help */}
              <div className="p-4 bg-indigo-50 rounded-xl">
                <h4 className="font-medium text-indigo-900 mb-2">Available Variables</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <code className="px-2 py-1 bg-white rounded text-indigo-600">{'{{company_name}}'}</code>
                  <code className="px-2 py-1 bg-white rounded text-indigo-600">{'{{industry}}'}</code>
                  <code className="px-2 py-1 bg-white rounded text-indigo-600">{'{{product_name}}'}</code>
                  <code className="px-2 py-1 bg-white rounded text-indigo-600">{'{{sender_name}}'}</code>
                  <code className="px-2 py-1 bg-white rounded text-indigo-600">{'{{brochure_link}}'}</code>
                </div>
              </div>
            </div>
          )}

          {/* Assets Tab */}
          {activeTab === 'assets' && (
            <div>
              {assets.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No assets uploaded</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-indigo-600 hover:underline"
                  >
                    Upload a brochure
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                          <FileText className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">
                            {asset.original_filename}
                            {asset.is_primary && (
                              <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-600 text-xs rounded-full">
                                Primary
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-slate-500">
                            {asset.mime_type} • {(asset.file_size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`/api/products/${id}/assets/${asset.id}/download`}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => {
                            if (confirm('Delete this asset?')) {
                              deleteAssetMutation.mutate(asset.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {(activeTab === 'companies' || activeTab === 'campaigns') && totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Company Detail Modal (for product companies) */}
      <CompanyDetailModal
        isOpen={companyDetailOpen}
        onClose={() => {
          setCompanyDetailOpen(false);
          setActiveCompany(null);
        }}
        company={activeCompany}
        loading={companyDetailLoading}
        onUpdated={(updated) => {
          setActiveCompany(updated);
          queryClient.invalidateQueries(['product-companies', id]);
          queryClient.invalidateQueries(['product', id]);
        }}
      />

      {/* Fetch Clients Modal */}
      {showFetchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Fetch Clients for {product.name}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Number of Companies
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={fetchForm.limit}
                  onChange={(e) => setFetchForm({ ...fetchForm, limit: parseInt(e.target.value) || 10 })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Country (optional)
                </label>
                <input
                  type="text"
                  value={fetchForm.country}
                  onChange={(e) => setFetchForm({ ...fetchForm, country: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  placeholder="e.g., India"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowFetchModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => fetchClientsMutation.mutate(fetchForm)}
                disabled={fetchClientsMutation.isPending}
                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-sky-500 text-white rounded-xl disabled:opacity-50"
              >
                {fetchClientsMutation.isPending ? 'Fetching...' : 'Fetch Clients'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Generate Campaign</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={campaignForm.campaign_name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, campaign_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Max Companies
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={campaignForm.limit}
                  onChange={(e) => setCampaignForm({ ...campaignForm, limit: parseInt(e.target.value) || 10 })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={campaignForm.attach_brochure}
                  onChange={(e) => setCampaignForm({ ...campaignForm, attach_brochure: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-slate-700">Attach brochure to initial messages</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCampaignModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => generateCampaignMutation.mutate(campaignForm)}
                disabled={generateCampaignMutation.isPending}
                className="px-6 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50"
              >
                {generateCampaignMutation.isPending ? 'Generating...' : 'Generate Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Edit Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h2>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Type
                  </label>
                  <input
                    type="text"
                    value={templateForm.template_type === 'email' ? 'Email' : 'WhatsApp'}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Stage
                  </label>
                  <input
                    type="text"
                    value={templateForm.stage.replace('_', ' ')}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 capitalize"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  placeholder="e.g., VMS Initial Outreach"
                />
              </div>

              {templateForm.template_type === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={templateForm.subject}
                    onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    placeholder="e.g., {{company_name}} - Modernize Your Visitor Management"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Message Content
                </label>
                <textarea
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                  rows={10}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-sm"
                  placeholder={templateForm.template_type === 'email' 
                    ? "Dear {{company_name}} Team,\n\nI'm reaching out because..."
                    : "Hi! I'm from True Value Infosoft..."}
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-600">
                <strong>Tip:</strong> Use variables like {'{{company_name}}'}, {'{{product_name}}'}, {'{{brochure_link}}'} to personalize messages.
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveTemplateMutation.mutate(templateForm)}
                  disabled={saveTemplateMutation.isPending || !templateForm.name || !templateForm.content}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-500 to-sky-500 text-white rounded-xl hover:shadow-lg disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saveTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
