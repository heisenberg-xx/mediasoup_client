import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import useConsumers from "../hooks/mediasoup/useConsumers";
import useProducers from "../hooks/mediasoup/useProducers";
import useRoomSocket from "../hooks/useSocketRoom";
import { getRandomTailwindColor } from "../utils/utils";
import { socket } from "../socket/socket";
import Video from "../component/Video";
import useAudioActivity from "../hooks/useAudioActivity";
import {
  Hand,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Unplug,
  MonitorUp,
  MonitorX,
  Share2,
} from "lucide-react";
import useMediasoupDevice from "../hooks/mediasoup/useMediasoupDevice";
import useTransports from "../hooks/mediasoup/useTransports";
import ShareModal from "../component/ShareModel";

// ✅ ParticipantTile safely uses hooks
const ParticipantTile = ({ participant, isLocal, cameraOn, colorMap }) => {
  const { stream, name, toggleHand } = participant;
  const isSpeaking = useAudioActivity(stream);

  const bgColor = colorMap[participant.socketId]?.bg ?? "bg-gray-500/50";
  const border = colorMap[participant.socketId]?.border ?? "border-gray-500";

  const showVideo =
    stream?.getVideoTracks()[0]?.enabled && (isLocal ? cameraOn : true);
  console.log("showVideo for", name, ":", showVideo);

  return (
    <div
      className={`relative rounded-lg overflow-hidden shadow-md border ${bgColor} ${border} 
        ${isSpeaking ? "scale-105 ring-4 ring-green-400" : "scale-100"}
        transition-transform duration-300 h-60`}
    >
      {toggleHand && (
        <span className="absolute bottom-0 z-20">
          <Hand fill="#00FF00" size={30} strokeWidth={1.2} />
        </span>
      )}

      {showVideo ? (
        <Video stream={stream} muted={isLocal} />
      ) : (
        <div className="flex justify-center items-center h-full text-white bg-gray-700">
          {name}
        </div>
      )}
    </div>
  );
};

