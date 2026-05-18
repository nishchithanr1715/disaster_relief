import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Home, Map, Package, Activity, Bell, MessageSquare, Sun, Moon, XCircle, MapPin } from 'lucide-react';
import useSocket from '../hooks/useSocket';
import { relayOfflineRequest } from '../api/requests';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedRequestForModal, setSelectedRequestForModal] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  // Sync theme class with local storage state
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // P2P Ghost Mesh Network Relay Engine
  useEffect(() => {
    if (!user) return;

    const meshChannel = new BroadcastChannel('reliefsync-ghost-mesh');

    const handleMeshMessage = async (event) => {
      if (event.data && event.data.type === 'OFFLINE_SOS_BROADCAST') {
        const { packet } = event.data;

        // If this node is online, act as a P2P Mesh Gateway!
        if (navigator.onLine) {
          if (user.role === 'VOLUNTEER' || user.role === 'NGO_ADMIN') {
            try {
              const currentHops = packet.hops || 0;
              const currentChain = packet.relayChain || [];
              const myRelaySignature = `${user.name} (${user.role === 'NGO_ADMIN' ? 'NGO' : 'Volunteer'})`;

              await relayOfflineRequest({
                senderName: packet.senderName,
                description: packet.message,
                peopleCount: packet.peopleCount || 1,
                latitude: packet.latitude,
                longitude: packet.longitude,
                urgency: packet.urgency,
                hops: currentHops + 1,
                relayChain: [...currentChain, myRelaySignature]
              });

              // Add a high-visibility real-time mesh notification banner
              setNotifications(prev => [{
                id: Date.now(),
                message: `⚡ Ghost Mesh: Relayed offline SOS from ${packet.senderName} (Hops: ${currentHops + 1}) successfully!`,
                time: new Date().toLocaleTimeString()
              }, ...prev]);
            } catch (err) {
              console.error("Ghost Mesh: Failed to relay packet", err);
            }
          }
        }
      }
    };

    meshChannel.addEventListener('message', handleMeshMessage);

    return () => {
      meshChannel.removeEventListener('message', handleMeshMessage);
      meshChannel.close();
    };
  }, [user]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleNewRequest = (request) => {
      if (user.role === 'NGO_ADMIN' || user.role === 'VOLUNTEER') {
        const victimName = request.victim?.user?.name || request.offlineSenderName || 'A victim';
        setNotifications(prev => [{
          id: Date.now(),
          request: request,
          message: `🚨 New ${request.priority} priority request for ${request.requestType} from ${victimName}`,
          time: new Date().toLocaleTimeString()
        }, ...prev]);
      }
    };

    const handleStatusUpdate = (updatedRequest) => {
      const victimName = updatedRequest.victim?.user?.name || updatedRequest.offlineSenderName || 'Victim';
      const victimUserId = updatedRequest.victim?.userId;
      const updaterName = updatedRequest.updater?.name || 'System';
      const updaterRole = updatedRequest.updater?.role === 'NGO_ADMIN' ? 'NGO' : 'Volunteer';

      let updaterStr = `${updaterName} (${updaterRole})`;
      if (!updatedRequest.updater) updaterStr = 'System';

      let displayMessage = '';

      if (user.id === victimUserId) {
        // Logged-in user is the victim whose request was updated
        displayMessage = `📢 Your request has been updated to ${updatedRequest.status} by ${updaterStr}`;
      } else {
        // Logged-in user is an NGO or Volunteer
        displayMessage = `📢 ${victimName}'s request updated to ${updatedRequest.status} by ${updaterStr}`;
      }

      setNotifications(prev => [{
        id: Date.now(),
        request: updatedRequest,
        message: displayMessage,
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
            {/* Theme Toggle Button */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
              title="Toggle Light/Dark Theme"
            >
              {isDarkMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} />}
            </button>

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
                      <div 
                        key={n.id} 
                        onClick={() => {
                          if (n.request) {
                            setSelectedRequestForModal(n.request);
                            setShowNotifications(false);
                          }
                        }}
                        className="p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col gap-0.5 text-left"
                      >
                        <p className="text-sm text-slate-700 font-medium">{n.message}</p>
                        <p className="text-[10px] text-slate-400">{n.time}</p>
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

      {/* Premium Request Details Global Overlay Modal */}
      {selectedRequestForModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 text-left">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-brand-600 text-white">
              <h3 className="text-lg font-bold flex items-center gap-2">
                🚨 Mission Details
              </h3>
              <button 
                onClick={() => setSelectedRequestForModal(null)} 
                className="hover:bg-white/20 p-1 rounded-lg transition-colors text-white"
              >
                <XCircle size={22} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border 
                  ${selectedRequestForModal.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-100' : 
                    selectedRequestForModal.priority === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                    'bg-blue-50 text-blue-700 border-blue-100'}`}>
                  {selectedRequestForModal.priority} Priority
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Status: <strong className="text-slate-800 uppercase">{selectedRequestForModal.status}</strong>
                </span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl space-y-1">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Request Details</p>
                <p className="text-sm font-bold text-slate-900 capitalize">
                  Type: {selectedRequestForModal.requestType}
                </p>
                <p className="text-sm text-slate-700 italic">
                  "{selectedRequestForModal.description}"
                </p>
                <p className="text-xs text-slate-500">
                  <strong>People Count:</strong> {selectedRequestForModal.peopleCount}
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl space-y-1">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Victim Contact</p>
                <p className="text-sm font-bold text-slate-900">
                  Name: {selectedRequestForModal.victim?.user?.name || selectedRequestForModal.offlineSenderName || 'Victim'}
                </p>
                <p className="text-xs text-slate-600">
                  <strong>Phone:</strong> {selectedRequestForModal.victim?.user?.phone || 'Relayed Via Ghost Mesh'}
                </p>
              </div>

              {selectedRequestForModal.isOfflineRelayed && (
                <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-xl space-y-1">
                  <p className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                    ⚡ Ghost Mesh Relay Route Metrics
                  </p>
                  <p className="text-xs text-indigo-600">
                    <strong>Hops:</strong> {selectedRequestForModal.relayHops} Hops
                  </p>
                  <p className="text-[10px] text-indigo-600 font-mono">
                    <strong>Path:</strong> {selectedRequestForModal.relayChain ? JSON.parse(selectedRequestForModal.relayChain).join(' → ') : 'Direct'}
                  </p>
                </div>
              )}

              <div className="bg-slate-50 p-3.5 rounded-xl flex items-center gap-2">
                <MapPin size={18} className="text-brand-600 shrink-0" />
                <span className="text-xs text-slate-700 font-mono">
                  Coordinates: {selectedRequestForModal.latitude.toFixed(6)}, {selectedRequestForModal.longitude.toFixed(6)}
                </span>
              </div>

              <button 
                onClick={() => {
                  setSelectedRequestForModal(null);
                  if (user.role === 'VOLUNTEER') {
                    navigate('/volunteer/map', { state: { taskId: selectedRequestForModal.id } });
                  }
                }}
                className="w-full btn-primary text-center justify-center flex items-center gap-2 py-2.5 text-sm"
              >
                {user.role === 'VOLUNTEER' ? 'View on Rescue Map' : 'Close Details'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
