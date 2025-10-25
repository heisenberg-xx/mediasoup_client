import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { socket } from "../socket/socket";
import { useGetSessionById } from "../hooks/useRoom";
import logo from "../assets/session_logo.png";
import { getRandomTailwindColor } from "../utils/utils";
import { LoaderCircle } from "lucide-react";

// Utility to get a random Tailwind color

const JoinRoom = () => {
  const { id: room } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");

  const { data: sessionData, isLoading, error } = useGetSessionById(room);

  const handleJoinRoom = () => {
    if (!name.trim()) return alert("Please enter your name before joining!");
    socket.emit("join_room", { room, name });
    navigate(`/session/${room}`);
  };

  const allParticipants = sessionData?.meet?.participants || [];

  // ✅ Memoize a stable color map based on participant IDs
  const colorMap = useMemo(() => {
    const map = {};
    allParticipants.forEach((p) => {
      const id = p?.socketId || p?._id || p?.id || p?.name;
      map[id] = getRandomTailwindColor();
    });
    return map;
  }, [allParticipants.length]);

  return (
    <section className="flex flex-col items-start gap-3 rounded px-3 py-5 w-full max-w-3xl mx-auto md:mt-20">
      <div className="flex md:flex-row flex-col gap-4 md:items-end items-start mb-5">
        <p className="text-text-main font-title md:text-3xl text-2xl uppercase tracking-wider">
          join
        </p>
        <h1 className="md:text-5xl text-4xl font-title uppercase text-primary tracking-wider whitespace-nowrap">
          {sessionData?.meet?.roomName || "Loading..."}
        </h1>
        <p className="text-text-main font-title md:text-3xl text-2xl uppercase tracking-wider">
          session
        </p>
      </div>

      <div className="flex md:flex-row flex-col-reverse justify-around w-full gap-6">
        {/* LEFT — Join Form */}
        <div className="flex-1">
          <div className="flex flex-col gap-2 w-full">
            <label className="text-lg text-primary" htmlFor="name">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-secondary focus:border-2 focus:outline-none focus:border-primary border border-white rounded px-2 w-full h-10 text-text-main placeholder:text-text-sub"
              type="text"
              id="name"
              placeholder="Enter Your Name"
            />
          </div>
          <button
            onClick={handleJoinRoom}
            className="bg-primary/50 w-full hover:bg-primary transition-all duration-300 border-primary border-2 text-text-main rounded px-2 text-lg py-1 mt-2 hover:scale-[1.02]"
          >
            Join Session
          </button>
        </div>

        {/* RIGHT — Participants */}
        <div className="flex flex-col items-center max-w-xl flex-1">
          {isLoading ? (
            <LoaderCircle size={35} className="text-primary animate-spin" />
          ) : allParticipants.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="flex item flex-wrap gap-2">
                {allParticipants.slice(0, 6).map((p, i) => {
                  const id = p?.socketId || p?._id || p?.id || p?.name;
                  const bgColor = colorMap[id]?.bg ?? "bg-gray-500/50";
                  const border = colorMap[id]?.border ?? "border-gray-500";

                  return (
                    <div
                      key={i}
                      className={`w-10 h-10 flex items-center justify-center rounded-full ${bgColor} text-white font-semibold text-lg border ${border} uppercase 
          ${i !== 0 ? "-ml-4" : ""} transition-transform hover:scale-110`}
                      title={p?.name}
                    >
                      {p?.name?.charAt(0) || "?"}
                    </div>
                  );
                })}
                {allParticipants.length > 6 && (
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-600 text-white font-semibold text-lg">
                    +{allParticipants.length - 6}
                  </div>
                )}
              </div>
              <div className="flex item flex-wrap gap-2">
                {allParticipants.slice(0, 6).map((p, i) => {
                  return (
                    <h1
                      key={i}
                      className={` flex items-center justify-center rounded-full  text-white  text-lg `}
                    >
                      {p?.name || "?"}
                      {allParticipants.length - 1 === i ? "" : ","}
                    </h1>
                  );
                })}
                {allParticipants.length > 6 && (
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-600 text-white font-semibold text-lg">
                    +{allParticipants.length - 6}
                  </div>
                )}
                <p className=" text-text-sub italic  text-lg">in the session</p>
              </div>
            </div>
          ) : (
            <p className="text-text-sub italic text-lg text-center">
              No one join in this session yet...
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default JoinRoom;
