import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Routes, Route } from 'react-router-dom';
import { getAllRequests, updateRequestStatus } from '../api/requests';
import Layout from '../layouts/Layout';
import DisasterMap from '../components/DisasterMap';
import ChatBox from '../components/ChatBox';
import useSocket from '../hooks/useSocket';
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Navigation,
  AlertTriangle,
  UserCheck,
  Bell
} from 'lucide-react';

const VolunteerDashboard = () => {
  const queryClient = useQueryClient();
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['allRequests'],
    queryFn: getAllRequests
  });

  useEffect(() => {
    if (socket) {
      const handleNewRequest = (request) => {
        queryClient.invalidateQueries(['allRequests']);
        const message = `New ${request.priority} priority ${request.requestType} request nearby.`;
        setNotifications(prev => [{ id: Date.now(), message }, ...prev]);
        setTimeout(() => setNotifications(prev => prev.slice(1)), 5000);
      };

      const handleStatusUpdate = (request) => {
        queryClient.invalidateQueries(['allRequests']);
        // Only notify if it's not the volunteer themselves making the change? 
        // We can just show an info notification.
        if (request.status === 'RESOLVED') {
          const message = `A ${request.requestType} request was marked as resolved.`;
          setNotifications(prev => [{ id: Date.now(), message }, ...prev]);
          setTimeout(() => setNotifications(prev => prev.slice(1)), 5000);
        }
      };

      socket.on('new_help_request', handleNewRequest);
      socket.on('request_status_updated', handleStatusUpdate);

      return () => {
        socket.off('new_help_request', handleNewRequest);
        socket.off('request_status_updated', handleStatusUpdate);
      };
    }
  }, [socket, queryClient]);

  const acceptMutation = useMutation({
    mutationFn: (id) => updateRequestStatus(id, { status: 'IN_PROGRESS', remarks: 'Accepted by volunteer' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['allRequests']);
    }
  });

  const resolveMutation = useMutation({
    mutationFn: (id) => updateRequestStatus(id, { status: 'RESOLVED', remarks: 'Relief delivered' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['allRequests']);
    }
  });

  const pendingRequests = requests?.filter(r => ['PENDING', 'ASSIGNED'].includes(r.status)) || [];
  const myTasks = requests?.filter(r => r.status === 'IN_PROGRESS') || []; // In a real app, filter by volunteerId

  return (
    <Layout>
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2">
          {notifications.map(notif => (
            <div key={notif.id} className="bg-brand-600 text-white p-4 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-right max-w-sm">
              <Bell size={20} className="animate-pulse" />
              <p className="font-medium text-sm">{notif.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Volunteer Mission Control</h1>
        <p className="text-slate-500">View nearby requests and manage your active missions</p>
      </div>

      <Routes>
        <Route path="map" element={
          <div className="h-[600px] w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="text-brand-600" size={20} />
              Live Disaster Map
            </h2>
            <div className="h-[500px]">
              <DisasterMap requests={pendingRequests} />
            </div>
          </div>
        } />
        <Route path="chat" element={
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Command Center Chat</h2>
            <ChatBox />
          </div>
        } />
        <Route index element={
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Active Missions */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Navigation className="text-brand-600" size={20} />
                Active Missions ({myTasks.length})
              </h2>
              {myTasks.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center text-slate-500">
                  No active missions. Accept a request to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {myTasks.map(task => (
                    <div key={task.id} className="bg-brand-600 text-white p-6 rounded-2xl shadow-lg shadow-brand-500/20">
                      <div className="flex justify-between items-start mb-4">
                        <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                          {task.priority} Priority
                        </span>
                        <Clock size={18} className="opacity-60" />
                      </div>
                      <h3 className="text-xl font-bold mb-1 capitalize">{task.requestType} Needed</h3>
                      <p className="text-white/80 text-sm mb-4 line-clamp-2">{task.description}</p>
                      
                      <div className="flex items-center gap-2 text-sm mb-6 bg-black/10 p-3 rounded-lg">
                        <MapPin size={16} />
                        <span>Lat: {task.latitude}, Lng: {task.longitude}</span>
                      </div>
                      
                      <button 
                        onClick={() => resolveMutation.mutate(task.id)}
                        disabled={resolveMutation.isPending}
                        className="w-full bg-white text-brand-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={20} />
                        {resolveMutation.isPending ? 'Processing...' : 'Mark as Resolved'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Requests */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={20} />
                Open Requests ({pendingRequests.length})
              </h2>
              {isLoading ? (
                <div className="flex justify-center py-12">
                   <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500"></div>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 italic">
                  All requests are currently being handled.
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map(request => (
                    <div key={request.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 transition-all">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border
                          ${request.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-100' : 
                            request.priority === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                            'bg-blue-50 text-blue-700 border-blue-100'}`}>
                          {request.priority}
                        </span>
                        <span className="text-xs text-slate-400 capitalize">{request.requestType} • {request.peopleCount} people</span>
                      </div>
                      <p className="text-slate-700 text-sm font-medium mb-4">{request.description}</p>
                      <button 
                        onClick={() => acceptMutation.mutate(request.id)}
                        disabled={acceptMutation.isPending}
                        className="w-full btn-secondary text-brand-600 border-brand-200 hover:bg-brand-50 flex items-center justify-center gap-2"
                      >
                        <UserCheck size={18} />
                        {acceptMutation.isPending ? 'Accepting...' : 'Accept Mission'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        } />
      </Routes>
    </Layout>
  );
};

export default VolunteerDashboard;
