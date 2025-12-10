import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Users,
  Mail,
  Eye,
  MessageSquare,
  Target,
  UserX,
  Download,
  Package,
} from 'lucide-react';
import { getProductsAnalyticsOverview } from '../services/api';

export default function ProductAnalyticsOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['products-analytics-overview'],
    queryFn: getProductsAnalyticsOverview,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const summary = data?.data?.summary || {};
  const items = data?.data?.items || [];
  const funnel = summary.funnel || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Products Analytics</h1>
              <p className="text-slate-500">Combined performance across all products</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Companies</p>
              <p className="text-lg font-bold text-slate-900">{summary.companies_fetched || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Messages Sent</p>
              <p className="text-lg font-bold text-slate-900">{summary.messages_sent || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Emails Opened</p>
              <p className="text-lg font-bold text-slate-900">{summary.emails_opened || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Replies</p>
              <p className="text-lg font-bold text-slate-900">{summary.replies_received || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Qualified Leads</p>
              <p className="text-lg font-bold text-slate-900">{(summary.hot_leads || 0) + (summary.warm_leads || 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <UserX className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Unsubscribes</p>
              <p className="text-lg font-bold text-slate-900">{summary.unsubscribes || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conversion & Funnel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/60">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Overall Conversion</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Conversion Rate</p>
              <p className="text-3xl font-bold text-green-600">{summary.conversion_rate || 0}%</p>
              <p className="text-xs text-slate-400 mt-1">Hot leads / Companies fetched</p>
            </div>
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/60">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Funnel (All Products)</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Fetched</span>
              <span className="font-semibold">{funnel.fetched || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Contacted</span>
              <span className="font-semibold">{funnel.contacted || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Opened</span>
              <span className="font-semibold">{funnel.opened || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Replied</span>
              <span className="font-semibold">{funnel.replied || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Qualified</span>
              <span className="font-semibold">{funnel.qualified || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Per Product Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/60">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Per Product Performance</h2>
          <span className="text-xs text-slate-400">{items.length} products</span>
        </div>
        {items.length === 0 ? (
          <div className="text-center py-10">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No product analytics available yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="text-left py-2 px-3">Product</th>
                  <th className="text-right py-2 px-3">Companies</th>
                  <th className="text-right py-2 px-3">Messages</th>
                  <th className="text-right py-2 px-3">Opened</th>
                  <th className="text-right py-2 px-3">Replies</th>
                  <th className="text-right py-2 px-3">Hot</th>
                  <th className="text-right py-2 px-3">Warm</th>
                  <th className="text-right py-2 px-3">Cold</th>
                  <th className="text-right py-2 px-3">Conv. %</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.product_id} className="border-b last:border-0">
                    <td className="py-2 px-3">
                      <div className="font-medium text-slate-900">{item.product_name}</div>
                    </td>
                    <td className="py-2 px-3 text-right">{item.companies_fetched}</td>
                    <td className="py-2 px-3 text-right">{item.messages_sent}</td>
                    <td className="py-2 px-3 text-right">{item.emails_opened}</td>
                    <td className="py-2 px-3 text-right">{item.replies_received}</td>
                    <td className="py-2 px-3 text-right text-red-600">{item.hot_leads}</td>
                    <td className="py-2 px-3 text-right text-orange-600">{item.warm_leads}</td>
                    <td className="py-2 px-3 text-right text-blue-600">{item.cold_leads}</td>
                    <td className="py-2 px-3 text-right font-semibold">{item.conversion_rate}</td>
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
