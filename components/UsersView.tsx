'use client';

import { Users, Circle, Mail, Activity } from 'lucide-react';
import { useAppContext } from '@/lib/store';

export function UsersView() {
  const { users, nick } = useAppContext();

  return (
    <div className="p-8 h-full bg-zinc-950 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-white">Users</h2>
        <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800">
          <Circle size={10} className="fill-emerald-500 text-emerald-500" />
          <span className="text-sm font-medium text-zinc-300">{users.length} Online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {users.map((user, i) => (
          <div 
            key={i} 
            className={`bg-zinc-900 border ${user.nick === nick ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'border-zinc-800'} rounded-xl p-6 flex flex-col items-center text-center transition-all hover:border-zinc-700`}
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-inner relative">
              {user.nick.substring(0, 2).toUpperCase()}
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-zinc-900 rounded-full"></div>
            </div>
            
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              {user.nick}
              {user.nick === nick && (
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">You</span>
              )}
            </h3>
            
            <div className="text-sm text-zinc-500 mb-6 font-mono">
              @user_{Math.abs(user.nick.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0)).toString(16).substring(0, 6)}
            </div>
            
            <div className="flex gap-3 w-full">
              <button className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg transition-colors text-sm font-medium">
                <Mail size={16} /> Message
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg transition-colors text-sm font-medium">
                <Activity size={16} /> Activity
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
