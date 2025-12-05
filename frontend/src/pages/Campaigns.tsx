import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useState } from 'react';
import { Plus, Send, Eye, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Campaign } from '../types';

export default function Campaigns() {
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [campaignName, setCampaignName] = useState('');
    const [industry, setIndustry] = useState('');
    const [limit, setLimit] = useState(10);
    const [emailTemplateId, setEmailTemplateId] = useState<number | ''>('');
    const [whatsappTemplateId, setWhatsappTemplateId] = useState<number | ''>('');
    const [campaignType, setCampaignType] = useState('SALES');
    const queryClient = useQueryClient();

    const { data: campaigns, isLoading } = useQuery<{ data: Campaign[] }>({
        queryKey: ['campaigns'],
        queryFn: () => api.campaigns.getAll(),
    });

    const { data: templates = [] } = useQuery({
        queryKey: ['templates'],
        queryFn: () => api.templates.getAll().then(res => res.data)
    });

    const generateMutation = useMutation({
        mutationFn: (data: {
            campaign_name: string;
            industry: string;
            limit: number;
            email_template_id?: number;
            whatsapp_template_id?: number;
            campaign_type?: string;
        }) =>
            api.campaigns.generate(data),
        onSuccess: () => {
            toast.success('Campaign generated successfully!');
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            setShowGenerateModal(false);
            setCampaignName('');
            setIndustry('');
            setLimit(10);
            setEmailTemplateId('');
            setWhatsappTemplateId('');
            setCampaignType('SALES');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to generate campaign');
        },
    });

    const sendBatchMutation = useMutation({
        mutationFn: (id: number) => api.campaigns.sendBatch(id),
        onSuccess: () => {
            toast.success('Batch emails sent successfully!');
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to send batch');
        },
    });

    const handleGenerate = () => {
        if (!campaignName || !industry) {
            toast.error('Please fill in all fields');
            return;
        }
        generateMutation.mutate({
            campaign_name: campaignName,
            industry,
            limit,
            email_template_id: emailTemplateId ? Number(emailTemplateId) : undefined,
            whatsapp_template_id: whatsappTemplateId ? Number(whatsappTemplateId) : undefined,
            campaign_type: campaignType
        });
    };

    const viewDetails = async (campaign: Campaign) => {
        const response = await api.campaigns.getById(campaign.id);
        setSelectedCampaign(response.data);
        setShowDetailsModal(true);
    };

    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const deleteBatchMutation = useMutation({
        mutationFn: (ids: number[]) => api.campaigns.deleteBatch(ids),
        onSuccess: () => {
            toast.success('Selected campaigns deleted successfully');
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to delete campaigns');
        }
    });

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === campaigns?.data?.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(campaigns?.data?.map(c => c.id) || []);
        }
    };

    const handleBulkDelete = () => {
        if (!selectedIds.length) return;
        if (window.confirm(`Delete ${selectedIds.length} campaigns?`)) {
            deleteBatchMutation.mutate(selectedIds);
        }
    };

    const handleBulkSend = async () => {
        if (!selectedIds.length) return;
        if (window.confirm(`Send emails for ${selectedIds.length} campaigns?`)) {
            for (const id of selectedIds) {
                try {
                    await api.campaigns.sendBatch(id);
                } catch (e) {
                    console.error(`Failed to send for campaign ${id}`, e);
                }
            }
            toast.success('Bulk send initiated');
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            setSelectedIds([]);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Campaigns</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        {campaigns?.data.length || 0} campaigns created
                    </p>
                </div>
                <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                        <>
                            <button
                                onClick={handleBulkDelete}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            >
                                Delete ({selectedIds.length})
                            </button>
                            <button
                                onClick={handleBulkSend}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                            >
                                Send ({selectedIds.length})
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setShowGenerateModal(true)}
                        className="btn-primary flex items-center space-x-2"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Generate Campaign</span>
                    </button>
                </div>
            </div>

            {/* Campaigns Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="checkbox"
                            checked={campaigns?.data?.length ? selectedIds.length === campaigns.data.length : false}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-500">Select All</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {campaigns?.data.map((campaign) => (
                            <div key={campaign.id} className={`card relative ${selectedIds.includes(campaign.id) ? 'ring-2 ring-blue-500' : ''}`}>
                                <div className="absolute top-4 right-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(campaign.id)}
                                        onChange={() => toggleSelect(campaign.id)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </div>
                                <h3 className="text-lg font-semibold mb-2 pr-8">{campaign.name}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Industry: {campaign.industry}
                                </p>
                                <p className="text-xs text-gray-500 mb-4">
                                    Created: {new Date(campaign.created_at).toLocaleDateString()}
                                </p>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => viewDetails(campaign)}
                                        className="btn-secondary flex-1 text-sm flex items-center justify-center space-x-2"
                                    >
                                        <Eye className="w-4 h-4" />
                                        <span>View</span>
                                    </button>
                                    <button
                                        onClick={() => sendBatchMutation.mutate(campaign.id)}
                                        disabled={sendBatchMutation.isPending}
                                        className="btn-primary flex-1 text-sm flex items-center justify-center space-x-2"
                                    >
                                        <Send className="w-4 h-4" />
                                        <span>Send</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Generate Campaign Modal */}
            {showGenerateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <h2 className="text-2xl font-bold mb-4">Generate Campaign</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Campaign Name</label>
                                <input
                                    type="text"
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    placeholder="e.g., India IT Services Q1 2025"
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Industry</label>
                                <input
                                    type="text"
                                    value={industry}
                                    onChange={(e) => setIndustry(e.target.value)}
                                    placeholder="e.g., IT Services"
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Company Limit</label>
                                <input
                                    type="number"
                                    value={limit}
                                    onChange={(e) => setLimit(parseInt(e.target.value))}
                                    min="1"
                                    max="100"
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Email Template (Optional)</label>
                                <select
                                    value={emailTemplateId}
                                    onChange={(e) => setEmailTemplateId(e.target.value ? Number(e.target.value) : '')}
                                    className="input"
                                >
                                    <option value="">Default (Hardcoded)</option>
                                    {templates.filter((t: any) => t.type === 'EMAIL').map((t: any) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">WhatsApp Template (Optional)</label>
                                <select
                                    value={whatsappTemplateId}
                                    onChange={(e) => setWhatsappTemplateId(e.target.value ? Number(e.target.value) : '')}
                                    className="input"
                                >
                                    <option value="">Default (Hardcoded)</option>
                                    {templates.filter((t: any) => t.type === 'WHATSAPP').map((t: any) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    onClick={handleGenerate}
                                    disabled={generateMutation.isPending}
                                    className="btn-primary flex-1 flex items-center justify-center space-x-2"
                                >
                                    {generateMutation.isPending ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                            <span>Generating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-5 h-5" />
                                            <span>Generate</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowGenerateModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Campaign Details Modal */}
            {showDetailsModal && selectedCampaign && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 my-8">
                        <h2 className="text-2xl font-bold mb-4">{selectedCampaign.name}</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Industry:</span>
                                    <p className="font-medium">{selectedCampaign.industry}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Messages:</span>
                                    <p className="font-medium">{selectedCampaign.messages?.length || 0}</p>
                                </div>
                            </div>
                            {selectedCampaign.messages && selectedCampaign.messages.length > 0 && (
                                <div className="max-h-96 overflow-y-auto">
                                    <h3 className="font-semibold mb-2">Messages:</h3>
                                    <div className="space-y-2">
                                        {selectedCampaign.messages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                className="border dark:border-gray-700 rounded p-3 text-sm"
                                            >
                                                <div className="flex justify-between mb-2">
                                                    <span className="font-medium">{msg.type} - {msg.stage}</span>
                                                    <span className={`px-2 py-1 rounded text-xs ${msg.status === 'SENT' ? 'bg-green-100 text-green-800' :
                                                        msg.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'
                                                        }`}>
                                                        {msg.status}
                                                    </span>
                                                </div>
                                                {msg.subject && (
                                                    <p className="text-gray-600 dark:text-gray-400 mb-1">
                                                        Subject: {msg.subject}
                                                    </p>
                                                )}
                                                <p className="text-gray-700 dark:text-gray-300 text-xs line-clamp-2">
                                                    {msg.content}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="btn-secondary w-full"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
