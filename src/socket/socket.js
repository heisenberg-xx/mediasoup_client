import { io } from "socket.io-client";

export const socket = io("https://unprofiteering-magali-insouciantly.ngrok-free.dev", {
  transports: ["websocket"],
});
