import { useState, useEffect } from "react";
import { socket } from "../socket/socket";

export const useParticipants = () => {
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    socket.on("room_participants", setParticipants);
    socket.on("toggle-hand", ({ socketId, toggleHand }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, toggleHand } : p))
      );
    });
    return () => {
      socket.off("room_participants");
      socket.off("toggle-hand");
    };
  }, []);

  const toggleHand = (roomId) => socket.emit("toggle-hand", { roomId });

  return { participants, toggleHand };
};
