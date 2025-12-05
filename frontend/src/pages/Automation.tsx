import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { AutomationConfig } from '../types';
import {
    Play,
    Pause,
    Plus,
    Settings,
    Clock,
    Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Automation() {
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newConfig, setNewConfig] = useState({
        industry: '',
        country: '',
        daily_limit: 30,
        send_time_hour: 10,
        followup_day_1: 3,
        followup_day_2: 7
    });

    const { data: configs = [] } = useQuery({
        queryKey: ['automation-configs'],
        queryFn: () => api.automation.getConfigs().then(res => res.data)
    });

    // const { data: stats } = useQuery({
    //     queryKey: ['automation-stats'],
    //     queryFn: () => api.automation.getStats().then(res => res.data)
    // });

    const createConfigMutation = useMutation({
        mutationFn: (data: any) => api.automation.createConfig(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automation-configs'] });
            setShowCreateModal(false);
            toast.success('Automation configuration created');
        },
        onError: () => toast.error('Failed to create configuration')
    });

    const toggleAutomationMutation = useMutation({
        mutationFn: ({ id, action }: { id: number; action: 'start' | 'stop' }) =>
            action === 'start' ? api.automation.start(id) : api.automation.stop(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automation-configs'] });
            toast.success('Automation status updated');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createConfigMutation.mutate(newConfig);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Automation</h1>
                    <p className="text-gray-400">Manage your automated outreach schedules</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Configuration
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                            <Activity className="w-5 h-5" />
                        </div>
                        <span className="text-gray-400 text-sm">Active Configs</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {configs.filter((c: AutomationConfig) => c.is_active).length}
                        <span className="text-sm font-normal text-gray-500 ml-2">/ {configs.length}</span>
                    </div>
                </div>
                {/* Add more stats here if available from API */}
            </div>

            {/* Configs List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {configs.map((config: AutomationConfig) => (
                    <div key={config.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-xl ${config.is_active
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-gray-700/50 text-gray-400'
                                    }`}>
                                    <Settings className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                        {config.industry}
                                        <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-700 text-gray-300">
                                            {config.country}
                                        </span>
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                                        <span className={`w-2 h-2 rounded-full ${config.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
                                        {config.is_active ? 'Running' : 'Paused'}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => toggleAutomationMutation.mutate({
                                    id: config.id,
                                    action: config.is_active ? 'stop' : 'start'
                                })}
                                className={`p-3 rounded-lg transition-colors ${config.is_active
                                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                    : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                    }`}
                            >
                                {config.is_active ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-900/50 p-3 rounded-lg">
                                <div className="text-xs text-gray-500 mb-1">Daily Limit</div>
                                <div className="text-white font-medium">{config.daily_limit} companies</div>
                            </div>
                            <div className="bg-slate-900/50 p-3 rounded-lg">
                                <div className="text-xs text-gray-500 mb-1">Send Time</div>
                                <div className="text-white font-medium">{config.send_time_hour}:00</div>
                            </div>
                            <div className="bg-slate-900/50 p-3 rounded-lg">
                                <div className="text-xs text-gray-500 mb-1">Follow-up 1</div>
                                <div className="text-white font-medium">Day {config.followup_day_1}</div>
                            </div>
                            <div className="bg-slate-900/50 p-3 rounded-lg">
                                <div className="text-xs text-gray-500 mb-1">Follow-up 2</div>
                                <div className="text-white font-medium">Day {config.followup_day_2}</div>
                            </div>
                        </div>

                        {config.last_run_at && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 pt-4 border-t border-slate-700/50">
                                <Clock className="w-3 h-3" />
                                Last run: {new Date(config.last_run_at).toLocaleString()}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-white mb-4">New Automation Config</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Industry</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                                    value={newConfig.industry}
                                    onChange={e => setNewConfig({ ...newConfig, industry: e.target.value })}
                                    placeholder="e.g. Software"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Country</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                                    value={newConfig.country}
                                    onChange={e => setNewConfig({ ...newConfig, country: e.target.value })}
                                    placeholder="e.g. United States"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Daily Limit</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                                        value={newConfig.daily_limit}
                                        onChange={e => setNewConfig({ ...newConfig, daily_limit: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Send Hour (0-23)</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        max="23"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                                        value={newConfig.send_time_hour}
                                        onChange={e => setNewConfig({ ...newConfig, send_time_hour: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                                >
                                    Create Config
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
