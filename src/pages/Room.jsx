import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { socket } from "../socket/socket";
import Video from "../component/Video";
import { useConsumers } from "../hooks/useConsumer";
import { useMedia } from "../hooks/useMedia";
import { useParticipants } from "../hooks/usePartcipants";
import * as mediasoupClient from "mediasoup-client";
import {
  Hand,
  ScreenShare,
  ScreenShareOff,
  Unplug,
  VideoOff,
  Video as VideoIcon,
  Mic,
  MicOff,
} from "lucide-react";

const Room = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const localRef = useRef();
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);

  const {
    micOn,
    cameraOn,
    screenOn,
    shareCam,
    toggleMic,
    toggleCamera,
    shareScreen,
    stopScreenShare,
    stopAll,
    isSpeaking,
  } = useMedia(deviceRef, sendTransportRef);

  const { remoteStreams, consume, clearConsumers } = useConsumers(
    deviceRef,
    recvTransportRef
  );

  const { participants, toggleHand } = useParticipants();
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [deviceLoaded, setDeviceLoaded] = useState(false);

  // Join room & mediasoup setup
  useEffect(() => {
    const name = "User" + Math.floor(Math.random() * 1000);
    socket.emit("join_room", { room: roomId, name });

    socket.on("router-rtp-capabilities", async (rtpCapabilities) => {
      deviceRef.current = new mediasoupClient.Device();
      await deviceRef.current.load({ routerRtpCapabilities: rtpCapabilities });
      setDeviceLoaded(true);
    });

    socket.on("all-producers", async (producerIds) => {
      for (const id of producerIds) await consume(id, id);
    });

    socket.on("new-producer", async ({ producerId }) =>
      consume(producerId, producerId)
    );

    return () => {
      stopAll();
      clearConsumers();
      socket.emit("leave_room", { roomId });
    };
  }, []);

  // Auto share camera when toggled
  useEffect(() => {
    if (localRef.current && cameraOn) {
      shareCam().then((stream) => (localRef.current.srcObject = stream));
    }
  }, [cameraOn]);

  const handleLeave = () => {
    stopAll();
    clearConsumers();
    socket.emit("leave_room", { roomId });
    navigate("/");
  };

  const handRaised = (roomId) => {
    setDeviceLoaded((prev) => !prev);
    toggleHand(roomId);
  };

  const renderLayout = () => {
    const sharingUser = remoteStreams.find((r) => r.screenStream);
    if (sharingUser) {
      const otherUsers = remoteStreams.filter(
        (r) => r.userSocketId !== sharingUser.userSocketId
      );

      return (
        <div className="flex gap-4">
          <div className="flex-1">
            <Video
              stream={sharingUser.screenStream}
              key={`${sharingUser.userSocketId}-screen-${sharingUser.screenStream.id}`}
              name={`${sharingUser.name} (Presenting)`}
            />
          </div>
          <div className="w-1/5 grid grid-cols-1 gap-2">
            {otherUsers.map((r) => (
              <Video
                key={`${r.userSocketId}-side-${r.stream.id}`}
                stream={r.stream}
                name={r.name}
              />
            ))}
          </div>
        </div>
      );
    }

    // default grid when no one is sharing
    return <div className="grid grid-cols-4 gap-4">{renderParticipants()}</div>;
  };

  // Render participants with unique keys for all video/screen elements
  const renderParticipants = () => {
    return participants.map((p) => {
      const remote = remoteStreams.find((s) => s.userSocketId === p.socketId);
      const stream = remote?.stream || null;

      return (
        <div
          key={`${p.socketId}-container`}
          className={`bg-gray-800 text-white p-2 rounded flex flex-col items-center relative ${
            isSpeaking && p.socketId === socket.id
              ? "border-4 border-green-500"
              : ""
          }`}
        >
          {/* Video */}
          <div className="w-32 h-32 rounded overflow-hidden bg-black">
            {stream ? (
              <Video
                key={`${p.socketId}-video-${stream.id || "default"}`}
                stream={stream}
                name={p.name}
                muted={p.socketId === socket.id}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-white text-2xl">
                {p.name[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Screen Share */}
          {remote?.screenStream && (
            <div
              key={`${p.socketId}-screen-${remote.screenStream.id || "screen"}`}
              className="w-64 h-36 mt-2 border border-blue-500 rounded overflow-hidden"
            >
              <Video stream={remote.screenStream} name={p.name + " (Screen)"} />
            </div>
          )}

          {/* Name & hand */}
          <p className="mt-2">{p.name}</p>
          {p.toggleHand && <span className="absolute top-0 right-0">✋</span>}
        </div>
      );
    });
  };

  return (
    <div className="p-4 relative w-screen min-h-screen">
      <h2 className="text-2xl text-green-500 font-semibold">Room: {roomId}</h2>

      {/* Participants Grid */}
      <div className="grid grid-cols-4 gap-4">{renderLayout()}</div>

      {/* Controls */}
      <div className="flex gap-2 absolute bottom-10 px-3 py-5 bg-white/20 rounded justify-self-center">
        <button
          onClick={toggleMic}
          className={`flex items-center px-3 py-1 rounded text-lg gap-2 transition-all duration-200 hover:scale-[1.05] ${
            micOn ? "bg-green-500" : "bg-gray-500"
          } text-white`}
        >
          {micOn ? <MicOff /> : <Mic />}
          {micOn ? "Mute" : "Unmute"}
        </button>
        <button
          onClick={toggleCamera}
          className={`flex items-center px-3 py-1 rounded text-lg gap-2 transition-all duration-200 hover:scale-[1.05] ${
            cameraOn ? "bg-blue-500" : "bg-gray-500"
          } text-white`}
        >
          {!cameraOn ? <VideoIcon /> : <VideoOff />}
          {cameraOn ? "Camera Off" : "Camera On"}
        </button>
        <button
          onClick={screenOn ? stopScreenShare : shareScreen}
          className={`flex items-center px-3 py-1 rounded text-lg gap-2 transition-all duration-200 hover:scale-[1.05] ${
            screenOn ? "bg-red-500" : "bg-gray-500"
          } text-white`}
        >
          {screenOn ? <ScreenShareOff /> : <ScreenShare />}
          {screenOn ? "Stop Share" : "Share Screen"}
        </button>
        <button
          onClick={() => handRaised(roomId)}
          className="px-3 py-1 rounded bg-white/20 text-black text-lg gap-2 transition-all duration-200 hover:scale-[1.05]"
        >
          {isHandRaised ? (
            <Hand className="text-white" size={30} strokeWidth={1.2} />
          ) : (
            <Hand fill="#00FF00" size={30} strokeWidth={1.2} />
          )}
        </button>
        <button
          onClick={handleLeave}
          className="px-3 py-2 rounded bg-red-600 text-white flex items-center text-lg gap-2 transition-all duration-200 hover:scale-[1.05]"
        >
          <Unplug /> Leave
        </button>
      </div>
    </div>
  );
};

export default Room;
