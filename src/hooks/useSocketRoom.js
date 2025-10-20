import { useEffect } from "react";
import { socket } from "../socket/socket";

const useRoomSocket = (setParticipants, consume, createRecvTransport, deviceRef, roomId) => {
  useEffect(() => {
    socket.on("room_participants", (list) => {
      console.log("[Socket] room_participants:", list);
      setParticipants(list);
    });

    socket.on("toggle-hand", ({ socketId, toggleHand }) => {
      console.log(`[Socket] toggle-hand for ${socketId}:`, toggleHand);
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, toggleHand } : p))
      );
    });

    socket.on("new-producer", async ({ producerId }) => {
      console.log("[Socket] new-producer:", producerId);
      await createRecvTransport();
      await consume(producerId, deviceRef, roomId);
    });

    socket.on("all-producers", async (producerIds) => {
      console.log("[Socket] all-producers:", producerIds);
      await createRecvTransport();
      for (const id of producerIds) await consume(id, deviceRef, roomId);
    });

    return () => {
      socket.off("room_participants");
      socket.off("toggle-hand");
      socket.off("new-producer");
      socket.off("all-producers");
    };
  }, [consume, createRecvTransport, deviceRef, roomId, setParticipants]);
};

export default useRoomSocket;
