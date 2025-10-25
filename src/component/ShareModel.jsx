import {
  LinkedinIcon,
  LinkedinShareButton,
  TwitterIcon,
  TwitterShareButton,
  WhatsappIcon,
  WhatsappShareButton,
} from "react-share";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

const ShareModal = ({ sessionId, onClose }) => {
  const [copied, setCopied] = useState(false);
  const url = `https://session-dev.vercel.app/join-session/${sessionId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const iconStyle = "w-9 h-9 text-white rounded-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xs bg-black/50 w-full h-screen">
      <div className="bg-secondary rounded-lg shadow-lg p-6 w-80 relative">
        <h2 className="text-xl font-semibold mb-4 text-center text-text-main">
          Invite People
        </h2>

        {/* URL with copy button */}
        <div className="flex items-center justify-between bg-text-sub px-2 py-1 rounded my-2">
          <p className="truncate text-black">{url}</p>
          <button
            onClick={handleCopy}
            className="ml-2 p-1 hover:bg-gray-200 rounded"
            title="Copy URL"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <Copy className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
        {copied && (
          <p className="text-green-600 text-sm text-center mb-2">Copied!</p>
        )}

        {/* Social media buttons */}
        <div className="flex justify-around mt-4">
          <TwitterShareButton
            url={url}
            className="bg-blue-400 p-3 rounded-full hover:bg-blue-500 transition"
          >
            <TwitterIcon className={iconStyle} />
          </TwitterShareButton>

          <WhatsappShareButton
            url={url}
            className="bg-green-500 p-3 rounded-full hover:bg-green-600 transition"
          >
            <WhatsappIcon size={25} className={iconStyle} />
          </WhatsappShareButton>

          <LinkedinShareButton
            url={url}
            className="bg-blue-700 p-3 rounded-full hover:bg-blue-800 transition"
          >
            <LinkedinIcon className={iconStyle} />
          </LinkedinShareButton>
        </div>

        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default ShareModal;
