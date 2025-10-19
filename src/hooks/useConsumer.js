import { useState, useRef } from "react";
import { socket } from "../socket/socket";

export const useConsumers = (deviceRef, recvTransportRef) => {
  const [remoteStreams, setRemoteStreams] = useState([]);
  const consumersRef = useRef(new Map());
  const streamsMapRef = useRef(new Map()); // userSocketId -> { mediaStream, screenStream }

  const consume = async (producerId, userSocketId, name = `Remote ${producerId.slice(-4)}`, isScreen = false) => {
    if (!deviceRef.current || !recvTransportRef.current) return;
    if (consumersRef.current.has(producerId)) return;

    socket.emit(
      "consume",
      { producerId, rtpCapabilities: deviceRef.current.rtpCapabilities, roomId: window.roomId },
      async (params) => {
        if (params.error) return console.error("[Consume] error:", params.error);

        const consumer = await recvTransportRef.current.consume({
          id: params.id,
          producerId: params.producerId,
          kind: params.kind,
          rtpParameters: params.rtpParameters,
        });
        await consumer.resume();
        consumersRef.current.set(producerId, consumer);

        let participantStreams = streamsMapRef.current.get(userSocketId);
        if (!participantStreams) {
          participantStreams = { mediaStream: new MediaStream(), screenStream: null, name };
          streamsMapRef.current.set(userSocketId, participantStreams);
        }

        if (isScreen) {
          const screenStream = new MediaStream([consumer.track]);
          participantStreams.screenStream = screenStream;
        } else {
          participantStreams.mediaStream.addTrack(consumer.track);
        }

        // Trigger React re-render
        setRemoteStreams(Array.from(streamsMapRef.current.entries()).map(([socketId, streams]) => ({
          userSocketId: socketId,
          stream: streams.mediaStream,
          screenStream: streams.screenStream,
          name: streams.name
        })));
      }
    );
  };

  const clearConsumers = () => {
    consumersRef.current.forEach((c) => c.close());
    consumersRef.current.clear();
    streamsMapRef.current.clear();
    setRemoteStreams([]);
  };

  return { remoteStreams, consume, clearConsumers };
};
