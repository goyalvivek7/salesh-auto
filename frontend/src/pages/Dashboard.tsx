import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { BarChart3, Users, Mail, TrendingUp, MessageSquare, CheckCircle, ArrowUp, ArrowDown } from 'lucide-react';
import type { AutomationStats } from '../types';

export default function Dashboard() {
    const { data: stats, isLoading } = useQuery<{ data: AutomationStats }>({
        queryKey: ['automation-stats'],
        queryFn: () => api.automation.getStats(),
        refetchInterval: 30000,
    });

    const metrics = [
        {
            name: 'Total Companies',
            value: stats?.data.total_companies || 0,
            icon: Users,
            gradient: 'from-blue-500 to-blue-600',
            iconBg: 'bg-blue-500',
            trend: '+12%',
            trendUp: true,
        },
        {
            name: 'Active Campaigns',
            value: stats?.data.total_campaigns || 0,
            icon: Mail,
            gradient: 'from-purple-500 to-purple-600',
            iconBg: 'bg-purple-500',
            trend: '+8%',
            trendUp: true,
        },
        {
            name: 'Messages Sent',
            value: stats?.data.messages_sent || 0,
            icon: MessageSquare,
            gradient: 'from-green-500 to-green-600',
            iconBg: 'bg-green-500',
            trend: '+23%',
            trendUp: true,
        },
        {
            name: 'Messages Scheduled',
            value: stats?.data.messages_scheduled || 0,
            icon: BarChart3,
            gradient: 'from-yellow-500 to-yellow-600',
            iconBg: 'bg-yellow-500',
            trend: '+5%',
            trendUp: true,
        },
        {
            name: 'Email Opens',
            value: stats?.data.email_opens || 0,
            icon: CheckCircle,
            gradient: 'from-indigo-500 to-indigo-600',
            iconBg: 'bg-indigo-500',
            trend: '+15%',
            trendUp: true,
        },
        {
            name: 'Qualified Leads',
            value: stats?.data.total_qualified_leads || 0,
            icon: TrendingUp,
            gradient: 'from-pink-500 to-pink-600',
            iconBg: 'bg-pink-500',
            trend: '+31%',
            trendUp: true,
        },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200"></div>
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary-600 absolute top-0"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-white shadow-xl">
                <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
                <p className="text-primary-100 text-lg">
                    Welcome back! Here's what's happening with your sales automation.
                </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {metrics.map((metric, index) => {
                    const Icon = metric.icon;
                    return (
                        <div
                            key={metric.name}
                            className="relative group bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            {/* Gradient background */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-5 group-hover:opacity-10 transition-opacity`}></div>

                            <div className="relative p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`${metric.iconBg} p-3 rounded-xl shadow-lg transform group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className={`flex items-center space-x-1 text-sm font-semibold ${metric.trendUp ? 'text-green-500' : 'text-red-500'}`}>
                                        {metric.trendUp ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                                        <span>{metric.trend}</span>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">
                                    {metric.name}
                                </p>
                                <p className="text-4xl font-bold text-gray-900 dark:text-white">
                                    {metric.value.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Stats Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Reply Statistics */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold">Reply Statistics</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Last 7 Days</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {stats?.data.replies_last_7_days || 0}
                                </p>
                            </div>
                            <div className="text-green-500 font-semibold text-sm flex items-center">
                                <ArrowUp className="w-4 h-4 mr-1" />
                                +12%
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Last 30 Days</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {stats?.data.replies_last_30_days || 0}
                                </p>
                            </div>
                            <div className="text-green-500 font-semibold text-sm flex items-center">
                                <ArrowUp className="w-4 h-4 mr-1" />
                                +18%
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border-2 border-green-500 dark:border-green-400">
                            <div>
                                <p className="text-sm text-green-700 dark:text-green-300 font-medium">All Time</p>
                                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                    {stats?.data.total_replies || 0}
                                </p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                    </div>
                </div>

                {/* Unsubscribe Statistics */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-lg">
                            <Mail className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <h2 className="text-2xl font-bold">Unsubscribe Statistics</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Last 7 Days</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {stats?.data.unsubscribed_last_7_days || 0}
                                </p>
                            </div>
                            <div className="text-orange-500 font-semibold text-sm">
                                {stats?.data.unsubscribed_last_7_days || 0} people
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Last 30 Days</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {stats?.data.unsubscribed_last_30_days || 0}
                                </p>
                            </div>
                            <div className="text-orange-500 font-semibold text-sm">
                                {stats?.data.unsubscribed_last_30_days || 0} people
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border-2 border-orange-500 dark:border-orange-400">
                            <div>
                                <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">All Time</p>
                                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                                    {stats?.data.total_unsubscribed || 0}
                                </p>
                            </div>
                            <div className="text-orange-600 dark:text-orange-400 font-semibold">
                                {((stats?.data.total_unsubscribed || 0) / Math.max((stats?.data.total_companies || 1), 1) * 100).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
