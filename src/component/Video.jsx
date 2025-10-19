import { useEffect, useRef } from "react";

const Video = ({ stream, name, muted = false }) => {
  const videoRef = useRef();

  useEffect(() => {
    if (!videoRef.current || !stream) return;

    // Assign stream only if it changed
    if (videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }

    const playVideo = async () => {
      try {
        await videoRef.current.play();
      } catch (err) {
        console.warn("Video autoplay prevented:", err);
      }
    };

    playVideo();

    return () => {
      // Optional cleanup: remove tracks if component unmounts
      videoRef.current.srcObject = null;
    };
  }, [stream]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted} // muted for local video
        style={{
          width: 300,
          height: 200,
          borderRadius: 8,
          border: "1px solid gray",
          backgroundColor: "black",
        }}
      />
      {name && <span style={{ color: "white", marginTop: 4 }}>{name}</span>}
    </div>
  );
};

export default Video;
