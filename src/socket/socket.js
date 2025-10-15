import { io } from "socket.io-client";

export const socket = io("https://34.93.211.93:3000", {
  transports: ["websocket"],
});
