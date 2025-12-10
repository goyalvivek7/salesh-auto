import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Package,
  Users,
  Mail,
  Eye,
  MessageSquare,
  Target,
  UserX,
  Download,
  TrendingUp,
  Flame,
  Thermometer,
  Snowflake,
} from 'lucide-react';
import { getProduct, getProductAnalytics, getProductLeads, getProducts } from '../services/api';

export default function ProductAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();

  const hasProductId = !!id;

  // When no specific product ID is provided (e.g. /products/analytics),
  // show a selector of products instead of an error state.
  const { data: productsListData, isLoading: productsListLoading } = useQuery({
    queryKey: ['products-for-analytics'],
    queryFn: () => getProducts({ page: 1, page_size: 100 }),
    enabled: !hasProductId,
  });

  // Fetch product details
  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id),
    enabled: hasProductId,
  });

  // Fetch analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['product-analytics', id],
    queryFn: () => getProductAnalytics(id),
    enabled: hasProductId,
  });

  // Fetch leads
  const { data: leadsData } = useQuery({
    queryKey: ['product-leads', id],
    queryFn: () => getProductLeads(id, { page: 1, page_size: 10 }),
    enabled: hasProductId,
  });

  // If no product ID: render selector view
  if (!hasProductId) {
    if (productsListLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      );
    }

    const products = productsListData?.data?.items || [];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/products')}
            className="p-2 hover:bg-slate-100 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Product Analytics</h1>
                <p className="text-slate-500">Select a product to view detailed analytics</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/60">
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No products found</p>
              <button
                onClick={() => navigate('/products')}
                className="mt-3 text-indigo-600 hover:underline text-sm"
              >
                Create a product first
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => navigate(`/products/${product.id}/analytics`)}
                  className="text-left bg-white/80 border border-slate-100 rounded-2xl p-4 hover:border-sky-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Package className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 line-clamp-1">{product.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1">{product.short_description || product.slug}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">Click to view analytics</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (productLoading || analyticsLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const product = productData?.data;
  const analytics = analyticsData?.data;
  const leads = leadsData?.data?.items || [];

  if (!product || !analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Product or analytics not found</p>
        <button
          onClick={() => navigate('/products')}
          className="mt-4 text-indigo-600 hover:underline"
        >
          Back to Products
        </button>
      </div>
    );
  }

  const funnel = analytics.funnel || {};
  
  // Calculate funnel percentages
  const funnelData = [
    { label: 'Companies Fetched', value: funnel.fetched || 0, color: 'bg-indigo-500' },
    { label: 'Contacted', value: funnel.contacted || 0, color: 'bg-sky-500' },
    { label: 'Emails Opened', value: funnel.opened || 0, color: 'bg-cyan-500' },
    { label: 'Replied', value: funnel.replied || 0, color: 'bg-green-500' },
    { label: 'Qualified Leads', value: funnel.qualified || 0, color: 'bg-amber-500' },
  ];

  const maxFunnelValue = Math.max(...funnelData.map(d => d.value), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/products/${id}`)}
          className="p-2 hover:bg-slate-100 rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{product.name} Analytics</h1>
              <p className="text-slate-500">Performance metrics and conversion funnel</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Companies</p>
              <p className="text-xl font-bold text-slate-900">{analytics.companies_fetched}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Messages Sent</p>
              <p className="text-xl font-bold text-slate-900">{analytics.messages_sent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Emails Opened</p>
              <p className="text-xl font-bold text-slate-900">{analytics.emails_opened}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Replies</p>
              <p className="text-xl font-bold text-slate-900">{analytics.replies_received}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Download className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Downloads</p>
              <p className="text-xl font-bold text-slate-900">{analytics.brochure_downloads}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Intent Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Intent Distribution */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/60">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Lead Intent Distribution</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Flame className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-700">Hot Leads</span>
                  <span className="text-lg font-bold text-red-500">{analytics.hot_leads}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, (analytics.hot_leads / Math.max(analytics.companies_fetched, 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Thermometer className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-700">Warm Leads</span>
                  <span className="text-lg font-bold text-orange-500">{analytics.warm_leads}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, (analytics.warm_leads / Math.max(analytics.companies_fetched, 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Snowflake className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-700">Cold Leads</span>
                  <span className="text-lg font-bold text-blue-500">{analytics.cold_leads}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, (analytics.cold_leads / Math.max(analytics.companies_fetched, 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <UserX className="w-6 h-6 text-slate-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-700">Unsubscribes</span>
                  <span className="text-lg font-bold text-slate-500">{analytics.unsubscribes}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-slate-400 h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, (analytics.unsubscribes / Math.max(analytics.companies_fetched, 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-green-700">{analytics.conversion_rate}%</p>
              </div>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Target className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-green-600 mt-2">
              Hot leads / Companies fetched
            </p>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/60">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Conversion Funnel</h2>
          <div className="space-y-3">
            {funnelData.map((item, index) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="font-semibold text-slate-900">{item.value}</span>
                </div>
                <div className="relative">
                  <div
                    className={`h-10 ${item.color} rounded-lg flex items-center justify-center transition-all`}
                    style={{
                      width: `${Math.max(10, (item.value / maxFunnelValue) * 100)}%`,
                    }}
                  >
                    {item.value > 0 && (
                      <span className="text-white text-sm font-medium">
                        {index > 0 && funnelData[0].value > 0
                          ? `${((item.value / funnelData[0].value) * 100).toFixed(0)}%`
                          : '100%'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Funnel Drop-off Analysis */}
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Drop-off Analysis</h3>
            <div className="space-y-2 text-sm">
              {funnelData.slice(0, -1).map((item, index) => {
                const nextItem = funnelData[index + 1];
                const dropoff = item.value > 0
                  ? ((item.value - nextItem.value) / item.value * 100).toFixed(1)
                  : 0;
                return (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-slate-500">
                      {item.label} → {nextItem.label}
                    </span>
                    <span className={`font-medium ${parseFloat(dropoff) > 50 ? 'text-red-500' : 'text-slate-600'}`}>
                      {dropoff}% drop
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Hot Leads */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/60">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Qualified Leads</h2>
        {leads.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No qualified leads yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Company</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Intent</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Confidence</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">
                        {lead.company?.name || 'Unknown'}
                      </div>
                      <div className="text-sm text-slate-500">
                        {lead.company?.email}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          lead.intent === 'HOT'
                            ? 'bg-red-100 text-red-700'
                            : lead.intent === 'WARM'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {lead.intent === 'HOT' && <Flame className="w-3 h-3" />}
                        {lead.intent === 'WARM' && <Thermometer className="w-3 h-3" />}
                        {lead.intent === 'COLD' && <Snowflake className="w-3 h-3" />}
                        {lead.intent}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-indigo-500 h-2 rounded-full"
                            style={{ width: `${lead.intent_confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-600">
                          {(lead.intent_confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-500">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
