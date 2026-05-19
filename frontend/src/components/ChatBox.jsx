import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMessages } from '../api/chat';
import useSocket from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import { Send } from 'lucide-react';

const ChatBox = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const { data: initialMessages, isLoading } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: getMessages
  });

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // P2P Ghost Chat Mesh Engine (BroadcastChannel)
  useEffect(() => {
    const chatMeshChannel = new BroadcastChannel('reliefsync-ghost-chat');

    const handleMeshMessage = (event) => {
      const { type, packet } = event.data;
      if (type === 'OFFLINE_CHAT_MSG') {
        // Add to UI immediately
        setMessages(prev => {
          if (prev.some(m => m.id === packet.id || (m.content === packet.content && m.senderId === packet.senderId))) return prev;
          return [...prev, packet];
        });

        // Gateway Relay Mode: If THIS peer is online, relay it to the database
        if (socket && socket.connected) {
          socket.emit('send_chat_message', {
            senderId: packet.senderId,
            content: packet.content
          });
        }
      }
    };

    chatMeshChannel.addEventListener('message', handleMeshMessage);

    return () => {
      chatMeshChannel.removeEventListener('message', handleMeshMessage);
      chatMeshChannel.close();
    };
  }, [socket]);

  // Peer-to-Peer Socket Mesh Listener (Simulates radio wave chat across separate physical devices)
  useEffect(() => {
    if (!socket) return;

    const handleSocketMeshChat = (packet) => {
      // Add to UI immediately
      setMessages(prev => {
        if (prev.some(m => m.id === packet.id || (m.content === packet.content && m.senderId === packet.senderId))) return prev;
        return [...prev, packet];
      });

      // Gateway Relay Mode: If THIS peer is online (connected to server), relay it to DB
      if (socket.connected) {
        socket.emit('send_chat_message', {
          senderId: packet.senderId,
          content: packet.content
        });
      }
    };

    socket.on('mesh_receive_chat', handleSocketMeshChat);

    return () => {
      socket.off('mesh_receive_chat', handleSocketMeshChat);
    };
  }, [socket]);

  // Sync / Flush offline queue on Reconnection
  useEffect(() => {
    if (!socket) return;

    const flushQueue = () => {
      const queue = JSON.parse(localStorage.getItem('reliefsync_offline_chat_queue') || '[]');
      if (queue.length > 0) {
        console.log(`Ghost Chat: Syncing ${queue.length} offline messages to backend...`);
        queue.forEach(msg => {
          socket.emit('send_chat_message', {
            senderId: msg.senderId,
            content: msg.content
          });
        });
        localStorage.removeItem('reliefsync_offline_chat_queue');
      }
    };

    socket.on('connect', flushQueue);
    if (socket.connected) {
      flushQueue();
    }

    return () => {
      socket.off('connect', flushQueue);
    };
  }, [socket]);

  useEffect(() => {
    if (socket) {
      const handleReceive = (msg) => {
        setMessages(prev => {
          // Deduplicate if already present (optimistic offline message matched by content/sender)
          if (prev.some(m => m.id === msg.id || (m.content === msg.content && m.senderId === msg.senderId))) {
            return prev;
          }
          return [...prev, msg];
        });
      };
      socket.on('receive_chat_message', handleReceive);
      return () => {
        socket.off('receive_chat_message', handleReceive);
      };
    }
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const isConnected = socket && socket.connected;

    if (isConnected) {
      // Send directly over WebSockets if online (let socket response append it)
      socket.emit('send_chat_message', {
        senderId: user.id,
        content: input
      });
    } else {
      // Construct local optimistic offline mesh message
      const msgId = 'mesh-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const newMsg = {
        id: msgId,
        content: input,
        senderId: user.id,
        sender: {
          name: user.name,
          role: user.role
        },
        createdAt: new Date().toISOString()
      };

      // Show locally instantly
      setMessages(prev => [...prev, newMsg]);

      // Broadcast P2P locally over Ghost Mesh channel
      const chatMeshChannel = new BroadcastChannel('reliefsync-ghost-chat');
      chatMeshChannel.postMessage({
        type: 'OFFLINE_CHAT_MSG',
        packet: newMsg
      });
      chatMeshChannel.close();

      // Broadcast P2P over socket radio simulation for separate physical devices
      if (socket) {
        socket.emit('mesh_broadcast_chat', newMsg);
      }

      // Save in offline outbox queue to sync when internet resumes
      const queue = JSON.parse(localStorage.getItem('reliefsync_offline_chat_queue') || '[]');
      queue.push({ senderId: user.id, content: input });
      localStorage.setItem('reliefsync_offline_chat_queue', JSON.stringify(queue));
    }
    
    setInput('');
  };

  if (isLoading) return <div className="p-4 text-center">Loading chat...</div>;

  const isOnline = socket && socket.connected;

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden card">
      <div className="bg-brand-600 p-4 text-white font-bold flex justify-between items-center shrink-0">
        <h3>Coordination Chat</h3>
        <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 
          ${isOnline ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 
            'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`}></span>
          {isOnline ? 'Online (VHF Sync)' : 'Offline Mesh (P2P Ghost)'}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === user.id;
          
          return (
            <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="text-[10px] text-slate-400 mb-1 px-1">
                {isMe ? 'You' : msg.sender?.name} ({msg.sender?.role?.replace('_', ' ')})
              </div>
              <div className={`px-4 py-2 rounded-2xl max-w-[80%] flex flex-col gap-0.5
                ${isMe ? 
                  'bg-brand-600 text-white rounded-br-none' : 
                  'bg-white border border-slate-200 text-slate-700 rounded-bl-none'}`}>
                <span className="text-sm font-medium">{msg.content}</span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex gap-2 shrink-0">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isOnline ? "Type a message to command..." : "WiFi Direct / BLE mesh offline typing..."}
          className="flex-1 input-field"
        />
        <button type="submit" disabled={!input.trim()} className="btn-primary p-3">
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
