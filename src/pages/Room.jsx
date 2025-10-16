import { useEffect, useState, useRef } from "react";
import { socket } from "../socket/socket";
import { useNavigate, useParams } from "react-router";
import { getFirstLetter, getRandomTailwindColor } from "../utils/utils";
import * as mediasoupClient from "mediasoup-client";
import Video from "../component/Video";

const Room = () => {
  const { id: roomId } = useParams();
  const [participants, setParticipants] = useState([]);
  const [deviceLoaded, setDeviceLoaded] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const audioTrackRef = useRef(null);
  const videoTrackRef = useRef(null);
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const audioProducerRef = useRef(null);
  const videoProducerRef = useRef(null);
  const consumersRef = useRef(new Map());
  const streamsMapRef = useRef(new Map());
  const deviceLoadedRef = useRef(false);
  const localRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Room component mounted");

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
      if (!recvTransportRef.current) await createRecvTransport();
      await consume(producerId);
    });

    socket.on("all-producers", async (producerIds) => {
      console.log("[Socket] all-producers:", producerIds);
      if (!recvTransportRef.current) await createRecvTransport();
      for (const id of producerIds) await consume(id);
    });

    socket.on("router-rtp-capabilities", async (rtpCapabilities) => {
      console.log("[Socket] router-rtp-capabilities:", rtpCapabilities);
      try {
        deviceRef.current = new mediasoupClient.Device();
        await deviceRef.current.load({ routerRtpCapabilities: rtpCapabilities });
        console.log("Device loaded successfully");
        setDeviceLoaded(true);
        deviceLoadedRef.current = true;
      } catch (err) {
        console.error("Error loading device:", err);
      }
    });

    return () => {
      console.log("Cleanup: removing socket listeners & stopping local tracks");
      socket.off("room_participants");
      socket.off("toggle-hand");
      socket.off("new-producer");
      socket.off("all-producers");
      socket.off("router-rtp-capabilities");

      audioTrackRef.current?.stop();
      videoTrackRef.current?.stop();
    };
  }, []);

  const waitDeviceLoaded = async () => {
    if (!deviceLoadedRef.current) {
      console.log("Waiting for device to load...");
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (deviceLoadedRef.current) {
            clearInterval(interval);
            console.log("Device is now loaded");
            resolve();
          }
        }, 50);
      });
    }
  };

  const createSendTransport = async () => {
    await waitDeviceLoaded();
    return new Promise((resolve, reject) => {
      socket.emit("create-send-transport", { roomId }, async (params) => {
        console.log("[Transport] sendTransport params:", params);
        if (params.error) return reject(new Error(params.error));

        try {
          sendTransportRef.current = deviceRef.current.createSendTransport({
            id: params.id,
            iceParameters: params.iceParameters,
            iceCandidates: params.iceCandidates,
            dtlsParameters: params.dtlsParameters,
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          });

          sendTransportRef.current.on("connect", ({ dtlsParameters }, callback, errback) => {
            console.log("[SendTransport] connecting...");
            socket.emit("connect-transport", { transportId: sendTransportRef.current.id, dtlsParameters }, (res) => {
              if (res?.error) {
                console.error("[SendTransport] connect error:", res.error);
                errback(new Error(res.error));
              } else {
                console.log("[SendTransport] connected successfully");
                callback();
              }
            });
          });

          sendTransportRef.current.on("produce", ({ kind, rtpParameters }, callback, errback) => {
            console.log("[SendTransport] produce event:", kind);
            socket.emit("produce", { roomId, kind, rtpParameters }, (data) => {
              if (data?.error) {
                console.error("[SendTransport] produce error:", data.error);
                errback(new Error(data.error));
              } else {
                console.log("[SendTransport] produce success, id:", data.id);
                callback({ id: data.id });
              }
            });
          });

          resolve();
        } catch (err) {
          console.error("[SendTransport] creation error:", err);
          reject(err);
        }
      });
    });
  };

  const createRecvTransport = async () => {
    await waitDeviceLoaded();
    return new Promise((resolve, reject) => {
      socket.emit("create-recv-transport", { roomId }, (params) => {
        console.log("[Transport] recvTransport params:", params);
        if (params.error) return reject(new Error(params.error));

        try {
          recvTransportRef.current = deviceRef.current.createRecvTransport({
            id: params.id,
            iceParameters: params.iceParameters,
            iceCandidates: params.iceCandidates,
            dtlsParameters: params.dtlsParameters,
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          });

          recvTransportRef.current.on("connect", ({ dtlsParameters }, callback, errback) => {
            console.log("[RecvTransport] connecting...");
            socket.emit("connect-transport", { transportId: recvTransportRef.current.id, dtlsParameters }, (res) => {
              if (res?.error) {
                console.error("[RecvTransport] connect error:", res.error);
                errback(new Error(res.error));
              } else {
                console.log("[RecvTransport] connected successfully");
                callback();
              }
            });
          });

          resolve();
        } catch (err) {
          console.error("[RecvTransport] creation error:", err);
          reject(err);
        }
      });
    });
  };

  const shareCam = async () => {
    try {
      console.log("shareCam called");
      await waitDeviceLoaded();

      if (!deviceRef.current.canProduce("video")) {
        console.error("Cannot produce video");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log("Media stream obtained", stream);

      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];

      audioTrack.onmute = () => console.log("[Local] audio track muted");
      audioTrack.onunmute = () => console.log("[Local] audio track unmuted");
      videoTrack.onmute = () => console.log("[Local] video track muted");
      videoTrack.onunmute = () => console.log("[Local] video track unmuted");

      audioTrackRef.current = audioTrack;
      videoTrackRef.current = videoTrack;

      if (localRef.current) {
        localRef.current.srcObject = stream;
        console.log("[Local] assigned stream to video element");
      }

      if (!sendTransportRef.current) await createSendTransport();

      // Produce audio
      if (audioTrack && deviceRef.current.canProduce("audio")) {
        audioProducerRef.current = await sendTransportRef.current.produce({ track: audioTrack });
        console.log("[Produce] audio producer created:", audioProducerRef.current.id);
        await audioProducerRef.current.resume();
        console.log("[Produce] audio producer resumed");
        setMicOn(true);
      }

      // Produce video
      if (videoTrack && deviceRef.current.canProduce("video")) {
        videoProducerRef.current = await sendTransportRef.current.produce({ track: videoTrack });
        console.log("[Produce] video producer created:", videoProducerRef.current.id);
        await videoProducerRef.current.resume();
        console.log("[Produce] video producer resumed");
        setCameraOn(true);
      }
    } catch (err) {
      console.error("[shareCam] error:", err);
    }
  };

  const consume = async (producerId) => {
    console.log("[Consume] producerId:", producerId);
    await waitDeviceLoaded();

    if (!recvTransportRef.current) return console.error("No recv transport available");
    if (consumersRef.current.has(producerId)) return console.log("Already consuming producer", producerId);

    socket.emit("consume", { roomId, producerId, rtpCapabilities: deviceRef.current.rtpCapabilities }, async (params) => {
      if (params.error) return console.error("[Consume] error:", params.error);

      console.log("[Consume] params received:", params);
      const consumer = await recvTransportRef.current.consume({
        id: params.id,
        producerId: params.producerId,
        kind: params.kind,
        rtpParameters: params.rtpParameters,
      });

      console.log("[Consume] consumer created:", consumer.id, "kind:", consumer.kind);

      // Resume BEFORE attaching to MediaStream
      await consumer.resume();
      console.log("[Consume] consumer resumed");

      consumersRef.current.set(producerId, consumer);

      // Track events
      consumer.track.onmute = () => console.log("[Remote] track muted", consumer.id);
      consumer.track.onunmute = () => console.log("[Remote] track unmuted", consumer.id);

      // Attach to MediaStream
      const userSocketId = params.socketId || producerId;
      let stream = streamsMapRef.current.get(userSocketId);
      if (!stream) {
        stream = new MediaStream();
        streamsMapRef.current.set(userSocketId, stream);
        setRemoteStreams((prev) => [...prev, { userSocketId, stream, name: `Remote ${userSocketId.slice(-4)}` }]);
        console.log("[Remote] new MediaStream created for", userSocketId);
      }

      stream.addTrack(consumer.track);
      console.log("[Remote] track added to MediaStream", consumer.track);
    });
  };

  const handleLeave = () => {
    console.log("[Action] Leave Room");
    audioTrackRef.current?.stop();
    videoTrackRef.current?.stop();
    consumersRef.current.forEach((consumer, key) => {
      console.log("[Cleanup] closing consumer", key);
      consumer.close();
    });
    consumersRef.current.clear();
    socket.emit("leave_room", { roomId });
    navigate("/");
  };

  const toggleCamera = async () => {
    console.log("[Action] toggleCamera");
    if (!cameraOn) await shareCam();
    else {
      videoTrackRef.current.enabled = !videoTrackRef.current.enabled;
      setCameraOn(videoTrackRef.current.enabled);
      console.log("[Action] camera enabled:", videoTrackRef.current.enabled);
    }
  };

  const toggleMic = async () => {
    console.log("[Action] toggleMic");
    if (!micOn) await shareCam();
    else {
      audioTrackRef.current.enabled = !audioTrackRef.current.enabled;
      setMicOn(audioTrackRef.current.enabled);
      console.log("[Action] mic enabled:", audioTrackRef.current.enabled);
    }
  };

  const handleRaiseHand = () => {
    console.log("[Action] Raise/Lower Hand");
    socket.emit("toggle-hand", { roomId });
  };

  return (
    <div className="space-y-5 mt-20">
      <h2>Room: {roomId}</h2>

      {/* Local & Remote Streams */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <video ref={localRef} autoPlay playsInline muted style={{ width: 400, border: "1px solid gray" }} />
        {remoteStreams
          .filter(({ stream }) => stream.getVideoTracks().length > 0)
          .map(({ userSocketId, stream, name }) => <Video key={userSocketId} stream={stream} name={name} />)}
      </div>

      {/* Debug info */}
      <div className="text-sm text-gray-600 space-y-1">
        <p>Device loaded: {deviceLoaded ? "Yes" : "No"}</p>
        <p>Remote streams: {remoteStreams.length}</p>
        <p>Camera: {cameraOn ? "On" : "Off"}, Mic: {micOn ? "On" : "Off"}</p>
        <p>Send Transport: {sendTransportRef.current ? "Ready" : "Not Ready"}</p>
        <p>Recv Transport: {recvTransportRef.current ? "Ready" : "Not Ready"}</p>
        <p>Consumers count: {consumersRef.current.size}</p>
      </div>

      {/* Participants */}
      <h3>Participants:</h3>
      <div className="grid grid-cols-2 gap-2">
        {participants.map((p) => {
          const bgColor = getRandomTailwindColor();
          return (
            <div key={p.socketId} className={`${bgColor} flex flex-col justify-center items-center text-white w-30 h-30 rounded border border-black gap-2`}>
              <div className="bg-white text-black rounded-full w-10 h-10 flex items-center justify-center text-2xl">
                {getFirstLetter(p.name)}
              </div>
              <p>{p.name} {p.toggleHand && "👌"}</p>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="space-x-2 mt-2">
        <button onClick={handleRaiseHand} className="bg-green-500 text-white rounded px-2 py-1 border-2 border-black">
          {participants.find((p) => p.socketId === socket.id)?.toggleHand ? "Lower Hand" : "Raise Hand"}
        </button>

        <button onClick={toggleMic} className={`${micOn ? "bg-green-500" : "bg-gray-500"} text-white rounded px-2 py-1 border-2 border-black`}>
          {micOn ? "Mute Mic" : "Unmute Mic"}
        </button>

        <button onClick={toggleCamera} className={`${cameraOn ? "bg-blue-500" : "bg-gray-500"} text-white rounded px-2 py-1 border-2 border-black`}>
          {cameraOn ? "Turn Off Camera" : "Turn On Camera"}
        </button>

        <button onClick={handleLeave} className="bg-red-500 text-white rounded px-2 py-1 border-2 border-black">
          Leave Room
        </button>
      </div>
    </div>
  );
};

export default Room;
