import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Home, Map, Package, Activity, Bell, MessageSquare } from 'lucide-react';
import useSocket from '../hooks/useSocket';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleNewRequest = (request) => {
      if (user.role === 'NGO_ADMIN' || user.role === 'VOLUNTEER') {
        setNotifications(prev => [{
          id: Date.now(),
          message: `New ${request.priority} priority request for ${request.requestType}`,
          time: new Date().toLocaleTimeString()
        }, ...prev]);
      }
    };

    const handleStatusUpdate = (updatedRequest) => {
      setNotifications(prev => [{
        id: Date.now(),
        message: `Request status updated to ${updatedRequest.status}`,
        time: new Date().toLocaleTimeString()
      }, ...prev]);
    };

    socket.on('new_help_request', handleNewRequest);
    socket.on('request_status_updated', handleStatusUpdate);

    return () => {
      socket.off('new_help_request', handleNewRequest);
      socket.off('request_status_updated', handleStatusUpdate);
    };
  }, [socket, user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = {
    VICTIM: [
      { label: 'My Requests', path: '/victim', icon: <Home size={20} /> },
    ],
    VOLUNTEER: [
      { label: 'Tasks', path: '/volunteer', icon: <Activity size={20} /> },
      { label: 'Map', path: '/volunteer/map', icon: <Map size={20} /> },
      { label: 'Live Chat', path: '/volunteer/chat', icon: <MessageSquare size={20} /> },
    ],
    NGO_ADMIN: [
      { label: 'Dashboard', path: '/admin', icon: <Home size={20} /> },
      { label: 'Resources', path: '/admin/resources', icon: <Package size={20} /> },
      { label: 'Live Chat', path: '/admin/chat', icon: <MessageSquare size={20} /> },
    ],
  };

  const items = navItems[user?.role] || [];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 text-brand-600 font-bold text-xl">
            <div className="bg-brand-600 text-white p-1.5 rounded-lg">
              <Activity size={24} />
            </div>
            ReliefSync
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-brand-600 rounded-xl transition-all duration-200"
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">
              {user?.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-bold text-slate-900 md:block hidden">
            {items.find(i => window.location.pathname === i.path)?.label || 'Overview'}
          </h2>
          <div className="flex md:hidden items-center gap-3 text-brand-600 font-bold text-lg">
             <Activity size={20} />
             ReliefSync
          </div>
          
          <div className="flex items-center gap-4 relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all relative"
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <>
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </>
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-12 right-0 md:right-12 w-80 bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                  {notifications.length > 0 && (
                    <button onClick={() => setNotifications([])} className="text-xs text-brand-600 hover:underline">Clear all</button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">No new notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <p className="text-sm text-slate-700">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{n.time}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="md:hidden">
               <button onClick={handleLogout} className="p-2 text-red-500">
                 <LogOut size={20} />
               </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
