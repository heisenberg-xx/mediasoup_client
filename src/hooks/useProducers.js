import { useEffect, useRef, useState } from "react";
import { socket } from "../socket/socket";
import { useNavigate, useParams } from "react-router";
import { getFirstLetter, getRandomTailwindColor } from "../utils/utils";
import * as mediasoupClient from "mediasoup-client";
import Video from "../component/Video";

const useProducers = (
  deviceRef,
  sendTransportRef,
  waitDeviceLoaded,
  setMicOn,
  setCameraOn,
  createSendTransport,
  setLocalStream
) => {
  const audioTrackRef = useRef(null);
  const videoTrackRef = useRef(null);
  const audioProducerRef = useRef(null);
  const videoProducerRef = useRef(null);

  const shareCam = async (localRef) => {
    try {
      console.log("shareCam called");
      await waitDeviceLoaded();
      if (!deviceRef.current.canProduce("video"))
        return console.error("Cannot produce video");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log("Media stream obtained", stream);
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];
      audioTrack.onmute = () => console.log("[Local] audio track muted");
      audioTrack.onunmute = () => console.log("[Local] audio track unmuted");
      videoTrack.onmute = () => console.log("[Local] video track muted");
      videoTrack.onunmute = () => console.log("[Local] video track unmuted");
      audioTrackRef.current = audioTrack;
      videoTrackRef.current = videoTrack;
      if (localRef.current) {
        localRef.current.srcObject = stream;
        console.log("[Local] assigned stream to video element");
      }
      setLocalStream(stream);
      if (!sendTransportRef.current) {
        console.warn("Send transport missing, creating one...");
        const transport = await createSendTransport();
        sendTransportRef.current = transport; // ensure it’s assigned
      }
      if (audioTrack && deviceRef.current.canProduce("audio")) {
        audioProducerRef.current = await sendTransportRef.current.produce({
          track: audioTrack,
        });
        console.log(
          "[Produce] audio producer created:",
          audioProducerRef.current.id
        );
        await audioProducerRef.current.resume();
        console.log("[Produce] audio producer resumed");
        setMicOn(true);
      }
      if (videoTrack && deviceRef.current.canProduce("video")) {
        videoProducerRef.current = await sendTransportRef.current.produce({
          track: videoTrack,
        });
        console.log(
          "[Produce] video producer created:",
          videoProducerRef.current.id
        );
        await videoProducerRef.current.resume();
        console.log("[Produce] video producer resumed");
        setCameraOn(true);
      }
    } catch (err) {
      console.error("[shareCam] error:", err);
    }
  };
  const stopCam = async (localRef) => {
  try {
    console.log("stopCam called");

    if (videoProducerRef.current) {
      await videoProducerRef.current.close();
      console.log("[Producer] video producer closed");
      videoProducerRef.current = null;
    }

    if (audioProducerRef.current) {
      await audioProducerRef.current.close();
      console.log("[Producer] audio producer closed");
      audioProducerRef.current = null;
    }

    const stream = localRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    if (localRef.current) {
      localRef.current.srcObject = null;
    }

    setCameraOn(false);
    setMicOn(false);
    setLocalStream(null);

    console.log("[Local] Camera stopped and hardware released");
  } catch (err) {
    console.error("[stopCam] error:", err);
  }
};

  return { shareCam, audioTrackRef, stopCam,videoTrackRef };
};

export default useProducers;