const Room = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const [participants, setParticipants] = useState([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const localRef = useRef();
  const screenLocalRef = useRef();

  const { deviceRef, deviceLoaded, waitDeviceLoaded } = useMediasoupDevice();
  const {
    sendTransportRef,
    recvTransportRef,
    createSendTransport,
    createRecvTransport,
  } = useTransports(deviceRef, waitDeviceLoaded, roomId);

  const {
    shareCam,
    stopCam,
    shareScreen,
    stopScreenShare,
    audioProducerRef,
    videoProducerRef,
    screenProducerRef,
  } = useProducers(
    deviceRef,
    sendTransportRef,
    waitDeviceLoaded,
    setMicOn,
    setCameraOn,
    createSendTransport,
    setLocalStream
  );

  const { consumersRef, remoteStreams, setRemoteStreams, consume } =
    useConsumers(createRecvTransport, recvTransportRef, waitDeviceLoaded);

  useRoomSocket(
    setParticipants,
    consume,
    createRecvTransport,
    deviceRef,
    recvTransportRef,
    waitDeviceLoaded,
    roomId
  );

  // Merge local + remote participants
  const allParticipants = useMemo(() => {
    const localParticipant = {
      socketId: socket.id,
      stream: localStream,
      name: participants.find((p) => p.socketId === socket.id)?.name || "You",
      toggleHand:
        participants.find((p) => p.socketId === socket.id)?.toggleHand || false,
    };

    const remoteParticipants = participants
      .filter((p) => p.socketId !== socket.id)
      .map((p) => {
        const streamObj = remoteStreams.find(
          (r) => r.userSocketId === p.socketId
        );
        return {
          socketId: p.socketId,
          stream: streamObj?.stream || null,
          name: p.name,
          toggleHand: p.toggleHand || false,
        };
      });

    return [localParticipant, ...remoteParticipants];
  }, [participants, remoteStreams, localStream]);

  const colorMap = useMemo(() => {
    const map = {};
    allParticipants.forEach((p) => {
      map[p.socketId] = getRandomTailwindColor();
    });
    return map;
  }, [allParticipants.length]);

  const otherParticipants = allParticipants.filter(
    (p) => !(screenSharing && p.socketId === socket.id)
  );

  // ===== Actions =====
  const handleLeave = async () => {
    consumersRef.current.forEach((c) => c.close());
    consumersRef.current.clear();
    await stopCam(localRef);
    socket.emit("leave_room", { roomId });
    navigate("/");
  };

  const toggleMic = async () => {
    if (!audioProducerRef.current) await shareCam(localRef);
    else if (audioProducerRef.current.paused) {
      await audioProducerRef.current.resume();
      setMicOn(true);
    } else {
      await audioProducerRef.current.pause();
      setMicOn(false);
    }
  };

  const toggleCamera = async () => {
    if (!videoProducerRef.current) await shareCam(localRef);
    else if (videoProducerRef.current.paused) {
      await videoProducerRef.current.resume();
      setCameraOn(true);
    } else {
      await videoProducerRef.current.pause();
      setCameraOn(false);
    }
  };

  const handleRaiseHand = () => {
    setIsHandRaised((prev) => !prev);
    socket.emit("toggle-hand", { roomId });
  };

  // const toggleScreenShare = async () => {
  //   if (!screenSharing) {
  //     await shareScreen(screenLocalRef);
  //     setScreenSharing(true);
  //   } else {
  //     await stopScreenShare(screenLocalRef);
  //     setScreenSharing(false);
  //   }
  // };

  // ===== Render =====
  return (
    <div className="flex flex-col  md:mt-10 mt-5 w-full h-screen overflow-hidden">
      <h1 className="text-text-main text-xl mb-2">Session: {roomId}</h1>
      <div className="text-sm text-text-sub space-y-1 mb-6 flex flex-col gap-2 md:flex-row">
        <p>Device loaded: {deviceLoaded ? "Yes" : "No"}</p>{" "}
        <p>Remote streams: {remoteStreams.length}</p>{" "}
        <p>
          {" "}
          Camera: {cameraOn ? "On" : "Off"}, Mic: {micOn ? "On" : "Off"}{" "}
        </p>{" "}
      </div>
      <div className="flex w-full md:flex-row flex-col">
        {/* Main video area */}
        <div className="flex-1 flex justify-center items-center  relative">
          {/* {screenSharing ? (
            <div className="w-full h-full flex items-center justify-center bg-black">
              <video
                ref={screenLocalRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-contain rounded-lg"
              />
              <span className="absolute top-4 left-4 text-white text-lg bg-black/60 px-3 py-1 rounded">
                You’re presenting your screen
              </span>
            </div>
          ) : ( */}
          <div className="grid md:grid-cols-3 grid-cols-2 gap-2 p-4 w-full">
            {allParticipants.map((p) => (
              <ParticipantTile
                key={p.socketId}
                participant={p}
                isLocal={p.socketId === socket.id}
                cameraOn={cameraOn}
                colorMap={colorMap}
              />
            ))}
          </div>
          {/* )} */}
        </div>

        {/* Right-side participants when sharing screen */}
        {/* {screenSharing && (
          <div className="w-64 bg-white/10 p-3 overflow-y-auto h-full border-l border-gray-700">
            <h3 className="text-center text-white mb-2">Participants</h3>
            {allParticipants.map((p) => (
              <ParticipantTile
                key={p.socketId}
                participant={p}
                isLocal={p.socketId === socket.id}
                cameraOn={cameraOn}
                colorMap={colorMap}
              />
            ))}
          </div>
        )} */}

        {/* Bottom controls */}
        <div className="flex gap-3 fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black/40 rounded px-6 py-3 shadow-lg backdrop-blur">
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center px-4 py-1 rounded text-lg gap-2 bg-white/20 text-white transition-all duration-200"
          >
            <Share2 size={20} /> 
          </button>
          <button
            onClick={toggleMic}
            className={`flex items-center px-4 py-1 rounded text-lg gap-2 transition-all duration-200 ${
              micOn ? "bg-green-500" : "bg-white/20"
            } text-white`}
          >
            {micOn ? <MicOff /> : <Mic />}
          </button>

          <button
            onClick={toggleCamera}
            className={`flex items-center px-4 py-1 rounded text-lg gap-2 transition-all duration-200 ${
              cameraOn ? "bg-blue-500" : "bg-white/20"
            } text-white`}
          >
            {!cameraOn ? <VideoIcon /> : <VideoOff />}
          </button>

          {/* <button
            onClick={toggleScreenShare}
            className={`flex items-center px-4 py-1 rounded text-lg gap-2 transition-all duration-200 ${
              screenSharing ? "bg-yellow-500" : "bg-gray-500"
            } text-white`}
          >
            {screenSharing ? <MonitorX /> : <MonitorUp />}
          </button> */}

          <button
            onClick={handleRaiseHand}
            className="px-4 py-1 rounded bg-white/20 text-white text-lg"
          >
            <Hand fill={isHandRaised ? "#00FF00" : "none"} size={25} />
          </button>

          <button
            onClick={handleLeave}
            className="px-4 py-2 rounded bg-red-600/60 text-white flex items-center text-lg gap-2 border border-red-600"
          >
            <Unplug /> Leave
          </button>
        </div>
        {showShareModal && (
          <ShareModal sessionId={roomId} onClose={() => setShowShareModal(false)} />
        )}
      </div>
    </div>
  );
};

export default Room;
