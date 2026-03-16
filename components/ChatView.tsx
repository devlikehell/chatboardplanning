'use client';

import { useState, useRef, useEffect } from 'react';
import { Hash, Users, Send, Command } from 'lucide-react';
import { useAppContext } from '@/lib/store';

export function ChatView() {
  const { nick, joinedChannels, channelUsers, chatMessages, joinChannel, partChannel, sendMessage } = useAppContext();
  const [activeChannelState, setActiveChannel] = useState<string | null>(null);
  const activeChannel = activeChannelState || (joinedChannels.length > 0 ? joinedChannels[0] : null);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeChannel]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    if (inputMessage.startsWith('/')) {
      const parts = inputMessage.split(' ');
      const cmd = parts[0].toLowerCase();
      
      if (cmd === '/join' && parts[1]) {
        const channel = parts[1].startsWith('#') ? parts[1] : `#${parts[1]}`;
        joinChannel(channel);
        setActiveChannel(channel);
      } else if (cmd === '/part' && activeChannel) {
        partChannel(activeChannel);
        setActiveChannel(joinedChannels[0] || null);
      }
      // Add more commands as needed
    } else if (activeChannel) {
      sendMessage(activeChannel, inputMessage);
    }
    
    setInputMessage('');
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return `[${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}]`;
  };

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-300 font-mono text-sm">
      {/* Channels Sidebar */}
      <div className="w-48 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-3 border-b border-zinc-800 font-semibold text-zinc-100 flex items-center gap-2">
          <Hash size={16} /> Channels
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {joinedChannels.map(channel => (
            <div
              key={channel}
              onClick={() => setActiveChannel(channel)}
              className={`px-4 py-1.5 cursor-pointer flex justify-between items-center group ${activeChannel === channel ? 'bg-indigo-900/40 text-indigo-300 border-l-2 border-indigo-500' : 'hover:bg-zinc-800/50 text-zinc-400 border-l-2 border-transparent'}`}
            >
              <span className="truncate">{channel}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); partChannel(channel); }}
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400"
              >
                ×
              </button>
            </div>
          ))}
          {joinedChannels.length === 0 && (
            <div className="px-4 py-2 text-zinc-600 text-xs italic">
              Type /join #channel
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
        {/* Header */}
        <div className="h-12 border-b border-zinc-800 flex items-center px-4 bg-zinc-900/50 justify-between">
          <div className="font-bold text-zinc-100 text-base">
            {activeChannel || 'No channel selected'}
          </div>
          <div className="text-zinc-500 text-xs flex items-center gap-2">
            <Command size={14} /> /join #channel | /part
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {activeChannel && chatMessages[activeChannel]?.map((msg, i) => (
            <div key={i} className="flex gap-3 hover:bg-zinc-900/30 px-2 py-0.5 rounded">
              <span className="text-zinc-600 shrink-0 select-none">{formatTime(msg.timestamp)}</span>
              
              {msg.type === 'PRIVMSG' && (
                <>
                  <span className={`shrink-0 font-bold ${msg.nick === nick ? 'text-indigo-400' : 'text-emerald-400'}`}>
                    &lt;{msg.nick}&gt;
                  </span>
                  <span className="text-zinc-300 break-words">{msg.message}</span>
                </>
              )}
              
              {msg.type === 'JOIN' && (
                <span className="text-zinc-500 italic">
                  → {msg.nick} joined {msg.channel}
                </span>
              )}
              
              {msg.type === 'PART' && (
                <span className="text-zinc-500 italic">
                  ← {msg.nick} left {msg.channel}
                </span>
              )}
              
              {msg.type === 'NICK_CHANGE' && (
                <span className="text-zinc-500 italic">
                  • {msg.oldNick} is now known as {msg.newNick}
                </span>
              )}
            </div>
          ))}
          {!activeChannel && (
            <div className="h-full flex items-center justify-center text-zinc-600 italic">
              Join a channel to start chatting
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-900">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={activeChannel ? `Message ${activeChannel}...` : 'Type /join #channel...'}
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              disabled={!activeChannel && !inputMessage.startsWith('/')}
            />
            <button 
              type="submit"
              disabled={!inputMessage.trim() || (!activeChannel && !inputMessage.startsWith('/'))}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* Users Sidebar */}
      {activeChannel && (
        <div className="w-48 bg-zinc-900 border-l border-zinc-800 flex flex-col">
          <div className="p-3 border-b border-zinc-800 font-semibold text-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2"><Users size={16} /> Users</div>
            <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400">
              {channelUsers[activeChannel]?.length || 0}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {channelUsers[activeChannel]?.map(user => (
              <div key={user} className="px-4 py-1 flex items-center gap-2 text-zinc-400 hover:text-zinc-200 cursor-default">
                <div className={`w-2 h-2 rounded-full ${user === nick ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                <span className="truncate">{user}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
