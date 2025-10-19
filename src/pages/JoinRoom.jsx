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
    <div className="flex flex-col items-start  gap-3  rounded px-3 py-5 w-lg">
      <h1 className="text-3xl bbh-font text-green-500 mb-10 tracking-wide">Welcome </h1>
      <div className="flex flex-col gap-2 w-full">
        <label className="text-lg text-green-500" htmlFor="roomId">Room Id</label>
        <input
          onChange={(e) => setRoom(e.target.value)}
          className="border border-white rounded px-2 py-1 w-full h-9 text-white"
          type="text"
          id="roomId"
          placeholder="Enter the Room Id"
        />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <label className="text-lg text-green-500" htmlFor="name">Name</label>
        <input
          onChange={(e) => setName(e.target.value)}
          className="border border-white rounded px-2 py-1 h-9 text-white"
          type="text"
          id="name"
          placeholder="Enter Your Name"
        />
      </div>
      <button
        onClick={handleJoinRoom}
        className="bg-green-500 text-white rounded px-2 text-lg py-1 mt-2 hover:scale-[1.02]"
      >
        Join Room
      </button>
    </div>
  );
};

export default JoinRoom;
