import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import Dashboard from './pages/Dashboard';
import Automation from './pages/Automation';
import Companies from './pages/Companies';
import EmailOpenedCompanies from './pages/EmailOpenedCompanies';
import Campaigns from './pages/Campaigns';
import Messages from './pages/Messages';
import Leads from './pages/Leads';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

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
              <Route path="/" element={<Dashboard />} />
              <Route path="/automation" element={<Automation />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/opened" element={<EmailOpenedCompanies />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
