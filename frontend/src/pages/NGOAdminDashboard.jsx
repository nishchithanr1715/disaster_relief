import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAllRequests, updateRequestStatus } from '../api/requests';
import Layout from '../layouts/Layout';
import DisasterMap from '../components/DisasterMap';
import useSocket from '../hooks/useSocket';
import { 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Map as MapIcon, 
  List, 
  TrendingUp,
  Filter
} from 'lucide-react';

const NGOAdminDashboard = () => {
  const [view, setView] = useState('map'); // 'map' or 'list'
  const queryClient = useQueryClient();
  const socket = useSocket();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['allRequests'],
    queryFn: getAllRequests
  });

  useEffect(() => {
    if (socket) {
      socket.on('new_help_request', (newRequest) => {
        queryClient.setQueryData(['allRequests'], (oldData) => {
          return [newRequest, ...(oldData || [])];
        });
        // Could add a toast notification here
      });

      socket.on('request_status_updated', (updatedRequest) => {
        queryClient.setQueryData(['allRequests'], (oldData) => {
          return oldData?.map(r => r.id === updatedRequest.id ? updatedRequest : r);
        });
      });
    }
  }, [socket, queryClient]);

  const stats = {
    total: requests?.length || 0,
    pending: requests?.filter(r => r.status === 'PENDING').length || 0,
    critical: requests?.filter(r => r.priority === 'CRITICAL').length || 0,
    resolved: requests?.filter(r => r.status === 'RESOLVED').length || 0,
  };

  const StatCard = ({ label, value, icon, color }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operations Control Center</h1>
          <p className="text-slate-500">Real-time monitoring and coordination of relief efforts</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-start">
          <button 
            onClick={() => setView('map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
              ${view === 'map' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <MapIcon size={18} />
            Map View
          </button>
          <button 
            onClick={() => setView('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
              ${view === 'list' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <List size={18} />
            List View
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          label="Total Requests" 
          value={stats.total} 
          icon={<Users size={24} />} 
          color="bg-blue-50 text-blue-600" 
        />
        <StatCard 
          label="Pending Help" 
          value={stats.pending} 
          icon={<Clock size={24} />} 
          color="bg-amber-50 text-amber-600" 
        />
        <StatCard 
          label="Critical Cases" 
          value={stats.critical} 
          icon={<AlertCircle size={24} />} 
          color="bg-red-50 text-red-600" 
        />
        <StatCard 
          label="Resolved" 
          value={stats.resolved} 
          icon={<CheckCircle2 size={24} />} 
          color="bg-green-50 text-green-600" 
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        {isLoading ? (
          <div className="h-[500px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
          </div>
        ) : view === 'map' ? (
          <div className="h-[600px]">
            <DisasterMap requests={requests} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Victim</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Request</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests?.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{request.victim?.user?.name}</p>
                      <p className="text-xs text-slate-500">{request.victim?.user?.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900 capitalize">{request.requestType}</p>
                      <p className="text-xs text-slate-500 truncate max-w-xs">{request.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border
                        ${request.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-100' : 
                          request.priority === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                          'bg-blue-50 text-blue-700 border-blue-100'}`}>
                        {request.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-700">{request.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        className="text-xs border rounded p-1"
                        value={request.status}
                        onChange={async (e) => {
                          await updateRequestStatus(request.id, { status: e.target.value });
                          queryClient.invalidateQueries(['allRequests']);
                        }}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="ASSIGNED">Assigned</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default NGOAdminDashboard;
