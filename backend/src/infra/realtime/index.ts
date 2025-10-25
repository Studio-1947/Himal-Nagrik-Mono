import type { Server } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import type { RawData } from 'ws';

type SubscriptionMessage = {
  type?: string;
  channel?: string;
  channels?: string[];
};

type OutboundEvent = {
  type: string;
  payload: unknown;
  channel: string;
  timestamp: string;
};

let gateway: WebSocketServer | null = null;

const channelSubscriptions = new Map<string, Set<WebSocket>>();
const socketSubscriptions = new WeakMap<WebSocket, Set<string>>();

const send = (socket: WebSocket, payload: unknown): void => {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }
  try {
    socket.send(JSON.stringify(payload));
  } catch (error) {
    console.error('[realtime] Failed to send payload', error);
  }
};

const parseChannels = (message: SubscriptionMessage): string[] => {
  const channels: string[] = [];
  if (Array.isArray(message.channels)) {
    for (const value of message.channels) {
      if (typeof value === 'string' && value.trim().length > 0) {
        channels.push(value.trim());
      }
    }
  }
  if (typeof message.channel === 'string' && message.channel.trim().length > 0) {
    channels.push(message.channel.trim());
  }
  return Array.from(new Set(channels));
};

const addSubscriptions = (socket: WebSocket, channels: string[]): void => {
  if (channels.length === 0) {
    return;
  }

  let socketChannels = socketSubscriptions.get(socket);
  if (!socketChannels) {
    socketChannels = new Set();
    socketSubscriptions.set(socket, socketChannels);
  }

  for (const channel of channels) {
    socketChannels.add(channel);
    let sockets = channelSubscriptions.get(channel);
    if (!sockets) {
      sockets = new Set();
      channelSubscriptions.set(channel, sockets);
    }
    sockets.add(socket);
  }
};

const removeSubscriptions = (socket: WebSocket, channels: string[]): void => {
  if (channels.length === 0) {
    return;
  }

  const socketChannels = socketSubscriptions.get(socket);
  if (!socketChannels) {
    return;
  }

  for (const channel of channels) {
    socketChannels.delete(channel);
    const sockets = channelSubscriptions.get(channel);
    if (!sockets) {
      continue;
    }

    sockets.delete(socket);
    if (sockets.size === 0) {
      channelSubscriptions.delete(channel);
    }
  }
};

const clearSocket = (socket: WebSocket): void => {
  const channels = socketSubscriptions.get(socket);
  if (!channels) {
    return;
  }

  for (const channel of channels) {
    const sockets = channelSubscriptions.get(channel);
    if (!sockets) {
      continue;
    }
    sockets.delete(socket);
    if (sockets.size === 0) {
      channelSubscriptions.delete(channel);
    }
  }

  socketSubscriptions.delete(socket);
};

const handleMessage = (socket: WebSocket, raw: RawData): void => {
  if (typeof raw !== 'string' && !(raw instanceof Buffer)) {
    return;
  }

  let parsed: SubscriptionMessage & { type?: string };
  try {
    parsed = JSON.parse(raw.toString());
  } catch {
    send(socket, { type: 'error', error: 'INVALID_JSON' });
    return;
  }

  const type = parsed.type;
  if (!type || typeof type !== 'string') {
    send(socket, { type: 'error', error: 'MISSING_TYPE' });
    return;
  }

  if (type === 'subscribe') {
    const channels = parseChannels(parsed);
    addSubscriptions(socket, channels);
    send(socket, { type: 'subscribed', channels });
    return;
  }

  if (type === 'unsubscribe') {
    const channels = parseChannels(parsed);
    removeSubscriptions(socket, channels);
    send(socket, { type: 'unsubscribed', channels });
    return;
  }

  if (type === 'ping') {
    send(socket, { type: 'pong', timestamp: new Date().toISOString() });
    return;
  }

  send(socket, { type: 'error', error: 'UNKNOWN_EVENT' });
};

export const startRealtimeGateway = (server: Server): void => {
  if (gateway) {
    return;
  }

  gateway = new WebSocketServer({ server, path: '/ws' });

  gateway.on('connection', (socket) => {
    send(socket, { type: 'connected', timestamp: new Date().toISOString() });

    socket.on('message', (message) => {
      handleMessage(socket, message);
    });

    socket.on('close', () => {
      clearSocket(socket);
    });

    socket.on('error', () => {
      clearSocket(socket);
    });
  });

  console.log('[realtime] WebSocket gateway started on /ws');
};

export const stopRealtimeGateway = (): void => {
  if (!gateway) {
    return;
  }

  for (const socket of gateway.clients) {
    try {
      socket.terminate();
    } catch {
      // ignore termination issues
    }
  }

  gateway.close();
  gateway = null;

  channelSubscriptions.clear();
  socketSubscriptions.clear();

  console.log('[realtime] WebSocket gateway stopped');
};

export const publishRealtimeEvent = (
  channel: string,
  type: string,
  payload: unknown,
): void => {
  const sockets = channelSubscriptions.get(channel);
  if (!sockets || sockets.size === 0) {
    return;
  }

  const event: OutboundEvent = {
    type,
    payload,
    channel,
    timestamp: new Date().toISOString(),
  };

  for (const socket of sockets) {
    send(socket, event);
  }
};
