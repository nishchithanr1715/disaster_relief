import { io } from 'socket.io-client';

const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:5000';
    }
    if (/^[0-9.]+$/.test(window.location.hostname)) {
      return `http://${window.location.hostname}:5000`;
    }
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5000';
};

const socket = io(getBackendUrl(), {
  extraHeaders: {
    'Bypass-Tunnel-Reminder': 'true'
  }
});

const useSocket = () => {
  return socket;
};

export default useSocket;
