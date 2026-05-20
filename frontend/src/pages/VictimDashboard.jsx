import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyRequests, createHelpRequest } from '../api/requests';
import Layout from '../layouts/Layout';
import useSocket from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import { Plus, MapPin, Users, AlertTriangle, Clock, CheckCircle2, XCircle, Activity, Bell, WifiOff, AlertOctagon, Sun, CloudRain, CloudLightning, Wind, Thermometer } from 'lucide-react';

const VictimDashboard = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    requestType: 'rescue',
    description: '',
    peopleCount: 1,
    latitude: '',
    longitude: '',
    urgency: 'medium'
  });

  const queryClient = useQueryClient();
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [isSimOffline, setIsSimOffline] = useState(() => {
    return localStorage.getItem('reliefsync_sim_offline') === 'true';
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setIsSimOffline(localStorage.getItem('reliefsync_sim_offline') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (!isSimOffline && navigator.onLine) {
      syncOfflineRequests();
    }
  }, [isSimOffline]);

  // Alert/Weather state variables
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertDescription, setAlertDescription] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherAlert, setWeatherAlert] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setNotifications(prev => prev.slice(0, -1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  // Fetch local weather updates dynamically and trigger auto-alerts for extreme conditions
  useEffect(() => {
    const fetchWeather = async () => {
      setWeatherLoading(true);
      try {
        let lat = 12.5218; // Default Mandya
        let lng = 76.8951;
        const cached = localStorage.getItem('reliefsync_last_location');
        if (cached) {
          const parsed = JSON.parse(cached);
          lat = parseFloat(parsed.lat) || lat;
          lng = parseFloat(parsed.lng) || lng;
        }

        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
        if (!res.ok) throw new Error("Failed to fetch weather");
        const data = await res.json();

        if (data && data.current_weather) {
          const current = data.current_weather;
          setWeatherData({
            temp: current.temperature,
            wind: current.windspeed,
            code: current.weathercode,
            time: current.time
          });

          // Check for extreme weather codes (Moderate/Heavy rain, violent rain showers, thunderstorms)
          const extremeCodes = [63, 65, 81, 82, 95, 96, 99];
          if (extremeCodes.includes(current.weathercode)) {
            const warningText = `Severe weather warning (WMO Code ${current.weathercode}) detected in your sector! Expect flash flood/lightning hazards. Stay clear of low ground.`;
            setWeatherAlert(warningText);

            // Auto-send alert logic (throttle to once every 30 minutes)
            const lastSent = localStorage.getItem('last_auto_weather_alert_time');
            const now = Date.now();
            if (!lastSent || now - parseInt(lastSent) > 30 * 60 * 1000) {
              triggerAutomaticWeatherAlert(lat, lng, current.weathercode, current.temperature);
              localStorage.setItem('last_auto_weather_alert_time', now.toString());
            }
          } else {
            setWeatherAlert(null);
          }
        }
      } catch (err) {
        console.error("Error fetching weather status:", err);
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 5 * 60 * 1000); // Check weather every 5 minutes
    return () => clearInterval(interval);
  }, [socket]);

  const triggerAutomaticWeatherAlert = (lat, lng, weatherCode, temp) => {
    const baseMessage = `AUTOMATIC WEATHER ALERT: Extreme atmospheric hazard (WMO Code ${weatherCode}, ${temp}°C) detected in Mandya sector. High risk of flooding/lightning. Rescue operations must be cautious.`;

    const meshPacket = {
      senderName: `WEATHER SYSTEM (AUTO)`,
      message: baseMessage,
      peopleCount: 1,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      urgency: 'immediate',
      hops: 0,
      relayChain: []
    };

    // 1. Broadcast over local tab Ghost Mesh network
    try {
      const meshChannel = new BroadcastChannel('reliefsync-ghost-mesh');
      meshChannel.postMessage({
        type: 'OFFLINE_SOS_BROADCAST',
        packet: meshPacket
      });
      meshChannel.close();
    } catch (e) {
      console.warn("BroadcastChannel auto weather alert error:", e);
    }

    // 2. Broadcast via socket connection
    if (socket) {
      socket.emit('mesh_broadcast_sos', meshPacket);
    }

    // 3. Show notification
    setNotifications(prev => [
      {
        id: Date.now(),
        message: `🚨 Automatic Alert Dispatched: Nearby rescue and volunteers have been alerted to extreme weather in your sector!`,
        time: new Date().toLocaleTimeString()
      },
      ...prev
    ]);
  };

  const handleSendManualAlert = async (e) => {
    e.preventDefault();
    if (!alertDescription.trim()) return;

    let lat = 12.5218; // Default Mandya
    let lng = 76.8951;
    const cached = localStorage.getItem('reliefsync_last_location');
    if (cached) {
      const parsed = JSON.parse(cached);
      lat = parseFloat(parsed.lat) || lat;
      lng = parseFloat(parsed.lng) || lng;
    }

    const payloadMessage = `MANUAL HAZARD ALERT: ${alertDescription}`;

    const meshPacket = {
      senderName: user?.name || 'Victim',
      message: payloadMessage,
      peopleCount: 1,
      latitude: lat,
      longitude: lng,
      urgency: 'immediate',
      hops: 0,
      relayChain: []
    };

    // 1. Send over Local P2P Ghost Mesh Network
    try {
      const meshChannel = new BroadcastChannel('reliefsync-ghost-mesh');
      meshChannel.postMessage({
        type: 'OFFLINE_SOS_BROADCAST',
        packet: meshPacket
      });
      meshChannel.close();
    } catch (err) {
      console.warn("BroadcastChannel error:", err);
    }

    // 2. Send via Socket Connection
    if (socket) {
      socket.emit('mesh_broadcast_sos', meshPacket);
    }

    // 3. Save to database / local offline queue
    if (!navigator.onLine || isSimOffline) {
      const newOfflineReq = {
        id: `offline-${Date.now()}`,
        requestType: 'rescue',
        description: payloadMessage,
        peopleCount: 1,
        latitude: lat,
        longitude: lng,
        priority: 'CRITICAL',
        urgency: 'immediate',
        status: 'OFFLINE_QUEUED',
        createdAt: new Date().toISOString()
      };

      const updatedQueue = [newOfflineReq, ...offlineRequests];
      setOfflineRequests(updatedQueue);
      localStorage.setItem('offline_help_requests', JSON.stringify(updatedQueue));

      setNotifications(prev => [
        {
          id: Date.now(),
          message: `📡 Alert saved offline. Broadcasted to nearby peers!`,
          time: new Date().toLocaleTimeString()
        },
        ...prev
      ]);
    } else {
      try {
        await createHelpRequest({
          requestType: 'rescue',
          description: payloadMessage,
          peopleCount: 1,
          latitude: lat,
          longitude: lng,
          urgency: 'immediate'
        });

        queryClient.invalidateQueries({ queryKey: ['myRequests'] });

        setNotifications(prev => [
          {
            id: Date.now(),
            message: `🚀 Real-time hazard alert successfully broadcasted to all rescue teams!`,
            time: new Date().toLocaleTimeString()
          },
          ...prev
        ]);
      } catch (err) {
        console.error("Failed to submit manual alert online:", err);
      }
    }

    setAlertDescription('');
    setShowAlertForm(false);
  };

  const getWeatherInfo = (code) => {
    if (code === undefined || code === null) return { text: 'Unknown', icon: 'Sun', color: 'text-slate-400', bg: 'bg-slate-50' };
    if (code === 0) return { text: 'Clear Sky', icon: 'Sun', color: 'text-amber-500', bg: 'bg-amber-50/50' };
    if ([1, 2, 3].includes(code)) return { text: 'Partly Cloudy', icon: 'Sun', color: 'text-blue-400', bg: 'bg-blue-50/50' };
    if ([45, 48].includes(code)) return { text: 'Foggy', icon: 'Wind', color: 'text-slate-400', bg: 'bg-slate-50' };
    if ([51, 53, 55, 61].includes(code)) return { text: 'Light Rain', icon: 'CloudRain', color: 'text-sky-500', bg: 'bg-sky-50/50' };
    if ([63, 65, 80, 81, 82].includes(code)) return { text: 'Heavy Rainfall', icon: 'CloudRain', color: 'text-blue-600', bg: 'bg-blue-50/50' };
    if ([95, 96, 99].includes(code)) return { text: 'Severe Thunderstorm', icon: 'CloudLightning', color: 'text-rose-600', bg: 'bg-rose-50/50' };
    return { text: 'Cloudy', icon: 'Sun', color: 'text-slate-400', bg: 'bg-slate-50' };
  };

  const { data: requests, isLoading } = useQuery({
    queryKey: ['myRequests'],
    queryFn: getMyRequests
  });

  const [offlineRequests, setOfflineRequests] = useState(() =>
    JSON.parse(localStorage.getItem('offline_help_requests') || '[]')
  );

  const syncOfflineRequests = async () => {
    const stored = JSON.parse(localStorage.getItem('offline_help_requests') || '[]');
    if (stored.length === 0) return;

    let successCount = 0;
    const remaining = [];

    for (const req of stored) {
      try {
        await createHelpRequest({
          requestType: req.requestType,
          description: req.description,
          peopleCount: parseInt(req.peopleCount),
          latitude: req.latitude,
          longitude: req.longitude,
          urgency: req.urgency,
        });
        successCount++;
      } catch (error) {
        console.error("Failed to sync offline request", error);
        remaining.push(req);
      }
    }

    localStorage.setItem('offline_help_requests', JSON.stringify(remaining));
    setOfflineRequests(remaining);

    if (successCount > 0) {
      queryClient.invalidateQueries(['myRequests']);
      const msg = `⚡ Connection Restored! ${successCount} offline SOS request(s) have been successfully transmitted to rescue teams.`;
      setNotifications(prev => [{ id: Date.now(), message: msg }, ...prev]);
    }
  };

  const handleEmergencySOS = () => {
    const basePayload = {
      requestType: 'rescue',
      description: 'emergency help',
      peopleCount: 1,
      urgency: 'immediate'
    };

    const submitSOS = async (lat, lng) => {
      const payload = {
        ...basePayload,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng)
      };

      const fallbackToOffline = () => {
        const newOfflineReq = {
          id: `offline-${Date.now()}`,
          requestType: payload.requestType,
          description: payload.description,
          peopleCount: payload.peopleCount,
          latitude: payload.latitude,
          longitude: payload.longitude,
          priority: 'CRITICAL',
          urgency: 'immediate',
          status: 'OFFLINE_QUEUED',
          createdAt: new Date().toISOString()
        };

        const updatedQueue = [newOfflineReq, ...offlineRequests];
        setOfflineRequests(updatedQueue);
        localStorage.setItem('offline_help_requests', JSON.stringify(updatedQueue));

        // Broadcast over local P2P Ghost Mesh Network
        try {
          const meshPacket = {
            senderName: user?.name || 'Victim',
            message: payload.description,
            peopleCount: payload.peopleCount,
            latitude: payload.latitude,
            longitude: payload.longitude,
            urgency: payload.urgency,
            hops: 0,
            relayChain: []
          };

          // Local tab broadcast
          const meshChannel = new BroadcastChannel('reliefsync-ghost-mesh');
          meshChannel.postMessage({
            type: 'OFFLINE_SOS_BROADCAST',
            packet: meshPacket
          });
          meshChannel.close();

          // Physical device peer-to-peer radio socket simulation
          if (socket) {
            socket.emit('mesh_broadcast_sos', meshPacket);
          }
        } catch (e) {
          console.error("Failed to broadcast SOS packet", e);
        }

        const msg = "🚨 GHOST NETWORK BROADCAST ACTIVE! Device is offline/unreachable. SOS relayed over local P2P Mesh Network.";
        setNotifications(prev => [{ id: Date.now(), message: msg }, ...prev]);
      };

      if (!navigator.onLine || isSimOffline) {
        fallbackToOffline();
      } else {
        try {
          setIsSubmitting(true);
          await createHelpRequest(payload);
          queryClient.invalidateQueries(['myRequests']);
          const msg = "🚨 Emergency SOS request submitted successfully! Teams are being notified.";
          setNotifications(prev => [{ id: Date.now(), message: msg }, ...prev]);
        } catch (error) {
          console.warn("Online SOS submission failed. Auto falling back to offline Mesh Relay!", error);
          fallbackToOffline();
        } finally {
          setIsSubmitting(false);
        }
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          localStorage.setItem('reliefsync_last_location', JSON.stringify({ lat, lng }));
          submitSOS(lat, lng);
        },
        (error) => {
          console.warn('Geolocation failed for SOS, checking last cached location.');
          const cached = localStorage.getItem('reliefsync_last_location');
          if (cached) {
            const { lat, lng } = JSON.parse(cached);
            submitSOS(lat, lng);
          } else {
            const randomLat = (Math.random() * 0.05 + 12.5218).toFixed(6);
            const randomLng = (Math.random() * 0.05 + 76.8951).toFixed(6);
            submitSOS(randomLat, randomLng);
          }
        },
        { timeout: 5000 }
      );
    } else {
      const cached = localStorage.getItem('reliefsync_last_location');
      if (cached) {
        const { lat, lng } = JSON.parse(cached);
        submitSOS(lat, lng);
      } else {
        const randomLat = (Math.random() * 0.05 + 12.5218).toFixed(6);
        const randomLng = (Math.random() * 0.05 + 76.8951).toFixed(6);
        submitSOS(randomLat, randomLng);
      }
    }
  };

  useEffect(() => {
    // Initial fetch to cache real location coordinates immediately on dashboard open
    let watchId = null;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          localStorage.setItem('reliefsync_last_location', JSON.stringify({ lat, lng }));
        },
        (err) => console.warn("Init location cache deferred:", err.message),
        { enableHighAccuracy: true, timeout: 10000 }
      );

      // Start watching the user's location continuously to always keep the cache updated as they move
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          localStorage.setItem('reliefsync_last_location', JSON.stringify({ lat, lng }));
          console.log("Location watched & updated in cache:", lat, lng);
        },
        (err) => console.warn("Background location tracking failed:", err.message),
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
      );
    }

    window.addEventListener('online', syncOfflineRequests);
    if (navigator.onLine) {
      syncOfflineRequests();
    }
    return () => {
      window.removeEventListener('online', syncOfflineRequests);
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  useEffect(() => {
    if (socket && requests) {
      const handleStatusUpdate = (updatedRequest) => {
        // Check if the updated request belongs to this victim
        const isMyRequest = requests.some(req => req.id === updatedRequest.id);

        if (isMyRequest) {
          queryClient.invalidateQueries(['myRequests']);

          let message = '';
          if (updatedRequest.status === 'IN_PROGRESS') {
            message = `An NGO/Volunteer has accepted your ${updatedRequest.requestType} request and is on their way!`;
          } else if (updatedRequest.status === 'RESOLVED') {
            message = `Your ${updatedRequest.requestType} request has been marked as resolved.`;
          } else {
            message = `Your request status changed to ${updatedRequest.status}.`;
          }

          setNotifications(prev => [{ id: Date.now(), message }, ...prev]);

          // Auto remove notification after 5 seconds
          setTimeout(() => {
            setNotifications(prev => prev.slice(1));
          }, 5000);
        }
      };

      socket.on('request_status_updated', handleStatusUpdate);

      return () => {
        socket.off('request_status_updated', handleStatusUpdate);
      };
    }
  }, [socket, requests, queryClient]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    let finalLat = formData.latitude;
    let finalLng = formData.longitude;

    if (!finalLat || !finalLng) {
      const cached = localStorage.getItem('reliefsync_last_location');
      if (cached) {
        const parsed = JSON.parse(cached);
        finalLat = finalLat || parsed.lat;
        finalLng = finalLng || parsed.lng;
      }
    }

    const payload = {
      ...formData,
      latitude: finalLat ? parseFloat(finalLat) : parseFloat((Math.random() * 0.05 + 12.5218).toFixed(6)),
      longitude: finalLng ? parseFloat(finalLng) : parseFloat((Math.random() * 0.05 + 76.8951).toFixed(6))
    };

    const fallbackToOffline = () => {
      const newOfflineReq = {
        id: `offline-${Date.now()}`,
        requestType: payload.requestType,
        description: payload.description,
        peopleCount: parseInt(payload.peopleCount),
        latitude: payload.latitude,
        longitude: payload.longitude,
        priority: payload.urgency === 'immediate' ? 'CRITICAL' : payload.urgency === 'medium' ? 'HIGH' : 'LOW',
        urgency: payload.urgency,
        status: 'OFFLINE_QUEUED',
        createdAt: new Date().toISOString()
      };

      const updatedQueue = [newOfflineReq, ...offlineRequests];
      setOfflineRequests(updatedQueue);
      localStorage.setItem('offline_help_requests', JSON.stringify(updatedQueue));

      // Broadcast over local P2P Ghost Mesh Network
      try {
        const meshPacket = {
          senderName: user?.name || 'Victim',
          message: payload.description,
          peopleCount: parseInt(payload.peopleCount),
          latitude: payload.latitude,
          longitude: payload.longitude,
          urgency: payload.urgency,
          hops: 0,
          relayChain: []
        };

        // Local tab broadcast
        const meshChannel = new BroadcastChannel('reliefsync-ghost-mesh');
        meshChannel.postMessage({
          type: 'OFFLINE_SOS_BROADCAST',
          packet: meshPacket
        });
        meshChannel.close();

        // Physical device peer-to-peer radio socket simulation
        if (socket) {
          socket.emit('mesh_broadcast_sos', meshPacket);
        }
      } catch (e) {
        console.error("Failed to broadcast SOS packet from New Request", e);
      }

      setShowForm(false);
      setFormData({
        requestType: 'rescue',
        description: '',
        peopleCount: 1,
        latitude: '',
        longitude: '',
        urgency: 'medium'
      });

      const msg = "⚠️ Device is offline/unreachable! SOS saved securely and broadcasted over local P2P Mesh Network.";
      setNotifications(prev => [{ id: Date.now(), message: msg }, ...prev]);
    };

    if (!navigator.onLine || isSimOffline) {
      fallbackToOffline();
    } else {
      try {
        setIsSubmitting(true);
        await createHelpRequest(payload);
        queryClient.invalidateQueries(['myRequests']);
        setShowForm(false);
        setFormData({
          requestType: 'rescue',
          description: '',
          peopleCount: 1,
          latitude: '',
          longitude: '',
          urgency: 'medium'
        });
        const msg = "🚨 Request submitted successfully! Rescue teams are notified.";
        setNotifications(prev => [{ id: Date.now(), message: msg }, ...prev]);
      } catch (error) {
        console.warn("Online submission failed. Auto falling back to offline Mesh Relay!", error);
        fallbackToOffline();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          localStorage.setItem('reliefsync_last_location', JSON.stringify({ lat, lng }));
          setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
          }));
        },
        (error) => {
          alert('Could not fetch location automatically. Please enter coordinates manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return <Clock className="text-amber-500" size={18} />;
      case 'ASSIGNED': return <CheckCircle2 className="text-blue-500" size={18} />;
      case 'IN_PROGRESS': return <Activity className="text-indigo-500" size={18} />;
      case 'RESOLVED': return <CheckCircle2 className="text-green-500" size={18} />;
      case 'OFFLINE_QUEUED': return <WifiOff className="text-rose-500 animate-pulse" size={18} />;
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

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your Help Requests</h1>
          <p className="text-slate-500">Track and manage your requests for assistance</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleEmergencySOS}
            className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-2 animate-pulse hover:animate-none"
            title="Instantly report a life-safety emergency"
          >
            <AlertOctagon size={20} className="animate-spin duration-3000" />
            Emergency Request
          </button>
          <button
            onClick={() => {
              const cached = localStorage.getItem('reliefsync_last_location');
              let lat = '';
              let lng = '';
              if (cached) {
                const parsed = JSON.parse(cached);
                lat = parsed.lat;
                lng = parsed.lng;
              }
              setFormData(prev => ({
                ...prev,
                latitude: lat,
                longitude: lng
              }));
              setShowForm(true);
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <Plus size={20} />
            New Request
          </button>
          <button
            onClick={() => setShowAlertForm(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2"
            title="Broadcast manual weather/hazard alert"
          >
            <Bell size={20} className="animate-bounce" />
            Send Alert
          </button>
        </div>
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
                  onChange={(e) => setFormData({ ...formData, requestType: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, peopleCount: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Urgency Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['low', 'medium', 'immediate'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData({ ...formData, urgency: level })}
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
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="block text-sm font-medium text-slate-700">Location Coordinates</label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    className="text-xs text-brand-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <MapPin size={12} /> Get Current Location
                  </button>
                </div>
                <div className="flex gap-4">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    className="input-field w-1/2"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    className="input-field w-1/2"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  />
                </div>
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
                  disabled={isSubmitting}
                  className="btn-primary flex-1"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAlertForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-amber-500 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Bell size={24} className="animate-bounce" />
                Broadcast Custom Alert
              </h3>
              <button onClick={() => setShowAlertForm(false)} className="hover:bg-white/10 p-1 rounded-lg">
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleSendManualAlert} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Alert Message & Details
                </label>
                <textarea
                  required
                  rows={4}
                  className="input-field w-full"
                  placeholder="Describe the hazard (e.g. Water level rising by 1 meter, severe landslide blocking road, heavy winds/lightning active...)"
                  value={alertDescription}
                  onChange={(e) => setAlertDescription(e.target.value)}
                />
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-800">
                <AlertTriangle size={18} className="shrink-0 text-amber-600 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Notice:</strong> This alert will be broadcasted immediately across the offline ghost-mesh network to all nearby volunteers and NGO dashboards.
                </p>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAlertForm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl active:scale-95 transition-all flex-1"
                >
                  Broadcast Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Grid: Left 2/3 is Request History, Right 1/3 is Weather Station */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Request History</h2>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
            </div>
          ) : (requests?.length === 0 && offlineRequests.length === 0) ? (
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
              {[...offlineRequests, ...(requests || [])].map((request) => (
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
        </div>

        {/* Live Weather Station Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-brand-100 to-indigo-100 rounded-full blur-2xl -mr-6 -mt-6"></div>

            <div className="flex items-center justify-between mb-4 relative z-10">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Activity size={20} className="text-brand-500 animate-pulse" />
                Live Weather Monitor
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Real-Time
              </span>
            </div>

            {weatherLoading ? (
              <div className="flex flex-col items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500 mb-2"></div>
                <p className="text-xs text-slate-400">Retrieving local sensor data...</p>
              </div>
            ) : weatherData ? (
              <div className="space-y-4">
                {/* Current Condition Banner */}
                <div className={`p-4 rounded-xl flex items-center gap-4 ${getWeatherInfo(weatherData.code).bg}`}>
                  <div className="shrink-0 animate-bounce">
                    {weatherData.code >= 95 ? (
                      <CloudLightning size={40} className="text-rose-500" />
                    ) : weatherData.code >= 63 ? (
                      <CloudRain size={40} className="text-blue-500" />
                    ) : (
                      <Sun size={40} className="text-amber-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-800 tracking-tight flex items-baseline">
                      {weatherData.temp}°C
                    </p>
                    <p className={`font-bold text-sm ${getWeatherInfo(weatherData.code).color}`}>
                      {getWeatherInfo(weatherData.code).text}
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 flex items-center gap-2">
                    <Wind size={16} className="text-slate-400" />
                    <div>
                      <p className="text-slate-400 font-medium">Wind Speed</p>
                      <p className="font-bold text-slate-700">{weatherData.wind} km/h</p>
                    </div>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 flex items-center gap-2">
                    <MapPin size={16} className="text-slate-400" />
                    <div>
                      <p className="text-slate-400 font-medium">Sector</p>
                      <p className="font-bold text-slate-700">Mandya Sector</p>
                    </div>
                  </div>
                </div>

                {/* Weather Alert Banner */}
                {weatherAlert ? (
                  <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl flex items-start gap-2.5 animate-pulse text-xs text-rose-800">
                    <AlertTriangle size={18} className="shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <p className="font-extrabold mb-0.5 uppercase tracking-wide">🔴 Severe Threat Active</p>
                      <p className="leading-relaxed">{weatherAlert}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-extrabold uppercase tracking-wide">🟢 Atmospheric Status Safe</p>
                      <p className="text-[11px] text-emerald-700">No severe threats flagged in this sector.</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                Unable to load local weather feeds. Check internet status.
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VictimDashboard;
