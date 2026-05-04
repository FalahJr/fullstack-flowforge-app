import { io, Socket } from "socket.io-client";

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_BASE_URL ?? "http://localhost:3001";

let socket: Socket | null = null;

export function connectSocket(tenantId: string) {
  if (!socket) {
    socket = io(`${WS_BASE_URL}/ws`, {
      transports: ["websocket"],
    });
  }

  socket.emit("join", { tenantId });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}
