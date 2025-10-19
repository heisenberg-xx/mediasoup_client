import { useState, useRef } from "react";
import { socket } from "../socket/socket";

export const useMedia = (deviceRef, sendTransportRef, roomId) => {
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const audioProducerRef = useRef(null);
  const videoProducerRef = useRef(null);
  const screenProducerRef = useRef(null);

  const audioTrackRef = useRef(null);
  const videoTrackRef = useRef(null);
  const screenTrackRef = useRef(null);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const rafIdRef = useRef(null);

  const getUserMediaStream = async ({ audio = true, video = true }) =>
    navigator.mediaDevices.getUserMedia({ audio, video });

  const produceTrack = async (track, kind) => {
    if (!sendTransportRef.current || !deviceRef.current.canProduce(kind)) return null;
    const producer = await sendTransportRef.current.produce({ track });
    await producer.resume();
    return producer;
  };

  /** Share camera + mic */
  const shareCam = async () => {
    if (!deviceRef.current) return;
    const stream = await getUserMediaStream({ audio: true, video: true });
    audioTrackRef.current = stream.getAudioTracks()[0];
    videoTrackRef.current = stream.getVideoTracks()[0];

    audioProducerRef.current = await produceTrack(audioTrackRef.current, "audio");
    videoProducerRef.current = await produceTrack(videoTrackRef.current, "video");

    startVoiceDetection(audioTrackRef.current);

    setMicOn(true);
    setCameraOn(true);
    return stream;
  };

  /** Share audio only */
  const shareAudio = async () => {
    if (!deviceRef.current) return;
    const stream = await getUserMediaStream({ audio: true, video: false });
    audioTrackRef.current = stream.getAudioTracks()[0];
    audioProducerRef.current = await produceTrack(audioTrackRef.current, "audio");
    startVoiceDetection(audioTrackRef.current);
    setMicOn(true);
    return stream;
  };

  /** Toggle mic */
  const toggleMic = async () => {
    if (!audioTrackRef.current) await shareAudio();
    if (audioTrackRef.current) {
      audioTrackRef.current.enabled = !audioTrackRef.current.enabled;
      setMicOn(audioTrackRef.current.enabled);
    }
  };

  /** Toggle camera */
  const toggleCamera = async () => {
    if (!videoTrackRef.current) await shareCam();
    if (videoTrackRef.current) {
      videoTrackRef.current.enabled = !videoTrackRef.current.enabled;
      setCameraOn(videoTrackRef.current.enabled);
    }
  };

  /** Share screen */
  const shareScreen = async () => {
    if (!deviceRef.current) return;
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    screenTrackRef.current = stream.getVideoTracks()[0];
    screenProducerRef.current = await produceTrack(screenTrackRef.current, "video");
    setScreenOn(true);
    return stream;
  };

  const stopScreenShare = () => {
    screenTrackRef.current?.stop();
    screenProducerRef.current?.close();
    screenTrackRef.current = null;
    screenProducerRef.current = null;
    setScreenOn(false);
  };

  /** Stop all tracks */
  const stopAll = () => {
    [audioTrackRef, videoTrackRef, screenTrackRef].forEach((ref) => ref.current?.stop());
    [audioProducerRef, videoProducerRef, screenProducerRef].forEach((ref) => ref.current?.close());
    stopVoiceDetection();
  };

  /** Voice activity detection */
  const startVoiceDetection = (track) => {
    if (!track) return;
    audioContextRef.current = new AudioContext();
    analyserRef.current = audioContextRef.current.createAnalyser();
    sourceRef.current = audioContextRef.current.createMediaStreamSource(new MediaStream([track]));
    sourceRef.current.connect(analyserRef.current);
    analyserRef.current.fftSize = 512;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const checkVolume = () => {
      analyserRef.current.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setIsSpeaking(volume > 25); // adjust threshold
      rafIdRef.current = requestAnimationFrame(checkVolume);
    };
    checkVolume();
  };

  const stopVoiceDetection = () => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;
  };

  return {
    micOn,
    cameraOn,
    screenOn,
    isSpeaking,
    shareCam,
    toggleMic,
    toggleCamera,
    shareScreen,
    stopScreenShare,
    stopAll,
    audioTrackRef,
    videoTrackRef,
    screenTrackRef,
  };
};
