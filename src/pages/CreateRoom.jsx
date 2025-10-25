import React, { useState } from "react";
import { useCreateSession } from "../hooks/useRoom";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { LoaderCircle } from "lucide-react";

const CreateRoom = () => {
  const { mutate: createSession, isPending, error } = useCreateSession();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState("");
  const handleCreateMeet = () => {
    createSession(
      { roomName },
      {
        onSuccess: (data) => {
          console.log({ data });
          toast.success("Meeting Created SuccessFully!");
          navigate(`/join-session/${data.newMeet.uniqueCode}`);
        },
      }
    );
  };
  return (
    <section className="mx-auto flex flex-col items-start  gap-3  rounded px-3 py-5 w-lg md:mt-20">
      <div className="flex md:flex-row flex-col gap-4 md:items-end items-start mb-5">
        <p className="text-text-main font-title md:text-3xl text-2xl uppercase tracking-wider">
          create
        </p>
        <h1 className="md:text-5xl text-4xl font-title uppercase text-primary tracking-wider whitespace-nowrap">
          NEW{" "}
        </h1>
        <p className="text-text-main font-title md:text-3xl text-2xl uppercase tracking-wider">
          session
        </p>
      </div>
      <div className="w-full space-y-2">
        <div className="flex flex-col gap-2 w-full">
          <label className="text-lg text-text-main" htmlFor="meetName">
            Session Name
          </label>
          <input
            onChange={(e) => setRoomName(e.target.value)}
            className="bg-secondary focus:border-2 focus:outline-0 focus:border-primary  border border-white rounded px-2  w-full h-10 text-text-main placeholder:text-text-sub"
            type="text"
            id="meetName"
            placeholder="enter the session name"
          />
        </div>

        <button
          onClick={handleCreateMeet}
          className="bg-primary/50 w-full hover:bg-primary transition-all duration-300 border-primary border-2 text-text-main rounded px-2 text-lg py-1 mt-2 hover:scale-[1.02] flex items-center justify-center gap-2 "
          disabled={isPending}
        >
          {isPending && <LoaderCircle className="animate-spin" />} {isPending?"Creating...":"Create"}
        </button>
      </div>
    </section>
  );
};

export default CreateRoom;
