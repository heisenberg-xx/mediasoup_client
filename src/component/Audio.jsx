import { useEffect, useRef, useState } from "react";

const Audio = ({ stream, name = "Audio" }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0);

  useEffect(() => {
    if (audioRef.current && stream) {
      console.log("Setting audio srcObject for stream:", stream);
      console.log("Audio tracks:", stream.getAudioTracks());
      
      // Clear previous stream
      audioRef.current.srcObject = null;
      
      // Set new stream
      audioRef.current.srcObject = stream;
      
      // Add event listeners
      const audio = audioRef.current;
      
      const handleLoadedMetadata = () => {
        console.log("Audio metadata loaded");
        audio.play().catch(err => {
          console.log("Audio auto-play prevented:", err);
          setIsPlaying(false);
        });
      };
      
      const handlePlay = () => {
        console.log("Audio started playing");
        setIsPlaying(true);
      };
      
      const handlePause = () => {
        console.log("Audio paused");
        setIsPlaying(false);
      };

      // Volume indicator (very basic)
      const updateVolume = () => {
        const track = stream.getAudioTracks()[0];
        if (track) {
          // This is a simplified volume indicator
          setVolume(Math.random() * 100); // Replace with actual audio level detection if needed
        }
      };

      const volumeInterval = setInterval(updateVolume, 100);
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      
      // Cleanup
      return () => {
        clearInterval(volumeInterval);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
      };
    }
  }, [stream]);
  
  const handleClick = () => {
    if (audioRef.current && !isPlaying) {
      audioRef.current.play().catch(err => {
        console.error("Failed to play audio:", err);
      });
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: 10,
        padding: 10,
        border: "1px solid #ccc",
        borderRadius: 8,
        backgroundColor: "#f9f9f9"
      }}
    >
      <span style={{ fontWeight: "bold", marginBottom: 5 }}>{name}</span>
      
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div 
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: isPlaying ? "#4CAF50" : "#f44336"
          }}
        />
        <span style={{ fontSize: 12 }}>
          {isPlaying ? "Playing" : "Paused"}
        </span>
      </div>

      <audio
        ref={audioRef}
        autoPlay
        muted={false} // Don't mute audio streams
        controls
        style={{ marginTop: 5, width: 200 }}
        onClick={handleClick}
      />
      
      {!isPlaying && (
        <button 
          onClick={handleClick}
          style={{
            marginTop: 5,
            padding: "4px 8px",
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 12
          }}
        >
          Click to play audio
        </button>
      )}
    </div>
  );
};

export default Audio;