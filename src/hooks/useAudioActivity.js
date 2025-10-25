// hooks/useAudioActivity.js
import { useEffect, useState } from "react";

export default function useAudioActivity(stream) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!stream) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    source.connect(analyser);

    let animationId;
    const checkAudio = () => {
      analyser.getByteFrequencyData(dataArray);
      const avg =
        dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

      // Adjust threshold as needed (10–30 is good range)
      setIsActive(avg > 20);

      animationId = requestAnimationFrame(checkAudio);
    };
    checkAudio();

    return () => {
      cancelAnimationFrame(animationId);
      source.disconnect();
      audioContext.close();
    };
  }, [stream]);

  return isActive;
}
