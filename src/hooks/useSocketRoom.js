import { useEffect } from "react";
import { socket } from "../socket/socket";

const useRoomSocket = (
  setParticipants,
  consume,
  createRecvTransport,
  deviceRef,
  recvTransportRef,
  roomId
) => {
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

    socket.on("new-producer", async ({ producerId, name, socketId }) => {
      console.log("[Socket] new-producer:", producerId);

      if (!deviceRef.current || !recvTransportRef.current) {
        await createRecvTransport(); // only create if not already
      }

      await consume(producerId, deviceRef, roomId, name, socketId);
    });

    socket.on("all-producers", async (producers) => {
      console.log("[Socket] all-producers:", producers);

      if (!deviceRef.current || !recvTransportRef.current) {
        await createRecvTransport();
      }

      for (const { id, name, socketId } of producers) {
        await consume(id, deviceRef, roomId, name, socketId);
      }
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
