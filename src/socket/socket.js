import { io } from "socket.io-client";

export const socket = io("https://34.93.216.76:3000", {
  transports: ["websocket"],
});
