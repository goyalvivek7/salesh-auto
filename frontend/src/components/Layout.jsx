import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Megaphone,
  MessageSquare,
  Users,
  Settings,
  Menu,
  X,
  Zap,
  Mail,
  TrendingUp,
  Eye,
  UserX,
  Package,
  Briefcase,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

// Products section navigation
const productNavItems = [
  { path: '/products/automation', icon: Zap, label: 'Automation' },
  { path: '/products', icon: Package, label: 'All Products' },
  { path: '/products/companies', icon: Building2, label: 'Companies' },
  { path: '/products/opened', icon: Eye, label: 'Email Opened' },
  { path: '/products/unsubscribed', icon: UserX, label: 'Unsubscribed' },
  { path: '/products/campaigns', icon: Megaphone, label: 'Campaigns' },
  { path: '/products/messages', icon: MessageSquare, label: 'Messages' },
  { path: '/products/leads', icon: Users, label: 'Leads' },
  { path: '/products/analytics', icon: TrendingUp, label: 'Analytics' },
];

// Services section navigation
const serviceNavItems = [
  { path: '/services/automation', icon: Zap, label: 'Automation' },
  { path: '/services/companies', icon: Building2, label: 'Companies' },
  { path: '/services/opened', icon: Eye, label: 'Email Opened' },
  { path: '/services/unsubscribed', icon: UserX, label: 'Unsubscribed' },
  { path: '/services/campaigns', icon: Megaphone, label: 'Campaigns' },
  { path: '/services/messages', icon: MessageSquare, label: 'Messages' },
  { path: '/services/leads', icon: Users, label: 'Leads' },
  { path: '/services/analytics', icon: TrendingUp, label: 'Analytics' },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [productsOpen, setProductsOpen] = useState(true);
  const [servicesOpen, setServicesOpen] = useState(true);
  const location = useLocation();

  // Check if current path is in a section
  const isInProducts = location.pathname.startsWith('/products');
  const isInServices = location.pathname.startsWith('/services');

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="h-full w-64 bg-white/80 backdrop-blur-xl border-r border-white/60 shadow-xl shadow-indigo-50 flex flex-col">
          {/* Logo */}
          <div className="h-20 flex items-center justify-between px-4 border-b border-white/60">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-md shadow-sky-200">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-slate-900">Automatic Sales</span>
                <span className="text-xs text-slate-500">AI Outreach Workspace</span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-xl hover:bg-slate-100/80"
            >
              <X className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {/* Dashboard */}
            <Link
              to="/"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                location.pathname === '/'
                  ? 'bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 hover:shadow-sm'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
                location.pathname === '/' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <span>Dashboard</span>
            </Link>

            {/* Products Section */}
            <div className="pt-3">
              <button
                onClick={() => setProductsOpen(!productsOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isInProducts
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-white/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isInProducts ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Package className="w-4 h-4" />
                  </div>
                  <span>Products</span>
                </div>
                {productsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              
              {productsOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-indigo-100 pl-3">
                  {productNavItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                          isActive
                            ? 'bg-indigo-100 text-indigo-700 font-medium'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Services Section */}
            <div className="pt-2">
              <button
                onClick={() => setServicesOpen(!servicesOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isInServices
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-white/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isInServices ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <span>Services</span>
                </div>
                {servicesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              
              {servicesOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-emerald-100 pl-3">
                  {serviceNavItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-700 font-medium'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

           

            {/* Settings */}
            <Link
              to="/settings"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                location.pathname === '/settings'
                  ? 'bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 hover:shadow-sm'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
                location.pathname === '/settings' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <Settings className="w-4 h-4" />
              </div>
              <span>Settings</span>
            </Link>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/60 bg-white/70">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50/80">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">Workspace</p>
                <p className="text-xs text-slate-500">Automatic Sales · v1.0.0</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-white/60 flex items-center justify-between px-4 lg:px-8 shadow-sm shadow-indigo-50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100/80"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex-1 flex items-center justify-end gap-6">
            <div className="text-right">
              <p className="text-xs text-slate-400">Today</p>
              <p className="text-sm font-medium text-slate-700">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-3 sm:px-4 lg:px-6 py-4 lg:py-6">
          <div className="space-y-6">{children}</div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
