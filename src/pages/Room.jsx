import { useEffect, useState, useRef } from "react";
import { socket } from "../socket/socket";
import { useNavigate, useParams } from "react-router";
import { getFirstLetter, getRandomTailwindColor } from "../utils/utils";
import * as mediasoupClient from "mediasoup-client";
import Video from "../component/Video";
import Audio from "../component/Audio";

const Room = () => {
  const { id: roomId } = useParams();
  const [participants, setParticipants] = useState([]);
  const [deviceLoaded, setDeviceLoaded] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const audioTrackRef = useRef(null);
  const videoTrackRef = useRef(null);
  const deviceLoadedRef = useRef(false);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const streamsMapRef = useRef(new Map());
  const navigate = useNavigate();

  // Instance refs
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const audioProducerRef = useRef(null);
  const videoProducerRef = useRef(null);
  const consumersRef = useRef(new Map()); // Track consumers
  const localRef = useRef();

  useEffect(() => {
    socket.on("room_participants", (list) => {
      console.log("Received room_participants", list);
      setParticipants(list);
    });

    socket.on("toggle-hand", ({ socketId, toggleHand }) => {
      console.log("toggle-hand event for", socketId, ":", toggleHand);
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, toggleHand } : p))
      );
    });

    socket.on("new-producer", async ({ producerId }) => {
      console.log("Socket event: new-producer", producerId);
      if (!recvTransportRef.current) {
        console.log("Creating recvTransport for new producer...");
        await createRecvTransport();
      }
      await consume(producerId);
    });

    socket.on("all-producers", async (producerIds) => {
      console.log("Socket event: all-producers", producerIds);
      if (!recvTransportRef.current) {
        console.log("Creating recvTransport for all producers...");
        await createRecvTransport();
      }
      for (const id of producerIds) {
        await consume(id);
      }
    });

    socket.on("router-rtp-capabilities", async (rtpCapabilities) => {
      try {
        console.log("Received router-rtp-capabilities", rtpCapabilities);
        deviceRef.current = new mediasoupClient.Device();
        await deviceRef.current.load({
          routerRtpCapabilities: rtpCapabilities,
        });
        console.log("Device loaded successfully");
        setDeviceLoaded(true);
        deviceLoadedRef.current = true;
      } catch (error) {
        console.error("Error loading device:", error);
      }
    });

    return () => {
      socket.off("room_participants");
      socket.off("toggle-hand");
      socket.off("new-producer");
      socket.off("all-producers");
      socket.off("router-rtp-capabilities");

      console.log("Cleanup: stopping local tracks");
      if (audioTrackRef.current) audioTrackRef.current.stop();
      if (videoTrackRef.current) videoTrackRef.current.stop();
    };
  }, []);

  const waitDeviceLoaded = async () => {
    console.log("waitDeviceLoaded called...");
    if (!deviceLoadedRef.current) {
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (deviceLoadedRef.current) {
            clearInterval(interval);
            console.log("deviceLoadedRef is now true");
            resolve();
          }
        }, 50);
      });
    }
    console.log("waitDeviceLoaded finished");
  };

  const createSendTransport = async () => {
    await waitDeviceLoaded();
    return new Promise((resolve, reject) => {
      socket.emit("create-send-transport", { roomId }, async (params) => {
        console.log("Send transport params:", params);
        if (params.error) {
          reject(new Error(params.error));
          return;
        }

        try {
          sendTransportRef.current = deviceRef.current.createSendTransport({
            id: params.id,
            iceParameters: params.iceParameters,
            iceCandidates: params.iceCandidates,
            dtlsParameters: params.dtlsParameters,
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              {
                urls: "stun:stun.relay.metered.ca:80",
              },
              {
                urls: "turn:global.relay.metered.ca:80",
                username: "95aca473e018df782b488619",
                credential: "awfVXDT18kWka8ym",
              },
              {
                urls: "turn:global.relay.metered.ca:80?transport=tcp",
                username: "95aca473e018df782b488619",
                credential: "awfVXDT18kWka8ym",
              },
              {
                urls: "turn:global.relay.metered.ca:443",
                username: "95aca473e018df782b488619",
                credential: "awfVXDT18kWka8ym",
              },
              {
                urls: "turns:global.relay.metered.ca:443?transport=tcp",
                username: "95aca473e018df782b488619",
                credential: "awfVXDT18kWka8ym",
              },
            ],
          });

          sendTransportRef.current.on(
            "connect",
            ({ dtlsParameters }, callback, errback) => {
              console.log("Send transport connecting...");
              socket.emit(
                "connect-transport",
                { transportId: sendTransportRef.current.id, dtlsParameters },
                (res) => {
                  if (res && res.error) {
                    console.error("Send transport connect error:", res.error);
                    errback(new Error(res.error));
                  } else {
                    console.log("Send transport connected successfully");
                    callback();
                  }
                }
              );
            }
          );

          sendTransportRef.current.on(
            "produce",
            ({ kind, rtpParameters }, callback, errback) => {
              console.log("Transport produce event:", kind, rtpParameters);
              socket.emit(
                "produce",
                { roomId, kind, rtpParameters },
                (data) => {
                  if (data?.error) {
                    console.error("Produce error:", data.error);
                    errback(new Error(data.error));
                    return;
                  }
                  console.log("Produce success, id:", data.id);
                  callback({ id: data.id });
                }
              );
            }
          );

          resolve();
        } catch (error) {
          console.error("Error creating send transport:", error);
          reject(error);
        }
      });
    });
  };

  const createRecvTransport = async () => {
    await waitDeviceLoaded();
    return new Promise((resolve, reject) => {
      socket.emit("create-recv-transport", { roomId }, (params) => {
        console.log("Recv transport params:", params);
        if (params.error) {
          reject(new Error(params.error));
          return;
        }

        try {
          recvTransportRef.current = deviceRef.current.createRecvTransport({
            id: params.id,
            iceParameters: params.iceParameters,
            iceCandidates: params.iceCandidates,
            dtlsParameters: params.dtlsParameters,
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              {
                urls: "stun:stun.relay.metered.ca:80",
              },
              {
                urls: "turn:global.relay.metered.ca:80",
                username: "95aca473e018df782b488619",
                credential: "awfVXDT18kWka8ym",
              },
              {
                urls: "turn:global.relay.metered.ca:80?transport=tcp",
                username: "95aca473e018df782b488619",
                credential: "awfVXDT18kWka8ym",
              },
              {
                urls: "turn:global.relay.metered.ca:443",
                username: "95aca473e018df782b488619",
                credential: "awfVXDT18kWka8ym",
              },
              {
                urls: "turns:global.relay.metered.ca:443?transport=tcp",
                username: "95aca473e018df782b488619",
                credential: "awfVXDT18kWka8ym",
              },
            ],
          });

          recvTransportRef.current.on(
            "connect",
            ({ dtlsParameters }, callback, errback) => {
              console.log("Recv transport connecting...");
              socket.emit(
                "connect-transport",
                { transportId: recvTransportRef.current.id, dtlsParameters },
                (res) => {
                  if (res && res.error) {
                    console.error("Recv transport connect error:", res.error);
                    errback(new Error(res.error));
                  } else {
                    console.log("Recv transport connected successfully");
                    callback();
                  }
                }
              );
            }
          );

          resolve();
        } catch (error) {
          console.error("Error creating recv transport:", error);
          reject(error);
        }
      });
    });
  };

  const shareCam = async () => {
    try {
      console.log("shareCam called...");
      await waitDeviceLoaded();

      if (!deviceRef.current.canProduce("video")) {
        console.error("Cannot produce video");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log("Got mediaDevices stream", stream);

      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];

      console.log(
        "Audio track",
        audioTrack,
        "enabled:",
        audioTrack?.enabled,
        "muted:",
        audioTrack?.muted
      );
      console.log(
        "Video track",
        videoTrack,
        "enabled:",
        videoTrack?.enabled,
        "muted:",
        videoTrack?.muted
      );

      // Track event hooks!
      audioTrack.onmute = () => console.log("AUDIO TRACK MUTED");
      audioTrack.onunmute = () => console.log("AUDIO TRACK UNMUTED");
      videoTrack.onmute = () => console.log("VIDEO TRACK MUTED");
      videoTrack.onunmute = () => console.log("VIDEO TRACK UNMUTED");

      audioTrackRef.current = audioTrack;
      videoTrackRef.current = videoTrack;
      if (localRef.current) {
        localRef.current.srcObject = stream;
        console.log("Assigned stream to localRef video element");
      }
      if (!sendTransportRef.current) {
        console.log("Creating sendTransport...");
        await createSendTransport();
      }

      // Produce audio
      if (audioTrack && deviceRef.current.canProduce("audio")) {
        try {
          audioProducerRef.current = await sendTransportRef.current.produce({
            track: audioTrack,
          });
          console.log("Audio producer created:", audioProducerRef.current.id);
          // Explicitly resume producer
          await audioProducerRef.current.resume();
          console.log("Audio producer resumed");
          setMicOn(true);
        } catch (error) {
          console.error("Error producing audio:", error);
        }
      }

      // Produce video
      if (videoTrack && deviceRef.current.canProduce("video")) {
        try {
          videoProducerRef.current = await sendTransportRef.current.produce({
            track: videoTrack,
          });
          console.log("Video producer created:", videoProducerRef.current.id);
          await videoProducerRef.current.resume(); // <-- ensure producer resumed to unmute
          console.log("Video producer resumed");
          setCameraOn(true);
        } catch (error) {
          console.error("Error producing video:", error);
        }
      }
    } catch (error) {
      console.error("Error sharing camera:", error);
    }
  };

  const consume = async (producerId) => {
    console.log("Consuming producer:", producerId);
    await waitDeviceLoaded();
    if (!recvTransportRef.current)
      return console.error("No recv transport available");
    if (consumersRef.current.has(producerId)) {
      console.log("Already consuming producer:", producerId);
      return;
    }

    socket.emit(
      "consume",
      {
        roomId,
        producerId,
        rtpCapabilities: deviceRef.current.rtpCapabilities,
      },
      async (params) => {
        if (params.error) {
          console.error("Consume error:", params.error);
          return;
        }

        console.log("Consume response params", params);

        const consumer = await recvTransportRef.current.consume({
          id: params.id,
          producerId: params.producerId,
          kind: params.kind,
          rtpParameters: params.rtpParameters,
        });

        console.log("Consumer created:", consumer);

        // Resume the consumer ***
        await consumer.resume();
        console.log("Consumer resumed:", consumer.id);

        consumersRef.current.set(producerId, consumer);

        // Attach track event listeners to catch mute/unmute at receiver side!
        if (consumer.track) {
          consumer.track.onmute = () => {
            console.log("REMOTE Consumer VIDEO TRACK MUTED!", consumer.track);
          };
          consumer.track.onunmute = () => {
            console.log("REMOTE Consumer VIDEO TRACK UNMUTED!", consumer.track);
          };
          console.log(
            "consumer.track:",
            consumer.track,
            "enabled:",
            consumer.track.enabled,
            "muted:",
            consumer.track.muted,
            "readyState:",
            consumer.track.readyState
          );
        }

        // Use socketId if available (signaling should be improved to differentiate users)
        const userSocketId = params.socketId || params.producerId;
        let stream = streamsMapRef.current.get(userSocketId);
        if (!stream) {
          stream = new MediaStream();
          streamsMapRef.current.set(userSocketId, stream);
          setRemoteStreams((prev) => [
            ...prev,
            { userSocketId, stream, name: `Remote ${userSocketId.slice(-4)}` },
          ]);
          console.log("Created new remote stream for", userSocketId, stream);
        }
        stream.addTrack(consumer.track);
        console.log("Added track to remote stream", stream.getTracks());
      }
    );
  };

  const handleLeave = () => {
    console.log("handleLeave called!");
    if (audioTrackRef.current) {
      audioTrackRef.current.stop();
      console.log("Stopped audioTrackRef");
    }
    if (videoTrackRef.current) {
      videoTrackRef.current.stop();
      console.log("Stopped videoTrackRef");
    }

    consumersRef.current.forEach((consumer, key) => {
      console.log("Closing consumer", key, consumer);
      consumer.close();
    });
    consumersRef.current.clear();

    socket.emit("leave_room", { roomId });
    navigate("/");
  };

  const handleRaiseHand = () => {
    console.log("handleRaiseHand triggered");
    socket.emit("toggle-hand", { roomId });
  };

  const toggleCamera = async () => {
    console.log("toggleCamera called");
    if (!cameraOn) {
      await shareCam();
    } else if (videoTrackRef.current) {
      videoTrackRef.current.enabled = !videoTrackRef.current.enabled;
      setCameraOn(videoTrackRef.current.enabled);
      console.log(
        "Toggled camera enabled state to",
        videoTrackRef.current.enabled
      );
    }
  };

  const toggleMic = async () => {
    console.log("toggleMic called");
    if (!micOn) {
      await shareCam();
    } else if (audioTrackRef.current) {
      audioTrackRef.current.enabled = !audioTrackRef.current.enabled;
      setMicOn(audioTrackRef.current.enabled);
      console.log(
        "Toggled mic enabled state to",
        audioTrackRef.current.enabled
      );
    }
  };
  console.log("localRef", localRef);

  return (
    <div className="space-y-5 mt-20">
      <h2>Room: {roomId}</h2>

      {/* Video/Audio streams */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          style={{ width: 400, border: "1px solid gray" }}
        />

        {remoteStreams
          .filter(({ stream }) => stream.getVideoTracks().length > 0)
          .map(({ userSocketId, stream, name }) => (
            <Video key={userSocketId} stream={stream} name={name} />
          ))}
      </div>

      {/* Debug info */}
      <div className="text-sm text-gray-600">
        <p>Device loaded: {deviceLoaded ? "Yes" : "No"}</p>
        <p>Remote streams: {remoteStreams.length}</p>
        <p>
          Camera: {cameraOn ? "On" : "Off"}, Mic: {micOn ? "On" : "Off"}
        </p>
        <p>
          Send Transport: {sendTransportRef.current ? "Ready" : "Not Ready"}
        </p>
        <p>
          Recv Transport: {recvTransportRef.current ? "Ready" : "Not Ready"}
        </p>
      </div>

      <h3>Participants:</h3>
      <div className="grid grid-cols-2 gap-2">
        {participants.map((p) => {
          const bgColor = getRandomTailwindColor();
          return (
            <div
              key={p.socketId}
              className={`${bgColor} flex flex-col justify-center items-center text-white w-30 h-30 rounded border border-black gap-2`}
            >
              <div className="bg-white text-black rounded-full w-10 h-10 flex items-center justify-center text-2xl">
                {getFirstLetter(p.name)}
              </div>
              <p>
                {p.name} {p.toggleHand && "👌"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="space-x-2">
        <button
          onClick={handleRaiseHand}
          className="bg-green-500 text-white rounded px-2 py-1 border-2 border-black"
        >
          {participants.find((p) => p.socketId === socket.id)?.toggleHand
            ? "Lower Hand"
            : "Raise Hand"}
        </button>

        <button
          onClick={toggleMic}
          className={`${
            micOn ? "bg-green-500" : "bg-gray-500"
          } text-white rounded px-2 py-1 border-2 border-black`}
        >
          {micOn ? "Mute Mic" : "Unmute Mic"}
        </button>

        <button
          onClick={toggleCamera}
          className={`${
            cameraOn ? "bg-blue-500" : "bg-gray-500"
          } text-white rounded px-2 py-1 border-2 border-black`}
        >
          {cameraOn ? "Turn Off Camera" : "Turn On Camera"}
        </button>
      </div>

      <button
        onClick={handleLeave}
        className="bg-red-500 text-white rounded px-2 py-1 border-2 border-black"
      >
        Leave Room
      </button>
    </div>
  );
};

export default Room;
