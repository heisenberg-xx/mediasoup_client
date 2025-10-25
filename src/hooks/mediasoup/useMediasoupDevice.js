import * as mediasoupClient from "mediasoup-client";
import { useEffect, useRef, useState } from "react";
import { socket } from "../../socket/socket";
const useMediasoupDevice = () => {
  const deviceRef = useRef(null);
  const deviceLoadedRef = useRef(false);
  const [deviceLoaded, setDeviceLoaded] = useState(false);

  useEffect(() => {
    socket.on("router-rtp-capabilities", async (rtpCapabilities) => {
      // console.log("[Socket] router-rtp-capabilities:", rtpCapabilities);
      try {
        deviceRef.current = new mediasoupClient.Device();
        await deviceRef.current.load({
          routerRtpCapabilities: rtpCapabilities,
        });
        // console.log(
        //   "Device loaded successfully 18",
         
        //   deviceRef.current.rtpCapabilities
        // );
        setDeviceLoaded(true);
        deviceLoadedRef.current = true;
      } catch (err) {
        console.error("Error loading device:", err);
      }
    });
    return () => socket.off("router-rtp-capabilities");
  }, []);

  const waitDeviceLoaded = async () => {
    if (!deviceLoadedRef.current) {
      console.log("Waiting for device to load...");
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (deviceLoadedRef.current) {
            clearInterval(interval);
            console.log("Device is now loaded");
            resolve();
          }
        }, 50);
      });
    }
  };

  return { deviceRef, deviceLoaded, deviceLoadedRef, waitDeviceLoaded };
};

export default useMediasoupDevice;
