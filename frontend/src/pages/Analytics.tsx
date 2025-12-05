import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar
} from 'recharts';
import { TrendingUp, Users, Mail, MessageSquare } from 'lucide-react';

export default function Analytics() {
    const { data: stats } = useQuery({
        queryKey: ['automation-stats'],
        queryFn: () => api.automation.getStats().then(res => res.data)
    });

    const { data: chartData = [] } = useQuery({
        queryKey: ['chart-data'],
        queryFn: () => api.automation.getChartData().then(res => res.data),
        refetchInterval: 60000, // Refresh every minute
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Analytics</h1>
                <p className="text-gray-400">Deep dive into your outreach performance</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg">
                            <Mail className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">+12%</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{stats?.messages_sent || 0}</div>
                    <div className="text-sm text-gray-400">Total Messages Sent</div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-500/20 text-green-400 rounded-lg">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">+5%</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{stats?.total_replies || 0}</div>
                    <div className="text-sm text-gray-400">Total Replies</div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-500/20 text-purple-400 rounded-lg">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                        {stats?.total_companies ? ((stats.total_replies / stats.total_companies) * 100).toFixed(1) : 0}%
                    </div>
                    <div className="text-sm text-gray-400">Reply Rate</div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-orange-500/20 text-orange-400 rounded-lg">
                            <Users className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{stats?.total_companies || 0}</div>
                    <div className="text-sm text-gray-400">Total Companies</div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-white mb-6">Outreach Activity</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" axisLine={false} tickLine={false} />
                                <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSent)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-white mb-6">Reply Volume</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" axisLine={false} tickLine={false} />
                                <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                    cursor={{ fill: '#334155', opacity: 0.2 }}
                                />
                                <Bar dataKey="replies" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
