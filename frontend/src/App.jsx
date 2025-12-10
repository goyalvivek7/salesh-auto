import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import Dashboard from './pages/Dashboard';
import Automation from './pages/Automation';
import Companies from './pages/Companies';
import EmailOpenedCompanies from './pages/EmailOpenedCompanies';
import UnsubscribedCompanies from './pages/UnsubscribedCompanies';
import Campaigns from './pages/Campaigns';
import Messages from './pages/Messages';
import Leads from './pages/Leads';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import ProductAnalytics from './pages/ProductAnalytics';
import ProductAnalyticsOverview from './pages/ProductAnalyticsOverview';
// Product-specific pages (with product_id filter)
import ProductCompanies from './pages/ProductCompanies';
import ProductCampaigns from './pages/ProductCampaigns';
import ProductLeads from './pages/ProductLeads';
import ProductEmailOpened from './pages/ProductEmailOpened';
import ProductUnsubscribed from './pages/ProductUnsubscribed';
import ProductMessages from './pages/ProductMessages';
import ProductAutomation from './pages/ProductAutomation';
import ProductCompanyDetail from './pages/ProductCompanyDetail';
import ServiceMessages from './pages/ServiceMessages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter basename="/autosalesbot">
          <Layout>
            <Routes>
              {/* Dashboard */}
              <Route path="/" element={<Dashboard />} />
              
              {/* Products Section */}
              <Route path="/products" element={<Products />} />
              <Route path="/products/companies" element={<ProductCompanies />} />
              <Route path="/products/company/:companyId" element={<ProductCompanyDetail />} />
              <Route path="/products/campaigns" element={<ProductCampaigns />} />
              <Route path="/products/leads" element={<ProductLeads />} />
              <Route path="/products/opened" element={<ProductEmailOpened />} />
              <Route path="/products/unsubscribed" element={<ProductUnsubscribed />} />
              <Route path="/products/messages" element={<ProductMessages />} />
              <Route path="/products/analytics" element={<ProductAnalyticsOverview />} />
              <Route path="/products/automation" element={<ProductAutomation />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/products/:id/analytics" element={<ProductAnalytics />} />
              
              {/* Services Section (legacy - companies without product_id) */}
              <Route path="/services/automation" element={<Automation />} />
              {/* Alias for companies deep-linking (e.g., /companies?id=36) */}
              <Route path="/companies" element={<Companies />} />
              <Route path="/services/companies" element={<Companies />} />
              <Route path="/services/opened" element={<EmailOpenedCompanies />} />
              <Route path="/services/unsubscribed" element={<UnsubscribedCompanies />} />
              <Route path="/services/campaigns" element={<Campaigns />} />
              <Route path="/services/messages" element={<ServiceMessages />} />
              <Route path="/services/leads" element={<Leads />} />
              <Route path="/services/analytics" element={<Analytics />} />
              
              {/* Global */}
              <Route path="/messages" element={<Messages />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
