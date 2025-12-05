import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Plus, Edit2, Trash2, MessageSquare, Mail, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Template, TemplateCreate } from '../types';

export default function Templates() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [formData, setFormData] = useState<TemplateCreate>({
        name: '',
        type: 'EMAIL',
        subject: '',
        content: '',
        variables: ''
    });

    const queryClient = useQueryClient();

    const { data: templates = [], isLoading } = useQuery({
        queryKey: ['templates'],
        queryFn: () => api.templates.getAll().then(res => res.data)
    });

    const createMutation = useMutation({
        mutationFn: (data: TemplateCreate) => api.templates.create(data),
        onSuccess: () => {
            toast.success('Template created successfully');
            queryClient.invalidateQueries({ queryKey: ['templates'] });
            closeModal();
        },
        onError: () => toast.error('Failed to create template')
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: number; template: TemplateCreate }) =>
            api.templates.update(data.id, data.template),
        onSuccess: () => {
            toast.success('Template updated successfully');
            queryClient.invalidateQueries({ queryKey: ['templates'] });
            closeModal();
        },
        onError: () => toast.error('Failed to update template')
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.templates.delete(id),
        onSuccess: () => {
            toast.success('Template deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['templates'] });
        },
        onError: () => toast.error('Failed to delete template')
    });

    const syncMutation = useMutation({
        mutationFn: () => api.templates.sync(),
        onSuccess: (data: any) => {
            toast.success(data.data.message || 'Templates synced successfully');
            queryClient.invalidateQueries({ queryKey: ['templates'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to sync templates');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingTemplate) {
            updateMutation.mutate({ id: editingTemplate.id, template: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const openCreateModal = () => {
        setEditingTemplate(null);
        setFormData({ name: '', type: 'EMAIL', subject: '', content: '', variables: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (template: Template) => {
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            type: template.type,
            subject: template.subject || '',
            content: template.content,
            variables: template.variables || ''
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTemplate(null);
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this template?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Templates</h1>
                    <p className="text-gray-400">Manage your email and WhatsApp templates</p>
                </div>
            </div>
            <div className="flex space-x-3">
                <button
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                    className="btn-secondary flex items-center space-x-2"
                >
                    <RefreshCw className={`w-5 h-5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                    <span>Sync WhatsApp</span>
                </button>
                <button
                    onClick={openCreateModal}
                    className="btn-primary flex items-center space-x-2"
                >
                    <Plus className="w-5 h-5" />
                    <span>Create Template</span>
                </button>
            </div>


            {
                isLoading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map((template: Template) => (
                            <div key={template.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2 rounded-lg ${template.type === 'EMAIL' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                        {template.type === 'EMAIL' ? <Mail className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                                    </div>
                                    <div className="flex space-x-2">
                                        {template.type !== 'WHATSAPP' && (
                                            <>
                                                <button
                                                    onClick={() => openEditModal(template)}
                                                    className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                                    title="Edit Template"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(template.id)}
                                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                                                    title="Delete Template"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">{template.name}</h3>
                                {template.subject && (
                                    <p className="text-sm text-gray-400 mb-2">Subject: {template.subject}</p>
                                )}
                                <p className="text-sm text-gray-500 line-clamp-3 mb-4">{template.content}</p>
                                <div className="flex flex-wrap gap-2">
                                    {template.type === 'EMAIL' && <span className="text-xs px-2 py-1 bg-slate-700 rounded text-gray-300">Email</span>}
                                    {template.type === 'WHATSAPP' && <span className="text-xs px-2 py-1 bg-slate-700 rounded text-gray-300">WhatsApp</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }

            {
                isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-slate-700">
                                <h2 className="text-xl font-bold text-white">
                                    {editingTemplate ? 'Edit Template' : 'Create Template'}
                                </h2>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as 'EMAIL' | 'WHATSAPP' })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="EMAIL">Email</option>
                                        {/* <option value="WHATSAPP">WhatsApp (Sync only)</option> */}
                                    </select>
                                </div>
                                {formData.type === 'EMAIL' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Subject</label>
                                        <input
                                            type="text"
                                            value={formData.subject}
                                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Content</label>
                                    <textarea
                                        value={formData.content}
                                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 h-48"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Available variables: {'{company_name}'}, {'{industry}'}, {'{country}'}, {'{contact_name}'}
                                    </p>
                                </div>
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary px-6 py-2"
                                    >
                                        {editingTemplate ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
