import { io } from "socket.io-client";

export const socket = io("http://34.93.238.91:3000", {
  transports: ["websocket"],
});
