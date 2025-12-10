import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Package,
  Briefcase,
  ChevronDown,
  X,
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
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, products, services
  const [redirectPopup, setRedirectPopup] = useState({ open: false, target: null, title: '' });

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

  // Handle card click - show popup to choose products or services
  const handleCardClick = (target, title) => {
    setRedirectPopup({ open: true, target, title });
  };

  // Navigate based on selection
  const handleRedirect = (type) => {
    const { target } = redirectPopup;
    let path = '';
    
    if (type === 'products') {
      switch (target) {
        case 'companies': path = '/products/companies'; break;
        case 'messages': path = '/messages'; break; // Messages shared but filtered
        case 'opened': path = '/products/opened'; break;
        case 'leads': path = '/products/leads'; break;
        case 'campaigns': path = '/products/campaigns'; break;
        default: path = '/products';
      }
    } else {
      switch (target) {
        case 'companies': path = '/services/companies'; break;
        case 'messages': path = '/messages'; break;
        case 'opened': path = '/services/opened'; break;
        case 'leads': path = '/services/leads'; break;
        case 'campaigns': path = '/services/campaigns'; break;
        default: path = '/services/automation';
      }
    }
    
    navigate(path);
    setRedirectPopup({ open: false, target: null, title: '' });
  };

  // Handle fetch companies button
  const handleFetchCompanies = () => {
    setRedirectPopup({ open: true, target: 'fetch', title: 'Fetch New Companies' });
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
      target: 'companies',
    },
    {
      title: 'Messages Sent',
      value: stats?.messages_sent || 0,
      icon: Send,
      gradient: 'from-violet-500 to-purple-400',
      target: 'messages',
    },
    {
      title: 'Email Opens',
      value: stats?.email_opens || 0,
      icon: Eye,
      gradient: 'from-amber-500 to-orange-400',
      target: 'opened',
    },
    {
      title: 'Total Replies',
      value: stats?.total_replies || 0,
      icon: Reply,
      gradient: 'from-emerald-500 to-teal-400',
      target: 'leads',
    },
    {
      title: 'Qualified Leads',
      value: stats?.total_qualified_leads || 0,
      icon: Users,
      gradient: 'from-rose-500 to-pink-400',
      target: 'leads',
    },
    {
      title: 'Campaigns',
      value: stats?.total_campaigns || 0,
      icon: Zap,
      gradient: 'from-indigo-500 to-blue-400',
      target: 'campaigns',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Redirect Popup Modal */}
      {redirectPopup.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {redirectPopup.title || 'Choose Section'}
              </h3>
              <button
                onClick={() => setRedirectPopup({ open: false, target: null, title: '' })}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-5">
                Where would you like to go?
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleRedirect('products')}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-indigo-100 hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                    <Package className="w-7 h-7 text-white" />
                  </div>
                  <span className="font-semibold text-slate-700 group-hover:text-indigo-600">Products</span>
                  <span className="text-xs text-slate-400">VMS, CDR, ACS, etc.</span>
                </button>
                <button
                  onClick={() => handleRedirect('services')}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-emerald-100 hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                    <Briefcase className="w-7 h-7 text-white" />
                  </div>
                  <span className="font-semibold text-slate-700 group-hover:text-emerald-600">Services</span>
                  <span className="text-xs text-slate-400">General outreach</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          {/* Filter Dropdown */}
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="appearance-none px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
            >
              <option value="all">All Data</option>
              <option value="products">Products Only</option>
              <option value="services">Services Only</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <button
            onClick={handleFetchCompanies}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-400 text-white text-sm font-semibold shadow-lg shadow-sky-200 hover:shadow-xl hover:brightness-105 transition-all"
          >
            <Zap className="w-4 h-4" />
            Fetch New Companies
          </button>
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
            <button
              key={card.title}
              onClick={() => handleCardClick(card.target, card.title)}
              className="group bg-white/80 border border-slate-100 rounded-2xl px-4 py-4 flex items-center justify-between hover:border-sky-200 hover:shadow-md hover:shadow-sky-50 transition-all text-left w-full"
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
            </button>
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
            <button
              onClick={() => handleCardClick('companies', 'Find Companies')}
              className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Find Companies
            </button>
            <button
              onClick={() => handleCardClick('campaigns', 'Create Campaign')}
              className="px-6 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-colors"
            >
              Create Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
