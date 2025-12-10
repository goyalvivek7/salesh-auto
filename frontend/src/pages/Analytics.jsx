import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Mail,
  MessageSquare,
  Eye,
  Reply,
  BarChart3,
  Loader2,
  RefreshCw,
  Calendar,
  Send,
  Users,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { getServiceAnalytics, getDetailedAnalytics } from '../services/api';
import Button from '../components/Button';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      // Use both service analytics and detailed analytics
      const [serviceRes, detailedRes] = await Promise.all([
        getServiceAnalytics(),
        getDetailedAnalytics(days),
      ]);
      setData({ ...detailedRes.data, service: serviceRes.data });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
        <p className="text-sm text-slate-500">Loading analytics...</p>
      </div>
    );
  }

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const rateCards = [
    {
      title: 'Email Open Rate',
      value: `${data?.rates?.email_open_rate || 0}%`,
      icon: Eye,
      gradient: 'from-blue-500 to-cyan-400',
      shadow: 'shadow-blue-100',
    },
    {
      title: 'Email Reply Rate',
      value: `${data?.rates?.email_reply_rate || 0}%`,
      icon: Mail,
      gradient: 'from-violet-500 to-purple-400',
      shadow: 'shadow-violet-100',
    },
    {
      title: 'WhatsApp Reply Rate',
      value: `${data?.rates?.whatsapp_reply_rate || 0}%`,
      icon: MessageSquare,
      gradient: 'from-emerald-500 to-teal-400',
      shadow: 'shadow-emerald-100',
    },
    {
      title: 'Overall Reply Rate',
      value: `${data?.rates?.overall_reply_rate || 0}%`,
      icon: TrendingUp,
      gradient: 'from-rose-500 to-pink-400',
      shadow: 'shadow-rose-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      

      {/* Filters Card */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-rose-50 p-5 lg:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-600 via-pink-500 to-violet-500 bg-clip-text text-transparent">
            Analytics & Insights
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Detailed performance metrics for your outreach campaigns. Track opens, replies, and engagement.
          </p>
          
        </div>
      </div>
          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={loadAnalytics}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Sent</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {data?.summary?.total_sent?.toLocaleString() || 0}
            </p>
            <div className="flex gap-3 mt-2 text-[11px]">
              <span className="text-blue-600 flex items-center gap-1">
                <Mail className="w-3 h-3" /> {data?.summary?.email_sent || 0}
              </span>
              <span className="text-green-600 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> {data?.summary?.whatsapp_sent || 0}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <Send className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email Opens</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">
              {data?.summary?.email_opens?.toLocaleString() || 0}
            </p>
            <p className="mt-2 text-[11px] text-slate-400">
              {data?.summary?.unique_opens || 0} unique opens
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white shadow-md shadow-amber-100">
            <Eye className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm shadow-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Replies</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600">
              {data?.summary?.total_replies?.toLocaleString() || 0}
            </p>
            <div className="flex gap-3 mt-2 text-[11px]">
              <span className="text-blue-600 flex items-center gap-1">
                <Mail className="w-3 h-3" /> {data?.summary?.email_replies || 0}
              </span>
              <span className="text-green-600 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> {data?.summary?.whatsapp_replies || 0}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-100">
            <Reply className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-violet-500 rounded-2xl p-5 text-white shadow-lg shadow-rose-100">
          <p className="text-xs text-white/80 font-medium uppercase tracking-wide">Overall Reply Rate</p>
          <p className="text-3xl font-bold mt-1">
            {data?.rates?.overall_reply_rate || 0}%
          </p>
          <p className="text-xs text-white/60 mt-2">
            Last {days} days performance
          </p>
        </div>
      </div>

      {/* Rate Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {rateCards.map((card) => (
          <div
            key={card.title}
            className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.title}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
              </div>
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-md ${card.shadow}`}
              >
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">
            Daily Activity
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.daily_data || []}>
                <defs>
                  <linearGradient id="emailGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="waGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="email_sent"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#emailGrad)"
                  name="Emails Sent"
                />
                <Area
                  type="monotone"
                  dataKey="whatsapp_sent"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#waGrad)"
                  name="WhatsApp Sent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Opens & Replies */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">
            Opens & Replies
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.daily_data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="opens"
                  fill="#f59e0b"
                  radius={[6, 6, 0, 0]}
                  name="Opens"
                />
                <Bar
                  dataKey="replies"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  name="Replies"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Industry Breakdown */}
      {data?.industry_breakdown && data.industry_breakdown.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">
            Top Industries by Replies
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.industry_breakdown}
                    dataKey="replies"
                    nameKey="industry"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={40}
                    label={({ industry, percent }) =>
                      `${industry} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {data.industry_breakdown.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {data.industry_breakdown.map((item, index) => (
                <div
                  key={item.industry}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-lg shadow-sm"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium text-slate-900">
                      {item.industry}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{item.replies} replies</p>
                    <p className="text-xs text-slate-500">{item.companies} companies</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State for no data */}
      {(!data?.daily_data || data.daily_data.length === 0) && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/70 p-12 text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-rose-100 to-pink-100 rounded-2xl flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-rose-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No analytics data yet</h3>
          <p className="text-slate-500 mt-1">
            Analytics will appear here once you start sending campaigns
          </p>
        </div>
      )}
    </div>
  );
}
