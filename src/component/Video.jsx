import { useEffect, useRef } from "react";

const Video = ({ stream, name }) => {
  const videoRef = useRef();

  useEffect(() => {
  if (!videoRef.current || !stream) return;

  console.log("Setting video srcObject with stream", stream);
  videoRef.current.srcObject = stream;
  videoRef.current.srcObject = videoRef.current.srcObject;
  console.log('videoRef.current.srcObject',videoRef.current.srcObject)
  videoRef.current.onloadedmetadata = () => {
    videoRef.current.play().catch((err) => {
      console.warn("Video autoplay prevented:", err);
    });
  };
}, [stream]);

return (
  <video
    ref={videoRef}
    autoPlay
    playsInline
    muted // keep muted to allow autoplay in browsers
    style={{ width: 400, border: "1px solid gray" }}
  />
);
}

export default Video;
