import express from 'express';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { parse } from 'url';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// State
const users = new Map<string, any>(); // ws -> user info
const channels = new Map<string, Set<WebSocket>>(); // channel name -> set of ws
const boards = new Map<string, any>(); // boardId -> board state

app.prepare().then(() => {
  const server = express();

  server.all('*', (req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const httpServer = server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });

  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    const userId = uuidv4();
    users.set(userId, { ws, nick: `Guest_${userId.substring(0, 4)}`, channels: new Set() });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleMessage(userId, ws, data);
      } catch (e) {
        console.error('Invalid message', e);
      }
    });

    ws.on('close', () => {
      const user = users.get(userId);
      if (user) {
        user.channels.forEach((channelName: string) => {
          const channel = channels.get(channelName);
          if (channel) {
            channel.delete(ws);
            broadcastToChannel(channelName, { type: 'PART', channel: channelName, nick: user.nick });
          }
        });
      }
      users.delete(userId);
      broadcastUsers();
    });
    
    // Send initial state
    ws.send(JSON.stringify({ type: 'INIT', userId, nick: users.get(userId).nick, boards: Array.from(boards.values()) }));
    broadcastUsers();
  });

  function handleMessage(userId: string, ws: WebSocket, data: any) {
    const user = users.get(userId);
    if (!user) return;

    switch (data.type) {
      case 'NICK':
        const oldNick = user.nick;
        user.nick = data.nick;
        user.channels.forEach((channelName: string) => {
          broadcastToChannel(channelName, { type: 'NICK_CHANGE', oldNick, newNick: user.nick, channel: channelName, timestamp: Date.now() });
        });
        broadcastUsers();
        break;
      case 'JOIN':
        const channelName = data.channel;
        if (!channels.has(channelName)) {
          channels.set(channelName, new Set());
        }
        channels.get(channelName)!.add(ws);
        user.channels.add(channelName);
        broadcastToChannel(channelName, { type: 'JOIN', channel: channelName, nick: user.nick, timestamp: Date.now() });
        
        // Send names list to the user
        const names = Array.from(channels.get(channelName)!).map(cWs => {
          const u = Array.from(users.values()).find(u => u.ws === cWs);
          return u ? u.nick : 'Unknown';
        });
        ws.send(JSON.stringify({ type: 'NAMES', channel: channelName, names }));
        break;
      case 'PART':
        if (channels.has(data.channel)) {
          channels.get(data.channel)!.delete(ws);
          user.channels.delete(data.channel);
          broadcastToChannel(data.channel, { type: 'PART', channel: data.channel, nick: user.nick, timestamp: Date.now() });
        }
        break;
      case 'PRIVMSG':
        broadcastToChannel(data.channel, { type: 'PRIVMSG', channel: data.channel, nick: user.nick, message: data.message, timestamp: Date.now() });
        break;
      case 'CREATE_BOARD':
        const boardId = uuidv4();
        const newBoard = { id: boardId, name: data.name, columns: data.columns || [] };
        boards.set(boardId, newBoard);
        broadcastAll({ type: 'BOARD_CREATED', board: newBoard });
        break;
      case 'UPDATE_BOARD':
        if (boards.has(data.board.id)) {
          boards.set(data.board.id, data.board);
          broadcastAll({ type: 'BOARD_UPDATED', board: data.board });
        }
        break;
      case 'DELETE_BOARD':
        if (boards.has(data.boardId)) {
          boards.delete(data.boardId);
          broadcastAll({ type: 'BOARD_DELETED', boardId: data.boardId });
        }
        break;
    }
  }

  function broadcastToChannel(channelName: string, message: any) {
    const channel = channels.get(channelName);
    if (channel) {
      const msgStr = JSON.stringify(message);
      channel.forEach(ws => ws.send(msgStr));
    }
  }

  function broadcastAll(message: any) {
    const msgStr = JSON.stringify(message);
    users.forEach(user => user.ws.send(msgStr));
  }

  function broadcastUsers() {
    const allUsers = Array.from(users.values()).map(u => ({ nick: u.nick }));
    broadcastAll({ type: 'USERS_LIST', users: allUsers });
  }
});
