import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useState } from 'react';
import { Plus, RefreshCw, Download, Trash2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Company, Message, ReplyTracking } from '../types';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';

export default function Companies() {
    const [showFetchModal, setShowFetchModal] = useState(false);
    const [industry, setIndustry] = useState('');
    const [country, setCountry] = useState('');
    const [count, setCount] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const queryClient = useQueryClient();
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const { data: companies, isLoading } = useQuery({
        queryKey: ['companies', page, searchTerm],
        queryFn: () => api.companies.getAll({ page, page_size: 20, search: searchTerm || undefined }),
    });

    const fetchMutation = useMutation({
        mutationFn: (data: { industry: string; country: string; count: number }) =>
            api.companies.fetchNew(data),
        onSuccess: () => {
            toast.success('Companies fetched successfully!');
            queryClient.invalidateQueries({ queryKey: ['companies'] });
            setPage(1);
            setShowFetchModal(false);
            setIndustry('');
            setCountry('');
            setCount(10);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to fetch companies');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (ids: number[]) => api.companies.deleteBatch(ids),
        onSuccess: () => {
            toast.success('Companies deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['companies'] });
            setSelectedIds([]);
        },
        onError: () => toast.error('Failed to delete companies'),
    });

    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [editFormData, setEditFormData] = useState({
        name: '',
        industry: '',
        country: '',
        email: '',
        phone: '',
        website: ''
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: number; company: any }) =>
            api.companies.update(data.id, data.company),
        onSuccess: () => {
            toast.success('Company updated successfully');
            queryClient.invalidateQueries({ queryKey: ['companies'] });
            setEditingCompany(null);
        },
        onError: () => toast.error('Failed to update company')
    });

    const sendEmailMutation = useMutation({
        mutationFn: (id: number) => api.messages.send(id),
        onSuccess: () => {
            toast.success('Email sent successfully');
            if (selectedCompany) handleViewDetails(selectedCompany.id);
        },
        onError: () => toast.error('Failed to send email')
    });

    const sendWhatsAppMutation = useMutation({
        mutationFn: (id: number) => api.messages.sendWhatsApp(id),
        onSuccess: () => {
            toast.success('WhatsApp message sent successfully');
            if (selectedCompany) handleViewDetails(selectedCompany.id);
        },
        onError: () => toast.error('Failed to send WhatsApp message')
    });

    const handleEdit = (company: Company) => {
        setEditingCompany(company);
        setEditFormData({
            name: company.name,
            industry: company.industry,
            country: company.country,
            email: company.email || '',
            phone: company.phone || '',
            website: company.website || ''
        });
    };

    const handleUpdateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCompany) {
            updateMutation.mutate({ id: editingCompany.id, company: editFormData });
        }
    };

    const companiesList = companies?.data?.items || [];

    // Reset to page 1 when search changes
    const handleSearchChange = (newSearch: string) => {
        setSearchTerm(newSearch);
        setPage(1);
    };

    const handleFetch = () => {
        if (!industry || !country) {
            toast.error('Please fill in all fields');
            return;
        }
        fetchMutation.mutate({ industry, country, count });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(companiesList.map(c => c.id));
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
        if (confirm(`Are you sure you want to delete ${selectedIds.length} companies?`)) {
            deleteMutation.mutate(selectedIds);
        }
    };

    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const handleViewDetails = async (id: number) => {
        try {
            const response = await api.companies.getById(id);
            setSelectedCompany(response.data);
            setShowDetailsModal(true);
        } catch (error) {
            toast.error('Failed to fetch company details');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Companies</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        {companies?.data?.total || 0} companies in database
                    </p>
                </div>
                <div className="flex gap-3">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                            <span>Delete ({selectedIds.length})</span>
                        </button>
                    )}
                    <button
                        onClick={() => window.open(`${API_BASE_URL}/api/companies/export`, '_blank')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg transition-colors"
                    >
                        <Download className="w-5 h-5" />
                        <span>Export CSV</span>
                    </button>
                    <button
                        onClick={() => setShowFetchModal(true)}
                        className="btn-primary flex items-center space-x-2"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Fetch New Companies</span>
                    </button>
                </div>
            </div>

            {/* Search */}
            <SearchBar
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search companies by name, industry, or country..."
            />

            {/* Companies Table */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <div className="card overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b dark:border-gray-700">
                                <th className="p-4 w-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length === companiesList.length && companiesList.length > 0}
                                        onChange={handleSelectAll}
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                </th>
                                <th className="text-left p-4 font-semibold">Company Name</th>
                                <th className="text-left p-4 font-semibold">Industry</th>
                                <th className="text-left p-4 font-semibold">Country</th>
                                <th className="text-left p-4 font-semibold">Email</th>
                                <th className="text-left p-4 font-semibold">Phone</th>
                                <th className="text-left p-4 font-semibold">Website</th>
                                <th className="text-left p-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {companiesList.map((company) => (
                                <tr
                                    key={company.id}
                                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                    onClick={(e) => {
                                        // Prevent opening modal if clicking checkbox or link
                                        if ((e.target as HTMLElement).closest('input[type="checkbox"]') || (e.target as HTMLElement).closest('a')) {
                                            return;
                                        }
                                        handleViewDetails(company.id);
                                    }}
                                >
                                    <td className="p-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(company.id)}
                                            onChange={() => handleSelectOne(company.id)}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                    </td>
                                    <td className="p-4 font-medium">{company.name}</td>
                                    <td className="p-4">{company.industry}</td>
                                    <td className="p-4">{company.country}</td>
                                    <td className="p-4 text-sm">{company.email || '-'}</td>
                                    <td className="p-4 text-sm">{company.phone || '-'}</td>
                                    <td className="p-4 text-sm">
                                        {company.website ? (
                                            <a
                                                href={company.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary-600 hover:underline"
                                            >
                                                Link
                                            </a>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEdit(company);
                                            }}
                                            className="text-green-600 hover:text-green-800 mr-3"
                                        >
                                            Edit
                                        </button>
                                        {/* <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewDetails(company.id);
                                            }}
                                            className="text-blue-600 hover:text-blue-800"
                                        >   
                                            View
                                        </button> */}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {companies?.data && (
                        <Pagination
                            currentPage={companies.data.page}
                            totalPages={companies.data.total_pages}
                            totalItems={companies.data.total}
                            pageSize={companies.data.page_size}
                            onPageChange={setPage}
                        />
                    )}
                </div>
            )}


            {/* Fetch Modal */}
            {
                showFetchModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                            <h2 className="text-2xl font-bold mb-4">Fetch New Companies</h2>
                            <div className="space-y-4">
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
                                    <label className="block text-sm font-medium mb-2">Country</label>
                                    <input
                                        type="text"
                                        value={country}
                                        onChange={(e) => setCountry(e.target.value)}
                                        placeholder="e.g., India"
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Count</label>
                                    <input
                                        type="number"
                                        value={count}
                                        onChange={(e) => setCount(parseInt(e.target.value))}
                                        min="1"
                                        max="50"
                                        className="input"
                                    />
                                </div>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={handleFetch}
                                        disabled={fetchMutation.isPending}
                                        className="btn-primary flex-1 flex items-center justify-center space-x-2"
                                    >
                                        {fetchMutation.isPending ? (
                                            <>
                                                <RefreshCw className="w-5 h-5 animate-spin" />
                                                <span>Fetching...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-5 h-5" />
                                                <span>Fetch Companies</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setShowFetchModal(false)}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Edit Modal */}
            {editingCompany && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <h2 className="text-2xl font-bold mb-4">Edit Company</h2>
                        <form onSubmit={handleUpdateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Company Name</label>
                                <input
                                    type="text"
                                    value={editFormData.name}
                                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Industry</label>
                                    <input
                                        type="text"
                                        value={editFormData.industry}
                                        onChange={e => setEditFormData({ ...editFormData, industry: e.target.value })}
                                        className="input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Country</label>
                                    <input
                                        type="text"
                                        value={editFormData.country}
                                        onChange={e => setEditFormData({ ...editFormData, country: e.target.value })}
                                        className="input"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editFormData.email}
                                    onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Phone</label>
                                <input
                                    type="text"
                                    value={editFormData.phone}
                                    onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Website</label>
                                <input
                                    type="text"
                                    value={editFormData.website}
                                    onChange={e => setEditFormData({ ...editFormData, website: e.target.value })}
                                    className="input"
                                />
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={updateMutation.isPending}
                                    className="btn-primary flex-1"
                                >
                                    {updateMutation.isPending ? 'Updating...' : 'Update'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingCompany(null)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Company Details Modal */}
            {showDetailsModal && selectedCompany && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 my-8">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-2xl font-bold">{selectedCompany.name}</h2>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <h3 className="text-sm font-semibold text-gray-500 mb-1">Industry</h3>
                                <p>{selectedCompany.industry}</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <h3 className="text-sm font-semibold text-gray-500 mb-1">Country</h3>
                                <p>{selectedCompany.country}</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <h3 className="text-sm font-semibold text-gray-500 mb-1">Contact</h3>
                                <p className="text-sm">{selectedCompany.email || 'No Email'}</p>
                                <p className="text-sm">{selectedCompany.phone || 'No Phone'}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Sent Messages</h3>
                                {selectedCompany.messages && selectedCompany.messages.length > 0 ? (
                                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                        {selectedCompany.messages.map((msg: Message) => (
                                            <div key={msg.id} className="p-3 border dark:border-gray-700 rounded-lg text-sm">
                                                <div className="flex justify-between mb-2">
                                                    <span className="font-medium">{msg.type} - {msg.stage}</span>
                                                    <div className="flex items-center space-x-2">
                                                        <span className={`px-2 py-0.5 rounded text-xs ${msg.status === 'SENT' ? 'bg-green-100 text-green-800' :
                                                            msg.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                            {msg.status}
                                                        </span>
                                                        {msg.status !== 'SENT' && (
                                                            <button
                                                                onClick={() => {
                                                                    if (msg.type === 'EMAIL') sendEmailMutation.mutate(msg.id);
                                                                    else sendWhatsAppMutation.mutate(msg.id);
                                                                }}
                                                                disabled={sendEmailMutation.isPending || sendWhatsAppMutation.isPending}
                                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                                title="Send Now"
                                                            >
                                                                <Send className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">
                                                    {new Date(msg.created_at).toLocaleString()}
                                                </p>
                                                <p className="text-gray-800 dark:text-gray-200 line-clamp-2">
                                                    {msg.content}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic">No messages sent yet.</p>
                                )}
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-3">Replies</h3>
                                {selectedCompany.replies && selectedCompany.replies.length > 0 ? (
                                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                        {selectedCompany.replies.map((reply: ReplyTracking) => (
                                            <div key={reply.id} className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg text-sm">
                                                <div className="flex justify-between mb-2">
                                                    <span className="font-medium">{reply.from_email}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(reply.replied_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-gray-800 dark:text-gray-200">
                                                    {reply.reply_content}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic">No replies received yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
