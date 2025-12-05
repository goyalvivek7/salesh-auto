import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// API endpoints
export const api = {
    // Companies
    companies: {
        getAll: (params?: { page?: number; page_size?: number; search?: string }) =>
            apiClient.get('/api/companies', { params }),
        getById: (id: number) => apiClient.get(`/api/companies/${id}`),
        fetchNew: (data: { industry: string; country: string; count: number }) =>
            apiClient.post('/api/fetch-companies', data),
        deleteBatch: (ids: number[]) => apiClient.delete('/api/companies/batch', { data: { ids } }),
        update: (id: number, data: any) => apiClient.put(`/api/companies/${id}`, data),
    },

    // Campaigns
    campaigns: {
        getAll: () => apiClient.get('/api/campaigns'),
        getById: (id: number) => apiClient.get(`/api/campaigns/${id}`),
        generate: (data: {
            campaign_name: string;
            industry: string;
            limit: number;
            email_template_id?: number;
            whatsapp_template_id?: number;
            campaign_type?: string;
        }) =>
            apiClient.post('/api/campaigns/generate', data),
        sendBatch: (id: number) => apiClient.post(`/api/campaigns/${id}/send-batch`),
        deleteBatch: (ids: number[]) => apiClient.delete('/api/campaigns/batch', { data: { ids } }),
    },

    // Messages
    messages: {
        getAll: (params?: { page?: number; page_size?: number; search?: string; type?: string; status?: string }) =>
            apiClient.get('/api/messages', { params }),
        send: (id: number) => apiClient.post(`/api/messages/${id}/send`),
        sendWhatsApp: (id: number) => apiClient.post(`/api/messages/${id}/send-whatsapp`),
        deleteBatch: (ids: number[]) => apiClient.delete('/api/messages/batch', { data: { ids } }),
        retryBatch: (ids: number[]) => apiClient.post('/api/messages/batch/retry', { ids }),
    },

    // Leads & Replies
    leads: {
        qualified: () => apiClient.get('/api/leads/qualified'),
        allReplies: () => apiClient.get('/api/replies'),
        stopped: (params?: { page?: number; page_size?: number; search?: string }) =>
            apiClient.get('/api/companies/stopped', { params }),
    },

    // Automation
    automation: {
        getConfigs: () => apiClient.get('/api/automation/config'),
        createConfig: (data: any) => apiClient.post('/api/automation/config', data),
        start: (id: number) => apiClient.post(`/api/automation/${id}/start`),
        stop: (id: number) => apiClient.post(`/api/automation/${id}/stop`),
        getStats: () => apiClient.get('/api/automation/stats'),
        getChartData: () => apiClient.get('/api/analytics/charts'),
    },

    // Templates
    templates: {
        getAll: (type?: string) => apiClient.get('/api/templates', { params: { type } }),
        create: (data: any) => apiClient.post('/api/templates', data),
        get: (id: number) => apiClient.get(`/api/templates/${id}`),
        update: (id: number, data: any) => apiClient.put(`/api/templates/${id}`, data),
        delete: (id: number) => apiClient.delete(`/api/templates/${id}`),
        sync: () => apiClient.post('/api/templates/sync'),
    },

    // Settings
    settings: {
        getAll: () => apiClient.get('/api/settings'),
        update: (data: { key: string; value: string; description?: string }) =>
            apiClient.post('/api/settings', data),
    },

    // Database
    database: {
        reset: () => apiClient.delete('/api/reset-database'),
    },
};
