import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const useSocket = (url = import.meta.env.VITE_API_URL || 'http://localhost:5000') => {
  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io(url);

    socketRef.current.on('connect', () => {
      console.log('Connected to socket server');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [url]);

  return socketRef.current;
};

export default useSocket;
