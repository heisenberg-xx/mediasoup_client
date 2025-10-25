import React from "react";
import logo from "../assets/session_logo.png";
import video from "../assets/video.png";
import { useLocation } from "react-router";

const Header = () => {
  const params = useLocation();
  const isRoomPage = params.pathname.startsWith("/session");
  console.log({ params });
  return (
    <div className="w-full max-h-[10%]">
      <img
        className={`${isRoomPage ? "w-[55px] md:w-[60px]" : "w-[200px]"}`}
        src={isRoomPage ? video : logo}
        alt="session-logo"
      />
    </div>
  );
};

export default Header;
