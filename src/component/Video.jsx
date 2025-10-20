import { useEffect, useRef } from "react";

const Video = ({ stream, muted = false }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !stream) return;

    console.log("[Video] Stream assigned:", stream.id || stream);

    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }

    const playVideo = async () => {
      try {
        await videoEl.play();
      } catch (err) {
        console.warn("[Video] Autoplay prevented:", err.message);
      }
    };

    playVideo();

    // Cleanup safely
    return () => {
      if (videoEl) videoEl.srcObject = null;
    };
  }, [stream]);

  return (
    <video
      ref={videoRef}
      muted={muted}
      autoPlay
      playsInline
      className="w-full h-full object-cover rounded-lg"
    />
  );
};

export default Video;
