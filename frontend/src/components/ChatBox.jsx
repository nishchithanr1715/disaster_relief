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

  useEffect(() => {
    if (socket) {
      const handleReceive = (msg) => {
        setMessages(prev => [...prev, msg]);
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
    if (!input.trim() || !socket) return;
    
    socket.emit('send_chat_message', {
      senderId: user.id,
      content: input
    });
    
    setInput('');
  };

  if (isLoading) return <div className="p-4 text-center">Loading chat...</div>;

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-brand-600 p-4 text-white font-bold flex justify-between items-center shrink-0">
        <h3>Coordination Chat</h3>
        <span className="text-xs bg-white/20 px-2 py-1 rounded-lg">Live</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === user.id;
          return (
            <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="text-[10px] text-slate-400 mb-1 px-1">
                {isMe ? 'You' : msg.sender?.name} ({msg.sender?.role?.replace('_', ' ')})
              </div>
              <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${isMe ? 'bg-brand-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'}`}>
                {msg.content}
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
          placeholder="Type a message..."
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
