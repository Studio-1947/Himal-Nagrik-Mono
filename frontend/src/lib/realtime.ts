export type RealtimeEvent = {
  type: string;
  channel: string;
  payload: unknown;
  timestamp: string;
};

type RealtimeEventHandler = (event: RealtimeEvent) => void;

const channelHandlers = new Map<string, Set<RealtimeEventHandler>>();
const channelCounts = new Map<string, number>();
const pendingSubscriptions = new Set<string>();
const pendingUnsubscriptions = new Set<string>();

let socket: WebSocket | null = null;
let reconnectTimer: number | null = null;

const hasActiveSubscriptions = () => channelCounts.size > 0;

const getRealtimeUrl = (): string => {
  const override = import.meta.env.VITE_REALTIME_URL?.trim();
  if (override) {
    return override;
  }

  if (typeof window === "undefined") {
    return "ws://localhost:5000/ws";
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
};

const flushPendingSubscriptions = () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  if (pendingSubscriptions.size > 0) {
    socket.send(
      JSON.stringify({
        type: "subscribe",
        channels: Array.from(pendingSubscriptions),
      }),
    );
    pendingSubscriptions.clear();
  }

  if (pendingUnsubscriptions.size > 0) {
    socket.send(
      JSON.stringify({
        type: "unsubscribe",
        channels: Array.from(pendingUnsubscriptions),
      }),
    );
    pendingUnsubscriptions.clear();
  }
};

const ensureConnection = () => {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    socket = new WebSocket(getRealtimeUrl());
  } catch (error) {
    console.error("[realtime] Failed to open WebSocket", error);
    scheduleReconnect();
    return;
  }

  socket.addEventListener("open", () => {
    flushPendingSubscriptions();
    for (const channel of channelCounts.keys()) {
      pendingSubscriptions.add(channel);
    }
    flushPendingSubscriptions();
  });

  socket.addEventListener("message", (event) => {
    try {
      const parsed = JSON.parse(event.data) as RealtimeEvent;
      if (!parsed || typeof parsed !== "object") {
        return;
      }

      if (typeof parsed.channel !== "string" || typeof parsed.type !== "string") {
        return;
      }

      const handlers = channelHandlers.get(parsed.channel);
      if (!handlers || handlers.size === 0) {
        return;
      }

      handlers.forEach((handler) => {
        try {
          handler(parsed);
        } catch (handlerError) {
          console.error("[realtime] Handler error", handlerError);
        }
      });
    } catch (error) {
      console.error("[realtime] Failed to parse message", error);
    }
  });

  socket.addEventListener("close", () => {
    socket = null;
    scheduleReconnect();
  });

  socket.addEventListener("error", () => {
    if (socket) {
      socket.close();
    }
  });
};

const scheduleReconnect = () => {
  if (reconnectTimer !== null || !hasActiveSubscriptions()) {
    return;
  }
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    ensureConnection();
  }, 3000);
};

const subscribe = (channel: string, handler: RealtimeEventHandler): (() => void) => {
  if (!channelHandlers.has(channel)) {
    channelHandlers.set(channel, new Set());
  }
  channelHandlers.get(channel)!.add(handler);

  const prevCount = channelCounts.get(channel) ?? 0;
  channelCounts.set(channel, prevCount + 1);

  if (prevCount === 0) {
    pendingSubscriptions.add(channel);
    pendingUnsubscriptions.delete(channel);
    ensureConnection();
    flushPendingSubscriptions();
  } else {
    ensureConnection();
  }

  return () => {
    const handlers = channelHandlers.get(channel);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        channelHandlers.delete(channel);
      }
    }

    const currentCount = channelCounts.get(channel) ?? 0;
    const nextCount = Math.max(currentCount - 1, 0);
    if (nextCount === 0) {
      channelCounts.delete(channel);
      pendingUnsubscriptions.add(channel);
      pendingSubscriptions.delete(channel);
      flushPendingSubscriptions();
    } else {
      channelCounts.set(channel, nextCount);
    }

    if (!hasActiveSubscriptions() && socket) {
      socket.close();
      socket = null;
    }
  };
};

export const realtimeClient = {
  subscribe,
};
