import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getResources, addResource, updateResource } from '../api/resources';
import Layout from '../layouts/Layout';
import { Plus, Package, Edit2, Save, X, TrendingUp, AlertTriangle } from 'lucide-react';

const ResourceManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [formData, setFormData] = useState({
    resourceType: '',
    quantityAvailable: '',
    unit: '',
    location: ''
  });

  const queryClient = useQueryClient();

  const { data: resources, isLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: getResources
  });

  const addMutation = useMutation({
    mutationFn: addResource,
    onSuccess: () => {
      queryClient.invalidateQueries(['resources']);
      setShowForm(false);
      setFormData({ resourceType: '', quantityAvailable: '', unit: '', location: '' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, quantity }) => updateResource(id, { quantityAvailable: quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries(['resources']);
      setEditingId(null);
    }
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    addMutation.mutate(formData);
  };

  const handleUpdateSubmit = (id) => {
    updateMutation.mutate({ id, quantity: editValue });
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Resource Inventory</h1>
          <p className="text-slate-500">Manage and track relief supplies and logistics</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Add Resource
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
             <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Package size={20} /></div>
             <span className="text-sm font-medium text-slate-500">Total Categories</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{resources?.length || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
             <div className="p-2 bg-green-50 text-green-600 rounded-lg"><TrendingUp size={20} /></div>
             <span className="text-sm font-medium text-slate-500">Stock Level</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">Optimal</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
             <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={20} /></div>
             <span className="text-sm font-medium text-slate-500">Low Stock Alerts</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">0</p>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-brand-600 text-white">
                <h3 className="text-xl font-bold">Add New Resource</h3>
                <button onClick={() => setShowForm(false)} className="hover:bg-white/10 p-1 rounded-lg">
                  <X size={24} />
                </button>
             </div>
             <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Resource Type</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Food Packets, Water"
                    value={formData.resourceType}
                    onChange={(e) => setFormData({...formData, resourceType: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      className="input-field"
                      value={formData.quantityAvailable}
                      onChange={(e) => setFormData({...formData, quantityAvailable: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                    <input
                      className="input-field"
                      placeholder="e.g. kg, liters, units"
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Storage Location</label>
                  <input
                    className="input-field"
                    placeholder="Warehouse A, Central Hub..."
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={addMutation.isPending} className="btn-primary flex-1">
                    {addMutation.isPending ? 'Adding...' : 'Add Resource'}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500"></div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Resource</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resources?.map((resource) => (
                <tr key={resource.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{resource.resourceType}</p>
                    <p className="text-xs text-slate-500">ID: {resource.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-6 py-4">
                    {editingId === resource.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className="w-20 px-2 py-1 border rounded text-sm"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                        />
                        <span className="text-xs text-slate-500">{resource.unit}</span>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-slate-700">
                        {resource.quantityAvailable} <span className="text-slate-500 font-normal">{resource.unit}</span>
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{resource.location || 'N/A'}</td>
                  <td className="px-6 py-4 text-right">
                    {editingId === resource.id ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleUpdateSubmit(resource.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <Save size={18} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setEditingId(resource.id);
                          setEditValue(resource.quantityAvailable);
                        }}
                        className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
};

export default ResourceManagement;
