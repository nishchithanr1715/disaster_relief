import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyRequests, createHelpRequest } from '../api/requests';
import Layout from '../layouts/Layout';
import { Plus, MapPin, Users, AlertTriangle, Clock, CheckCircle2, XCircle, Activity } from 'lucide-react';

const VictimDashboard = () => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    requestType: 'rescue',
    description: '',
    peopleCount: 1,
    latitude: 0,
    longitude: 0,
    urgency: 'medium'
  });

  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['myRequests'],
    queryFn: getMyRequests
  });

  const createMutation = useMutation({
    mutationFn: createHelpRequest,
    onSuccess: () => {
      queryClient.invalidateQueries(['myRequests']);
      setShowForm(false);
      setFormData({
        requestType: 'rescue',
        description: '',
        peopleCount: 1,
        latitude: 0,
        longitude: 0,
        urgency: 'medium'
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app, we'd use geolocation
    // For demo, we'll use random coords if not provided
    const payload = {
      ...formData,
      latitude: formData.latitude || (Math.random() * 0.1 + 12.97).toFixed(6),
      longitude: formData.longitude || (Math.random() * 0.1 + 77.59).toFixed(6)
    };
    createMutation.mutate(payload);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return <Clock className="text-amber-500" size={18} />;
      case 'ASSIGNED': return <CheckCircle2 className="text-blue-500" size={18} />;
      case 'IN_PROGRESS': return <Activity className="text-indigo-500" size={18} />;
      case 'RESOLVED': return <CheckCircle2 className="text-green-500" size={18} />;
      default: return <XCircle className="text-slate-400" size={18} />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIUM': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your Help Requests</h1>
          <p className="text-slate-500">Track and manage your requests for assistance</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          New Request
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-brand-600 text-white">
              <h3 className="text-xl font-bold">Request Assistance</h3>
              <button onClick={() => setShowForm(false)} className="hover:bg-white/10 p-1 rounded-lg">
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type of Assistance</label>
                <select
                  className="input-field"
                  value={formData.requestType}
                  onChange={(e) => setFormData({...formData, requestType: e.target.value})}
                >
                  <option value="rescue">Rescue / Evacuation</option>
                  <option value="medical">Medical Emergency</option>
                  <option value="food">Food & Water</option>
                  <option value="shelter">Emergency Shelter</option>
                  <option value="other">Other Supplies</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Number of People</label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  value={formData.peopleCount}
                  onChange={(e) => setFormData({...formData, peopleCount: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Urgency Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['low', 'medium', 'immediate'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData({...formData, urgency: level})}
                      className={`py-2 px-3 rounded-lg border-2 text-sm font-bold capitalize transition-all
                        ${formData.urgency === level 
                          ? 'border-brand-500 bg-brand-50 text-brand-700' 
                          : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description & Details</label>
                <textarea
                  className="input-field min-h-[100px]"
                  placeholder="Describe your situation, specific needs, and any landmarks..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
        </div>
      ) : requests?.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No requests yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-2">
            If you need help with food, medical aid, or rescue, click the "New Request" button above.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests?.map((request) => (
            <div key={request.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getPriorityColor(request.priority)}`}>
                      {request.priority}
                    </span>
                    <span className="text-slate-400 text-xs flex items-center gap-1">
                      <Clock size={14} />
                      {new Date(request.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 capitalize flex items-center gap-2">
                    {request.requestType} Help
                    <span className="text-slate-400 font-normal text-sm flex items-center gap-1">
                      <Users size={14} /> {request.peopleCount} {request.peopleCount === 1 ? 'person' : 'people'}
                    </span>
                  </h3>
                  <p className="text-slate-600 mt-1 line-clamp-2">{request.description}</p>
                </div>
                
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-500 font-medium">Status</p>
                    <p className="font-bold text-slate-900">{request.status}</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100">
                    {getStatusIcon(request.status)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default VictimDashboard;
