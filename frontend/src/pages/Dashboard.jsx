import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  MessageSquare,
  Users,
  Send,
  Eye,
  Reply,
  Loader2,
  ArrowRight,
  Zap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { getAutomationStats, getChartData } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, chartRes] = await Promise.all([
        getAutomationStats(),
        getChartData(),
      ]);
      setStats(statsRes.data);
      setChartData(chartRes.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Companies',
      value: stats?.total_companies || 0,
      icon: Building2,
      gradient: 'from-blue-500 to-cyan-400',
      link: '/companies',
    },
    {
      title: 'Messages Sent',
      value: stats?.messages_sent || 0,
      icon: Send,
      gradient: 'from-violet-500 to-purple-400',
      link: '/messages',
    },
    {
      title: 'Email Opens',
      value: stats?.email_opens || 0,
      icon: Eye,
      gradient: 'from-amber-500 to-orange-400',
      link: '/opened',
    },
    {
      title: 'Total Replies',
      value: stats?.total_replies || 0,
      icon: Reply,
      gradient: 'from-emerald-500 to-teal-400',
      link: '/leads',
    },
    {
      title: 'Qualified Leads',
      value: stats?.total_qualified_leads || 0,
      icon: Users,
      gradient: 'from-rose-500 to-pink-400',
      link: '/leads',
    },
    {
      title: 'Campaigns',
      value: stats?.total_campaigns || 0,
      icon: Zap,
      gradient: 'from-indigo-500 to-blue-400',
      link: '/campaigns',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero / Header */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-indigo-50 px-6 py-5 lg:px-8 lg:py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide">Dashboard</p>
          <h1 className="mt-1 text-2xl lg:text-3xl font-semibold text-slate-900">
            Sales automation overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Snapshot of AI discovery, outreach volume, and replies from your leads.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Last updated {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} · data refreshes when you open this page
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Link
            to="/companies"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-400 text-white text-sm font-semibold shadow-lg shadow-sky-200 hover:shadow-xl hover:brightness-105 transition-all"
          >
            <Zap className="w-4 h-4" />
            Fetch New Companies
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl shadow-sm shadow-indigo-50 p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Outreach snapshot</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              High-level view of companies, messages, opens and replies.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 border border-sky-100">
            Live overview
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((card) => (
            <Link
              key={card.title}
              to={card.link}
              className="group bg-white/80 border border-slate-100 rounded-2xl px-4 py-4 flex items-center justify-between hover:border-sky-200 hover:shadow-md hover:shadow-sky-50 transition-all"
            >
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.title}</p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">
                  {card.value.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-400 group-hover:text-sky-600 flex items-center gap-1">
                  View details
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-md shadow-sky-100`}
              >
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/70 shadow-sm shadow-indigo-50 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Weekly Activity</h3>
          <p className="text-xs text-slate-500 mb-4">Sent vs replies for the last 7 days.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="repliesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#sentGradient)"
                  name="Sent"
                />
                <Area
                  type="monotone"
                  dataKey="replies"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#repliesGradient)"
                  name="Replies"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/70 shadow-sm shadow-indigo-50 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Daily Performance</h3>
          <p className="text-xs text-slate-500 mb-4">Daily sends and engagement.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar
                  dataKey="sent"
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  name="Sent"
                />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 rounded-3xl p-8 text-white shadow-md shadow-sky-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">Ready to grow your pipeline?</h3>
            <p className="text-white/80 mt-1 text-sm">
              Fetch new companies, create campaigns, and start outreach today.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/companies"
              className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Find Companies
            </Link>
            <Link
              to="/campaigns"
              className="px-6 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-colors"
            >
              Create Campaign
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
