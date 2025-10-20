import { useEffect, useRef, useState } from "react";
import { socket } from "../socket/socket";
import { useNavigate, useParams } from "react-router";
import { getFirstLetter, getRandomTailwindColor } from "../utils/utils";
import * as mediasoupClient from "mediasoup-client";
import Video from "../component/Video";

const useConsumers = (createRecvTransport, recvTransportRef,waitDeviceLoaded) => {
  const consumersRef = useRef(new Map());
  const streamsMapRef = useRef(new Map());
  const [remoteStreams, setRemoteStreams] = useState([]);

  const consume = async (producerId, deviceRef, roomId, name, socketId) => {
    // console.log("🚀 roomId:", roomId, "typeof roomId:", typeof roomId);
    const userSocketId = socketId; // use correct socketId

    // console.log("[Consume] producerId:", producerId);
     await waitDeviceLoaded();
    if (!recvTransportRef.current) {
      console.log(
        "[Consume] recvTransportRef.current missing — creating now..."
      );
      const transport = await createRecvTransport();
      recvTransportRef.current = transport;
    }

    // console.log("Hey I am In console",deviceRef.current.rtpCapabilities)
    socket.emit(
      "consume",
      {
        roomId,
        producerId,
        rtpCapabilities: deviceRef.current.rtpCapabilities,
      },
      async (params) => {
        if (params.error)
          return console.error("[Consume] error:", params.error);
        // console.log("[Consume] params received:", params);
        const consumer = await recvTransportRef.current.consume({
          id: params.id,
          producerId: params.producerId,
          kind: params.kind,
          rtpParameters: params.rtpParameters,
        });
        await consumer.resume();
        console.log("[Consume] consumer resumed");
        consumersRef.current.set(producerId, consumer);
        let stream = streamsMapRef.current.get(userSocketId);
        if (!stream) {
          stream = new MediaStream();
          streamsMapRef.current.set(userSocketId, stream);
          setRemoteStreams((prev) => [...prev, { userSocketId, stream, name }]);
          // console.log("[Remote] new MediaStream created for", userSocketId);
        }
        stream.name = name;

        stream.addTrack(consumer.track);
        // console.log("[Remote] track added to MediaStream", consumer.track);
      }
    );
  };
  const removeConsumer = (producerId) => {
    const consumer = consumersRef.current.get(producerId);
    if (consumer) {
      consumer.close();
      consumersRef.current.delete(producerId);
    }
    setRemoteStreams((prev) =>
      prev.filter((r) => r.userSocketId !== producerId)
    );
    streamsMapRef.current.delete(producerId);
  };

  return {
    consumersRef,
    streamsMapRef,
    remoteStreams,
    setRemoteStreams,
    consume,
    removeConsumer,
  };
};
export default useConsumers;
