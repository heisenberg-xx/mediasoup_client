import { useEffect, useRef, useState } from "react";
import { socket } from "../socket/socket";
import { useNavigate, useParams } from "react-router";
import { getFirstLetter, getRandomTailwindColor } from "../utils/utils";
import * as mediasoupClient from "mediasoup-client";
import Video from "../component/Video";

const useTransports = (deviceRef, waitDeviceLoaded, roomId) => {
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);

  const createSendTransport = async () => {
    await waitDeviceLoaded();
    return new Promise((resolve, reject) => {
      socket.emit("create-send-transport", { roomId }, async (params) => {
        console.log("[Transport] sendTransport params:", params);
        if (params.error) return reject(new Error(params.error));
        try {
          sendTransportRef.current = deviceRef.current.createSendTransport({
            id: params.id,
            iceParameters: params.iceParameters,
            iceCandidates: params.iceCandidates,
            dtlsParameters: params.dtlsParameters,
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          });

          sendTransportRef.current.on(
            "connect",
            ({ dtlsParameters }, callback, errback) => {
              console.log("[SendTransport] connecting...");
              socket.emit(
                "connect-transport",
                { transportId: sendTransportRef.current.id, dtlsParameters },
                (res) => {
                  if (res?.error) {
                    console.error("[SendTransport] connect error:", res.error);
                    errback(new Error(res.error));
                  } else {
                    console.log("[SendTransport] connected successfully");
                    callback();
                  }
                }
              );
            }
          );

          sendTransportRef.current.on(
            "produce",
            ({ kind, rtpParameters }, callback, errback) => {
              console.log("[SendTransport] produce event:", kind);
              socket.emit(
                "produce",
                { roomId, kind, rtpParameters },
                (data) => {
                  if (data?.error) {
                    console.error("[SendTransport] produce error:", data.error);
                    errback(new Error(data.error));
                  } else {
                    console.log(
                      "[SendTransport] produce success, id:",
                      data.id
                    );
                    callback({ id: data.id });
                  }
                }
              );
            }
          );
          resolve(sendTransportRef.current);
        } catch (err) {
          console.error("[SendTransport] creation error:", err);
          reject(err);
        }
      });
    });
  };

  const createRecvTransport = async () => {
    await waitDeviceLoaded();
    return new Promise((resolve, reject) => {
      socket.emit("create-recv-transport", { roomId }, (params) => {
        console.log("[Transport] recvTransport params:", params);
        if (params.error) return reject(new Error(params.error));
        try {
          recvTransportRef.current = deviceRef.current.createRecvTransport({
            id: params.id,
            iceParameters: params.iceParameters,
            iceCandidates: params.iceCandidates,
            dtlsParameters: params.dtlsParameters,
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          });

          recvTransportRef.current.on(
            "connect",
            ({ dtlsParameters }, callback, errback) => {
              console.log("[RecvTransport] connecting...");
              socket.emit(
                "connect-transport",
                { transportId: recvTransportRef.current.id, dtlsParameters },
                (res) => {
                  if (res?.error) {
                    console.error("[RecvTransport] connect error:", res.error);
                    errback(new Error(res.error));
                  } else {
                    console.log("[RecvTransport] connected successfully");
                    callback();
                  }
                }
              );
            }
          );

          resolve(recvTransportRef.current);
        } catch (err) {
          console.error("[RecvTransport] creation error:", err);
          reject(err);
        }
      });
    });
  };

  return {
    sendTransportRef,
    recvTransportRef,
    createSendTransport,
    createRecvTransport,
  };
};

export default useTransports;
