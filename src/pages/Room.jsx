// Room.jsx
import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import useTransports from "../hooks/useTransports ";
import useConsumers from "../hooks/useConsumers";
import useProducers from "../hooks/useProducers";
import useRoomSocket from "../hooks/useSocketRoom";
import { getFirstLetter, getRandomTailwindColor } from "../utils/utils";
import { socket } from "../socket/socket";
import Video from "../component/Video";
import {
  Hand,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Unplug,
} from "lucide-react";
import useMediasoupDevice from "../hooks/useMediasoupDevice ";

const Room = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const [participants, setParticipants] = useState([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [localStream, setLocalStream] = useState(null);

  const localRef = useRef();

  const { deviceRef, deviceLoaded, waitDeviceLoaded } = useMediasoupDevice();
  const {
    sendTransportRef,
    recvTransportRef,
    createSendTransport,
    createRecvTransport,
  } = useTransports(deviceRef, waitDeviceLoaded, roomId);
  const { shareCam,stopCam } = useProducers(
    deviceRef,
    sendTransportRef,
    waitDeviceLoaded,
    setMicOn,
    setCameraOn,
    createSendTransport,
    setLocalStream,
    
  );
  const { consumersRef, remoteStreams, setRemoteStreams, consume } =
    useConsumers(createRecvTransport, recvTransportRef);
  useRoomSocket(setParticipants, consume, createRecvTransport);

  // Combine local + remote participants with stream info
  const allParticipants = useMemo(() => {
    // Combine local + remote participants
    const localParticipant = {
      socketId: socket.id,
      stream: localStream, // might be null initially
      name: participants.find((p) => p.socketId === socket.id)?.name || "You",
      toggleHand:
        participants.find((p) => p.socketId === socket.id)?.toggleHand || false,
    };

    const remoteParticipants = remoteStreams.map((r) => {
      const p = participants.find((p) => p.socketId === r.userSocketId);
      return {
        socketId: r.userSocketId,
        stream: r.stream || null, // might be null if remote hasn't shared camera yet
        name: p?.name || r.name || "Participant",
        toggleHand: p?.toggleHand || false,
      };
    });

    return [localParticipant, ...remoteParticipants];
  }, [participants, remoteStreams, localStream]);
  console.table(participants);
  console.log(remoteStreams);

  console.table("allpaticipants", allParticipants);

  const handleLeave = () => {
    console.log("[Action] Leave Room");
    consumersRef.current.forEach((c) => c.close());
    consumersRef.current.clear();
    socket.emit("leave_room", { roomId });
    navigate("/");
  };

  const toggleCamera = async () => {
    console.log("[Action] toggleCamera");
    if (!cameraOn) {
      await shareCam(localRef);
    } else {
      // turn off camera
      const stream = localRef.current?.srcObject;
      stopCam(localRef);
      stream?.getTracks().forEach((t) => t.stop());
      localRef.current.srcObject = null;
      setLocalStream(null);
      setCameraOn(false);
    }
  };

  const toggleMic = async () => {
    console.log("[Action] toggleMic");
    if (!micOn) await shareCam(localRef);
    else setMicOn((v) => !v);
  };

  const handleRaiseHand = () => {
    setIsHandRaised((prev) => !prev);
    console.log("[Action] Raise/Lower Hand");
    socket.emit("toggle-hand", { roomId });
  };

  return (
    <div className="space-y-5 mt-20 px-4">
      <h2 className="text-xl font-semibold mb-4">Room: {roomId}</h2>

      <div className="grid grid-cols-3 gap-4 mb-8 w-screen">
        {allParticipants.map(({ socketId, stream, name, toggleHand }) => {
          const bgColor = getRandomTailwindColor();
          return (
            <div
              key={socketId}
              className={`relative rounded-lg overflow-hidden shadow-md border border-gray-300 bg-black select-none w-full h-60`}
            >
              {/* Video component */}
              {stream ? (
                <Video stream={stream} muted={socketId === socket.id} />
              ) : (
                <div
                  className={`absolute bottom-0 left-0 right-0 ${bgColor} bg-opacity-50 text-white px-3 py-1 flex justify-center items-center text-sm font-semibold w-full h-full  `}
                >
                  <span className="text-center">{name}</span>
                  {toggleHand && <span>👌</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-sm text-gray-600 space-y-1 mb-6">
        <p>Device loaded: {deviceLoaded ? "Yes" : "No"}</p>
        <p>Remote streams: {remoteStreams.length}</p>
        <p>
          Camera: {cameraOn ? "On" : "Off"}, Mic: {micOn ? "On" : "Off"}
        </p>
      </div>

      <div className="flex gap-3 fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white/20 rounded px-6 py-3 shadow-lg">
        <button
          onClick={toggleMic}
          className={`flex items-center px-4 py-1 rounded text-lg gap-2 transition-all duration-200 hover:scale-[1.05] ${
            micOn ? "bg-green-500" : "bg-gray-500"
          } text-white`}
        >
          {micOn ? <MicOff /> : <Mic />}
          {micOn ? "Mute" : "Unmute"}
        </button>
        <button
          onClick={toggleCamera}
          className={`flex items-center px-4 py-1 rounded text-lg gap-2 transition-all duration-200 hover:scale-[1.05] ${
            cameraOn ? "bg-blue-500" : "bg-gray-500"
          } text-white`}
        >
          {!cameraOn ? <VideoIcon /> : <VideoOff />}
          {cameraOn ? "Camera Off" : "Camera On"}
        </button>
        <button
          onClick={handleRaiseHand}
          className="px-4 py-1 rounded bg-white/20 text-black text-lg gap-2 transition-all duration-200 hover:scale-[1.05]"
        >
          {isHandRaised ? (
            <Hand className="text-white" size={30} strokeWidth={1.2} />
          ) : (
            <Hand fill="#00FF00" size={30} strokeWidth={1.2} />
          )}
        </button>
        <button
          onClick={handleLeave}
          className="px-4 py-2 rounded bg-red-600 text-white flex items-center text-lg gap-2 transition-all duration-200 hover:scale-[1.05]"
        >
          <Unplug /> Leave
        </button>
      </div>
    </div>
  );
};

export default Room;
