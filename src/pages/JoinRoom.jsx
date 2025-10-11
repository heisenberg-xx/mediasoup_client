import { useState } from "react";
import { useNavigate } from "react-router";
import { socket } from "../socket/socket";

const JoinRoom = () => {
  const navigate = useNavigate();
  const [room, setRoom] = useState("");
  const [name, setName] = useState("");

  const handleJoinRoom = () => {
    socket.emit("join_room", { room, name });
    navigate(`/room/${room}`);
  };
  return (
    <div className="flex flex-col items-start mt-20 gap-3 border rounded px-3 py-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="roomId">Room Id</label>
        <input
          onChange={(e) => setRoom(e.target.value)}
          className="border rounded px-2 py-1"
          type="text"
          id="roomId"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="name">Name</label>
        <input
          onChange={(e) => setName(e.target.value)}
          className="border rounded px-2 py-1"
          type="text"
          id="name"
        />
      </div>
      <button
        onClick={handleJoinRoom}
        className="bg-green-500 text-white rounded px-2 border-2 border-black"
      >
        Join Room
      </button>
    </div>
  );
};

export default JoinRoom;
