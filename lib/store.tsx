'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

export type Priority = 'Low' | 'Medium' | 'High';

export type ChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
};

export type Comment = {
  id: string;
  author: string;
  text: string;
  timestamp: number;
};

export type Tag = {
  id: string;
  name: string;
  color: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  assignees: string[];
  dueDate: string | null;
  linkedTaskIds?: string[];
  priority?: Priority;
  checklist?: ChecklistItem[];
  comments?: Comment[];
  tagIds?: string[];
  subtaskIds?: string[];
  parentTaskId?: string;
};

export type Column = {
  id: string;
  title: string;
  tasks: Task[];
};

export type Board = {
  id: string;
  name: string;
  columns: Column[];
  tags?: Tag[];
};

export type ChatMessage = {
  type: string;
  nick?: string;
  message?: string;
  channel?: string;
  timestamp?: number;
  oldNick?: string;
  newNick?: string;
  names?: string[];
};

type AppContextType = {
  nick: string;
  users: { nick: string }[];
  boards: Board[];
  chatMessages: Record<string, ChatMessage[]>;
  joinedChannels: string[];
  channelUsers: Record<string, string[]>;
  setNick: (nick: string) => void;
  joinChannel: (channel: string) => void;
  partChannel: (channel: string) => void;
  sendMessage: (channel: string, message: string) => void;
  createBoard: (name: string, columns: Column[]) => void;
  updateBoard: (board: Board) => void;
  deleteBoard: (boardId: string) => void;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [nick, setNickState] = useState('');
  const nickRef = useRef(nick);
  const [users, setUsers] = useState<{ nick: string }[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [joinedChannels, setJoinedChannels] = useState<string[]>([]);
  const [channelUsers, setChannelUsers] = useState<Record<string, string[]>>({});
  
  const wsRef = useRef<WebSocket | null>(null);

  const addChatMessage = (channel: string, message: ChatMessage) => {
    setChatMessages((prev) => {
      const msgs = prev[channel] || [];
      return { ...prev, [channel]: [...msgs, message] };
    });
  };

  useEffect(() => {
    nickRef.current = nick;
  }, [nick]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'INIT':
          setNickState(data.nick);
          setBoards(data.boards);
          break;
        case 'USERS_LIST':
          setUsers(data.users);
          break;
        case 'BOARD_CREATED':
          setBoards((prev) => [...prev, data.board]);
          break;
        case 'BOARD_UPDATED':
          setBoards((prev) => prev.map(b => b.id === data.board.id ? data.board : b));
          break;
        case 'BOARD_DELETED':
          setBoards((prev) => prev.filter(b => b.id !== data.boardId));
          break;
        case 'JOIN':
          if (data.nick === nickRef.current) {
            setJoinedChannels((prev) => Array.from(new Set([...prev, data.channel])));
          }
          setChannelUsers((prev) => {
            const users = prev[data.channel] || [];
            return { ...prev, [data.channel]: Array.from(new Set([...users, data.nick])) };
          });
          addChatMessage(data.channel, data);
          break;
        case 'PART':
          if (data.nick === nickRef.current) {
            setJoinedChannels((prev) => prev.filter(c => c !== data.channel));
          }
          setChannelUsers((prev) => {
            const users = prev[data.channel] || [];
            return { ...prev, [data.channel]: users.filter(u => u !== data.nick) };
          });
          addChatMessage(data.channel, data);
          break;
        case 'NAMES':
          setChannelUsers((prev) => ({ ...prev, [data.channel]: data.names }));
          break;
        case 'PRIVMSG':
        case 'NICK_CHANGE':
          addChatMessage(data.channel, data);
          break;
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const setNick = (newNick: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'NICK', nick: newNick }));
      setNickState(newNick);
    }
  };

  const joinChannel = (channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'JOIN', channel }));
    }
  };

  const partChannel = (channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'PART', channel }));
    }
  };

  const sendMessage = (channel: string, message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'PRIVMSG', channel, message }));
    }
  };

  const createBoard = (name: string, columns: Column[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'CREATE_BOARD', name, columns }));
    }
  };

  const updateBoard = (board: Board) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'UPDATE_BOARD', board }));
    }
  };

  const deleteBoard = (boardId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'DELETE_BOARD', boardId }));
    }
  };

  return (
    <AppContext.Provider value={{
      nick, users, boards, chatMessages, joinedChannels, channelUsers,
      setNick, joinChannel, partChannel, sendMessage, createBoard, updateBoard, deleteBoard
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
