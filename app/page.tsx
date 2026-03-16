'use client';

import { useState } from 'react';
import { LayoutDashboard, Calendar as CalendarIcon, Users as UsersIcon, MessageSquare } from 'lucide-react';
import { BoardsView } from '@/components/BoardsView';
import { CalendarView } from '@/components/CalendarView';
import { UsersView } from '@/components/UsersView';
import { ChatView } from '@/components/ChatView';
import { useAppContext } from '@/lib/store';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'boards' | 'calendar' | 'users' | 'chat'>('boards');
  const { nick, setNick } = useAppContext();
  const [editingNick, setEditingNick] = useState(false);
  const [tempNick, setTempNick] = useState('');

  const handleNickSave = () => {
    if (tempNick.trim()) {
      setNick(tempNick.trim());
      setEditingNick(false);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h1 className="text-xl font-bold tracking-tight text-white mb-4">TaskFlow IRC</h1>
          
          <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/50">
            <div className="text-xs text-zinc-400 mb-1 uppercase tracking-wider font-semibold">Current Nick</div>
            {editingNick ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempNick}
                  onChange={(e) => setTempNick(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNickSave()}
                  className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
                <button onClick={handleNickSave} className="text-xs bg-indigo-600 hover:bg-indigo-500 px-2 py-1 rounded">Save</button>
              </div>
            ) : (
              <div 
                className="text-sm font-mono text-indigo-400 cursor-pointer hover:text-indigo-300 transition-colors"
                onClick={() => { setTempNick(nick); setEditingNick(true); }}
              >
                {nick || 'Connecting...'}
              </div>
            )}
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('boards')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${activeTab === 'boards' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
          >
            <LayoutDashboard size={18} />
            <span className="font-medium">Boards</span>
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${activeTab === 'calendar' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
          >
            <CalendarIcon size={18} />
            <span className="font-medium">Calendar</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${activeTab === 'users' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
          >
            <UsersIcon size={18} />
            <span className="font-medium">Users</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${activeTab === 'chat' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
          >
            <MessageSquare size={18} />
            <span className="font-medium">IRC Chat</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'boards' && <BoardsView onSpawnRoom={(room) => { setActiveTab('chat'); }} />}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'users' && <UsersView />}
        {activeTab === 'chat' && <ChatView />}
      </main>
    </div>
  );
}
