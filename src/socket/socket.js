import { io } from "socket.io-client";

export const socket = io("http://34.14.164.14:3000", {
  transports: ["websocket"],
});
