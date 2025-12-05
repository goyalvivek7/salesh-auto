import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { TrendingUp, Mail, MessageSquare, ExternalLink, Download } from 'lucide-react';
import type { QualifiedLead, Reply } from '../types';

export default function Leads() {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const { data: leads, isLoading: leadsLoading } = useQuery<{ data: { leads: QualifiedLead[] } }>({
        queryKey: ['qualified-leads'],
        queryFn: () => api.leads.qualified(),
    });

    const { data: replies, isLoading: repliesLoading } = useQuery<{ data: { replies: Reply[] } }>({
        queryKey: ['all-replies'],
        queryFn: () => api.leads.allReplies(),
    });

    const isLoading = leadsLoading || repliesLoading;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Qualified Leads</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        {leads?.data.leads.length || 0} companies have replied to your outreach
                    </p>
                </div>
                <button
                    onClick={() => window.open(`${API_BASE_URL}/api/leads/export`, '_blank')}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg transition-colors"
                >
                    <Download className="w-5 h-5" />
                    <span>Export CSV</span>
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Qualified Leads */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold flex items-center space-x-2">
                            <TrendingUp className="w-6 h-6 text-green-500" />
                            <span>Qualified Leads ({leads?.data.leads.length || 0})</span>
                        </h2>
                        {leads?.data.leads.map((lead) => (
                            <div key={lead.company_id} className="card">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-bold text-lg">{lead.company_name}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {lead.industry} • {lead.country}
                                        </p>
                                    </div>
                                    <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs px-3 py-1 rounded-full font-medium">
                                        ✅ QUALIFIED
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm mb-3">
                                    {lead.email && (
                                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                                            <Mail className="w-4 h-4" />
                                            <span>{lead.email}</span>
                                        </div>
                                    )}
                                    {lead.phone && (
                                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                                            <MessageSquare className="w-4 h-4" />
                                            <span>{lead.phone}</span>
                                        </div>
                                    )}
                                    {lead.website && (
                                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                                            <ExternalLink className="w-4 h-4" />
                                            <a
                                                href={lead.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary-600 hover:underline"
                                            >
                                                {lead.website}
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {lead.latest_reply && (
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 mt-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                Latest Reply ({lead.latest_reply.source})
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(lead.latest_reply.replied_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            "{lead.latest_reply.content}"
                                        </p>
                                    </div>
                                )}

                                <div className="mt-3 text-xs text-gray-500">
                                    Total replies: {lead.total_replies}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* All Replies */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">All Replies ({replies?.data.replies.length || 0})</h2>
                        <div className="max-h-[800px] overflow-y-auto space-y-3">
                            {replies?.data.replies.map((reply) => (
                                <div key={reply.id} className="card">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="font-semibold">{reply.company_name}</h4>
                                            <p className="text-xs text-gray-500">
                                                {reply.company_industry} • {reply.company_country}
                                            </p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded ${reply.source === 'WhatsApp'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                            }`}>
                                            {reply.source}
                                        </span>
                                    </div>

                                    {reply.subject && (
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {reply.subject}
                                        </p>
                                    )}

                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        "{reply.reply_content}"
                                    </p>

                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>{reply.from}</span>
                                        <span>{new Date(reply.replied_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
