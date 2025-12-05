import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Ban, Mail, Phone, MessageSquare } from 'lucide-react';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';

export default function Stopped() {
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);

    const { data: stoppedData, isLoading } = useQuery({
        queryKey: ['stopped-companies', page, searchTerm],
        queryFn: () => api.leads.stopped({ page, page_size: 20, search: searchTerm || undefined }).then(res => res.data)
    });

    const stoppedCompanies = stoppedData?.items || [];

    const handleSearchChange = (newSearch: string) => {
        setSearchTerm(newSearch);
        setPage(1);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Stopped Companies</h1>
                <p className="text-gray-400">Companies that will no longer receive automated messages ({stoppedData?.total || 0})</p>
            </div>

            <SearchBar
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search stopped companies..."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full text-center py-12 text-gray-500">Loading stopped companies...</div>
                ) : stoppedCompanies.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
                        No stopped companies found.
                    </div>
                ) : (
                    stoppedCompanies.map((company: any) => (
                        <div key={company.company_id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 relative overflow-hidden group hover:border-slate-600 transition-colors">
                            <div className="absolute top-0 right-0 p-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${company.reason === 'Replied'
                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                    {company.reason === 'Replied' ? <MessageSquare className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                                    {company.reason}
                                </span>
                            </div>

                            <h3 className="text-lg font-semibold text-white mb-1 pr-20">{company.company_name}</h3>

                            <div className="space-y-2 mt-4">
                                {company.email && (
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <Mail className="w-4 h-4 text-gray-500" />
                                        {company.email}
                                    </div>
                                )}
                                {company.phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <Phone className="w-4 h-4 text-gray-500" />
                                        {company.phone}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {stoppedData && (
                <Pagination
                    currentPage={stoppedData.page}
                    totalPages={stoppedData.total_pages}
                    totalItems={stoppedData.total}
                    pageSize={stoppedData.page_size}
                    onPageChange={setPage}
                />
            )}
        </div>
    );
}
