import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import Campaigns from './pages/Campaigns';
import Leads from './pages/Leads';

import Messages from './pages/Messages';
import Automation from './pages/Automation';
import Analytics from './pages/Analytics';
import Stopped from './pages/Stopped';
import Settings from './pages/Settings';
import Templates from './pages/Templates';

function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="companies" element={<Companies />} />
                <Route path="campaigns" element={<Campaigns />} />
                <Route path="leads" element={<Leads />} />
                <Route path="messages" element={<Messages />} />
                <Route path="automation" element={<Automation />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="stopped" element={<Stopped />} />
                <Route path="templates" element={<Templates />} />
                <Route path="settings" element={<Settings />} />
            </Route>
        </Routes>
    );
}

export default App;
