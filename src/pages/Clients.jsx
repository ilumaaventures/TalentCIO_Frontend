import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import { Users, Plus, MoreVertical } from 'lucide-react';
import { createCachePayload, isCacheFresh, readSessionCache } from '../utils/cache';
import Skeleton from '../components/Skeleton';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import ClientForm from './ClientForm';

const Clients = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const canCreate = user?.roles?.includes('Admin') || user?.permissions?.includes('client.create');
    const canUpdate = user?.roles?.includes('Admin') || user?.permissions?.includes('client.update');
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeDropdownId, setActiveDropdownId] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState(null);
    const initialFetchDoneRef = useRef(false);
    const CLIENT_CACHE_TTL_MS = 45 * 1000;
    const cacheKey = `client_data_${user?._id}`;

    useEffect(() => {
        const handleOutsideClick = () => setActiveDropdownId(null);
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, []);

    const fetchData = useCallback(async ({ force = false } = {}) => {
        try {
            const cachedData = readSessionCache(cacheKey);

            if (cachedData) {
                const data = cachedData.data || cachedData;
                setClients(data.clients || []);
                setLoading(false);
                if (!force && isCacheFresh(cachedData, CLIENT_CACHE_TTL_MS)) return;
            }

            const clientsRes = await api.get('/projects/clients');
            const clientData = clientsRes.data || [];

            const newFingerprint = JSON.stringify({ c: clientData.length, first: clientData[0]?._id });
            const oldFingerprint = cachedData?.fingerprint || null;

            setClients(clientData);

            if (newFingerprint !== oldFingerprint || force) {
                const minimalClients = clientData.map(c => ({
                    _id: c._id,
                    name: c.name,
                    companyName: c.companyName,
                    email: c.email,
                    status: c.status || 'Active',
                    businessUnit: c.businessUnit ? { _id: c.businessUnit._id, name: c.businessUnit.name } : null
                }));

                const payload = createCachePayload({
                    clients: minimalClients
                }, newFingerprint);
                sessionStorage.setItem(cacheKey, JSON.stringify(payload));
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [CLIENT_CACHE_TTL_MS, cacheKey]);

    const handleToggleStatus = async (client) => {
        const newStatus = client.status === 'Inactive' ? 'Active' : 'Inactive';
        const loadingToast = toast.loading(`Updating status for ${client.name}...`);
        try {
            await api.put(`/projects/clients/${client._id}`, {
                ...client,
                status: newStatus
            });
            toast.success(`Client ${client.name} is now ${newStatus.toLowerCase()}`, { id: loadingToast });
            
            // Invalidate cache and refetch
            sessionStorage.removeItem(cacheKey);
            fetchData({ force: true });
        } catch (error) {
            console.error(error);
            toast.error('Failed to update status', { id: loadingToast });
        }
    };

    useEffect(() => {
        if (initialFetchDoneRef.current) return;
        initialFetchDoneRef.current = true;
        fetchData();
    }, [fetchData]);



    if (loading) return (
        <div className="min-h-screen bg-slate-100 font-sans p-6 md:p-10">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-32 rounded-lg" />
                </div>
                <div className="bg-white rounded-xl shadow-sm overflow-visible">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                {['#', 'Client Name', 'Company Name', 'Business Unit', 'Email', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left">
                                        <Skeleton className="h-3 w-20" />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2, 3, 4, 5].map(i => (
                                <tr key={i} className="border-b border-slate-50">
                                    {[1, 2, 3, 4, 5, 6, 7].map(j => (
                                        <td key={j} className="px-4 py-3">
                                            <Skeleton className="h-4 w-full" />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-100 font-sans p-6 md:p-10">
            <div className="max-w-6xl mx-auto space-y-6">

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Clients</h1>
                        <p className="text-sm text-slate-500">External customers and partners</p>
                    </div>
                    {canCreate && (
                        <button
                             onClick={() => {
                                 setSelectedClientId(null);
                                 setIsFormOpen(true);
                             }}
                             className="flex items-center space-x-2 zoho-btn-primary"
                        >
                            <Plus size={18} />
                            <span>Add Client</span>
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-sm overflow-visible">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">#</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Business Unit</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {clients.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                                        No clients found.
                                    </td>
                                </tr>
                            ) : (
                                clients.map((client, index) => (
                                    <tr key={client._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 text-slate-400 font-medium">{index + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center space-x-3">
                                                <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <Users size={16} />
                                                </div>
                                                <span className="font-semibold text-slate-800">{client.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{client.companyName || <span className="text-slate-300">—</span>}</td>
                                        <td className="px-4 py-3">
                                            {client.businessUnit?.name
                                                ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{client.businessUnit.name}</span>
                                                : <span className="text-slate-300">—</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{client.email || <span className="text-slate-300">—</span>}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                                                client.status === 'Inactive'
                                                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                                                    : 'bg-green-50 text-green-700 border-green-200'
                                            }`}>
                                                {client.status || 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 relative">
                                            <div className="flex items-center justify-start">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveDropdownId(activeDropdownId === client._id ? null : client._id);
                                                    }}
                                                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                                {activeDropdownId === client._id && (
                                                    <div className="absolute right-4 mt-2 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10 text-left">
                                                        <button
                                                            onClick={() => navigate(`/clients/${client._id}/view`)}
                                                            className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center"
                                                        >
                                                            View Details
                                                        </button>
                                                        {canUpdate && (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedClientId(client._id);
                                                                        setIsFormOpen(true);
                                                                        setActiveDropdownId(null);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveDropdownId(null);
                                                                        handleToggleStatus(client);
                                                                    }}
                                                                    className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 flex items-center ${
                                                                        client.status === 'Inactive' ? 'text-green-600' : 'text-red-600'
                                                                    }`}
                                                                >
                                                                    {client.status === 'Inactive' ? 'Mark as Active' : 'Mark as Inactive'}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <ClientForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                clientId={selectedClientId}
                onSuccess={() => fetchData({ force: true })}
            />
        </div>
    );
};

export default Clients;
