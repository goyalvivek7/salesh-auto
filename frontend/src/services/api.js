import axios from 'axios';

// In production, API is at /autosalesbot/api; in dev, Vite proxy handles /api
const API_BASE_URL = import.meta.env.PROD ? '/autosalesbot/api' : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Companies
export const fetchCompaniesFromAI = (data) => api.post('/fetch-companies', data);
export const getCompanies = (params) => api.get('/companies', { params });
export const getCompany = (id) => api.get(`/companies/${id}`);
export const updateCompany = (id, data) => api.put(`/companies/${id}`, data);
export const deleteCompanies = (ids) => api.delete('/companies/batch', { data: { ids } });
export const exportCompanies = () => api.get('/companies/export', { responseType: 'blob' });

// Campaigns
export const getCampaigns = (params) => api.get('/campaigns', { params });
export const getCampaign = (id) => api.get(`/campaigns/${id}`);
export const generateCampaign = (data) => api.post('/campaigns/generate', data);
export const deleteCampaigns = (ids) => api.delete('/campaigns/batch', { data: { ids } });
export const sendCampaignBatch = (id) => api.post(`/campaigns/${id}/send-batch`);
export const startCampaignNow = (id) => api.post(`/campaigns/${id}/start-now`);

// Messages
export const getMessages = (params) => api.get('/messages', { params });
export const sendMessage = (id) => api.post(`/messages/${id}/send`);
export const sendWhatsAppMessage = (id) => api.post(`/messages/${id}/send-whatsapp`);
export const deleteMessages = (ids) => api.delete('/messages/batch', { data: { ids } });
export const retryMessages = (ids) => api.post('/messages/batch/retry', { ids });
export const exportMessages = () => api.get('/messages/export', { responseType: 'blob' });

// Templates
export const getTemplates = () => api.get('/templates');
export const createTemplate = (data) => api.post('/templates', data);
export const updateTemplate = (id, data) => api.put(`/templates/${id}`, data);
export const deleteTemplate = (id) => api.delete(`/templates/${id}`);

// Automation & Stats
export const getAutomationStats = () => api.get('/automation/stats');
export const getAutomationConfigs = () => api.get('/automation/config');
export const getAutomationConfig = (id) => api.get(`/automation/config/${id}`);
export const createAutomationConfig = (data) => api.post('/automation/config', data);
export const updateAutomationConfig = (id, data) => api.put(`/automation/config/${id}`, data);
export const deleteAutomationConfig = (id) => api.delete(`/automation/config/${id}`);
export const startAutomation = (id) => api.post(`/automation/${id}/start`);
export const stopAutomation = (id) => api.post(`/automation/${id}/stop`);
export const resumeAutomation = (id) => api.post(`/automation/${id}/resume`);
export const runAutomationNow = (id) => api.post(`/automation/${id}/run-now`);
export const getChartData = () => api.get('/analytics/charts');
export const getDetailedAnalytics = (days = 30) =>
  api.get('/analytics/detailed', { params: { days } });

// Leads & Replies
// Backend routes (see main.py):
// - /api/leads/qualified
// - /api/replies
// - /api/companies/stopped
// - /api/companies/opened
// - /api/companies/unsubscribed
export const getQualifiedLeads = () => api.get('/leads/qualified');
export const getAllReplies = () => api.get('/replies');
export const getStoppedCompanies = (params) => api.get('/companies/stopped', { params });
export const getEmailOpenedCompanies = (params) => api.get('/companies/opened', { params });
export const getUnsubscribedCompanies = (params) => api.get('/companies/unsubscribed', { params });
export const removeFromUnsubscribeList = (id) => api.delete(`/companies/unsubscribed/${id}`);
export const exportLeads = () => api.get('/leads/export', { responseType: 'blob' });

// Settings
export const getSettings = () => api.get('/settings');
export const updateGeneralSettings = (data) => api.put('/settings/general', data);
export const updateEmailSettings = (data) => api.put('/settings/email', data);
export const updateNotificationSettings = (data) => api.put('/settings/notifications', data);
export const checkRequiredSettings = () => api.get('/settings/check-required');

// System
export const resetDatabase = () => api.delete('/reset-database');
export const healthCheck = () => api.get('/health');

// Products
export const getProducts = (params) => api.get('/products', { params });
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const fetchClientsForProduct = (id, data) => api.post(`/products/${id}/fetch-clients`, data);
export const generateProductCampaign = (id, data) => api.post(`/products/${id}/campaigns/generate`, data);
export const getProductCampaigns = (id, params) => api.get(`/products/${id}/campaigns`, { params });
export const getProductCompanies = (id, params) => api.get(`/products/${id}/companies`, { params });
export const getProductsAnalyticsOverview = () => api.get('/products/analytics');
export const getProductAnalytics = (id) => api.get(`/products/${id}/analytics`);
export const getProductLeads = (id, params) => api.get(`/products/${id}/leads`, { params });
export const uploadProductAsset = (id, formData) => 
  api.post(`/products/${id}/assets`, formData, { 
    headers: { 'Content-Type': 'multipart/form-data' } 
  });
export const getProductAssets = (id) => api.get(`/products/${id}/assets`);
export const deleteProductAsset = (productId, assetId) => 
  api.delete(`/products/${productId}/assets/${assetId}`);
export const generateTrackedBrochureLink = (productId, companyId) => 
  api.post(`/products/${productId}/generate-brochure-link`, null, { params: { company_id: companyId } });
export const classifyIntent = (replyText) => 
  api.post('/products/classify-intent', null, { params: { reply_text: replyText } });

// Product Templates
export const getProductTemplates = (productId) => api.get(`/products/${productId}/templates`);
export const createProductTemplate = (productId, data) => api.post(`/products/${productId}/templates`, data);
export const updateProductTemplate = (productId, templateId, data) => 
  api.put(`/products/${productId}/templates/${templateId}`, data);
export const deleteProductTemplate = (productId, templateId) => 
  api.delete(`/products/${productId}/templates/${templateId}`);

// Email Accounts
export const getEmailAccounts = (params) => api.get('/email-accounts', { params });
export const createEmailAccount = (data) => api.post('/email-accounts', data);
export const updateEmailAccount = (id, data) => api.put(`/email-accounts/${id}`, data);
export const deleteEmailAccount = (id) => api.delete(`/email-accounts/${id}`);
export const testEmailAccount = (id) => api.post(`/email-accounts/${id}/test`);

// Service-specific endpoints (with /services/ prefix)
export const getServiceCompanies = (params) => api.get('/services/companies', { params });
export const getServiceCampaigns = (params) => api.get('/services/campaigns', { params });
export const getServiceMessages = (params) => api.get('/services/messages', { params });
export const getServiceLeads = (params) => api.get('/services/leads', { params });
export const getServiceEmailOpens = (params) => api.get('/services/email-opens', { params });
export const getServiceUnsubscribes = (params) => api.get('/services/unsubscribes', { params });
export const getServiceAnalytics = () => api.get('/services/analytics');

export default api;
