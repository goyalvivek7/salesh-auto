import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Message } from '../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
    Mail,
    MessageSquare,
    CheckCircle,
    XCircle,
    Clock,
    Filter,
    RefreshCw,
    Send,
    Download,
    Trash2,
    RotateCcw
} from 'lucide-react';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';

export default function Messages() {
    const [filterType, setFilterType] = useState<string>('ALL');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const queryClient = useQueryClient();
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const { data: messagesData, isLoading, refetch } = useQuery({
        queryKey: ['messages', page, searchTerm, filterType, filterStatus],
        queryFn: () => api.messages.getAll({
            page,
            page_size: 20,
            search: searchTerm || undefined,
            type: filterType === 'ALL' ? undefined : filterType,
            status: filterStatus === 'ALL' ? undefined : filterStatus
        }).then(res => res.data)
    });

    const messages = messagesData?.items || [];

    const handleSearchChange = (newSearch: string) => {
        setSearchTerm(newSearch);
        setPage(1);
    };

    const deleteMutation = useMutation({
        mutationFn: (ids: number[]) => api.messages.deleteBatch(ids),
        onSuccess: () => {
            toast.success('Messages deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            setSelectedIds([]);
        },
        onError: () => toast.error('Failed to delete messages'),
    });

    const retryMutation = useMutation({
        mutationFn: (ids: number[]) => api.messages.retryBatch(ids),
        onSuccess: () => {
            toast.success('Messages queued for retry');
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            setSelectedIds([]);
        },
        onError: () => toast.error('Failed to retry messages'),
    });

    const sendEmailMutation = useMutation({
        mutationFn: (id: number) => api.messages.send(id),
        onSuccess: () => {
            toast.success('Email sent successfully');
            queryClient.invalidateQueries({ queryKey: ['messages'] });
        },
        onError: () => toast.error('Failed to send email')
    });

    const sendWhatsAppMutation = useMutation({
        mutationFn: (id: number) => api.messages.sendWhatsApp(id),
        onSuccess: () => {
            toast.success('WhatsApp message sent successfully');
            queryClient.invalidateQueries({ queryKey: ['messages'] });
        },
        onError: () => toast.error('Failed to send WhatsApp message')
    });



    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(messages.map((m: Message) => m.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete ${selectedIds.length} messages?`)) {
            deleteMutation.mutate(selectedIds);
        }
    };

    const handleRetry = () => {
        retryMutation.mutate(selectedIds);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SENT': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'FAILED': return 'text-red-400 bg-red-400/10 border-red-400/20';
            default: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'SENT': return <CheckCircle className="w-4 h-4" />;
            case 'FAILED': return <XCircle className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Messages</h1>
                    <p className="text-gray-400">View and manage all outreach communications</p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedIds.length > 0 && (
                        <>
                            <button
                                onClick={handleRetry}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                <RotateCcw className="w-5 h-5" />
                                <span>Retry ({selectedIds.length})</span>
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            >
                                <Trash2 className="w-5 h-5" />
                                <span>Delete ({selectedIds.length})</span>
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => window.open(`${API_BASE_URL}/api/messages/export`, '_blank')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg transition-colors"
                    >
                        <Download className="w-5 h-5" />
                        <span>Export CSV</span>
                    </button>
                    <button
                        onClick={() => refetch()}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SearchBar
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder="Search by company name or message content..."
                />

                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                        <option value="ALL">All Types</option>
                        <option value="EMAIL">Email</option>
                        <option value="WHATSAPP">WhatsApp</option>
                    </select>
                </div>

                <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="DRAFT">Draft</option>
                        <option value="SENT">Sent</option>
                        <option value="FAILED">Failed</option>
                    </select>
                </div>
            </div>

            {/* Messages List */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-700/50 bg-slate-800/80">
                                <th className="p-4 w-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length === messages.length && messages.length > 0}
                                        onChange={handleSelectAll}
                                        className="rounded border-gray-500 bg-slate-700 text-blue-500 focus:ring-blue-500/50"
                                    />
                                </th>
                                <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                                <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">To / Company</th>
                                <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Content</th>
                                <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Stage</th>
                                <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                                <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">
                                        <div className="flex items-center justify-center gap-2">
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                            Loading messages...
                                        </div>
                                    </td>
                                </tr>
                            ) : messages.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">
                                        No messages found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                messages.map((msg: Message) => (
                                    <tr key={msg.id} className="hover:bg-slate-700/30 transition-colors group">
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(msg.id)}
                                                onChange={() => handleSelectOne(msg.id)}
                                                className="rounded border-gray-500 bg-slate-700 text-blue-500 focus:ring-blue-500/50"
                                            />
                                        </td>
                                        <td className="p-4">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${msg.type === 'WHATSAPP'
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {msg.type === 'WHATSAPP' ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-white">{msg.company_name || `Company #${msg.company_id}`}</div>
                                            <div className="text-xs text-gray-500">ID: {msg.id}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="max-w-md">
                                                {msg.subject && (
                                                    <div className="text-sm font-medium text-gray-300 mb-0.5">{msg.subject}</div>
                                                )}
                                                <div className="text-sm text-gray-400 line-clamp-2">{msg.content}</div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 text-xs font-medium rounded-md bg-slate-700 text-gray-300 border border-slate-600">
                                                {msg.stage.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(msg.status)}`}>
                                                {getStatusIcon(msg.status)}
                                                {msg.status}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-400">
                                            {msg.sent_at ? (
                                                <div className="flex flex-col">
                                                    <span>{format(new Date(msg.sent_at), 'MMM d, yyyy')}</span>
                                                    <span className="text-xs text-gray-500">{format(new Date(msg.sent_at), 'h:mm a')}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-yellow-500/80">
                                                    <Clock className="w-3 h-3" />
                                                    <span className="text-xs">Scheduled: {format(new Date(msg.scheduled_for), 'MMM d')}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {msg.status !== 'SENT' && (
                                                <button
                                                    onClick={() => {
                                                        if (msg.type === 'EMAIL') sendEmailMutation.mutate(msg.id);
                                                        else sendWhatsAppMutation.mutate(msg.id);
                                                    }}
                                                    disabled={sendEmailMutation.isPending || sendWhatsAppMutation.isPending}
                                                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                    title="Send Now"
                                                >
                                                    <Send className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {messagesData && (
                    <Pagination
                        currentPage={messagesData.page}
                        totalPages={messagesData.total_pages}
                        totalItems={messagesData.total}
                        pageSize={messagesData.page_size}
                        onPageChange={setPage}
                    />
                )}
            </div>
        </div>
    );
}
