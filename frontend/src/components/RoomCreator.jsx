import React, { useState } from 'react';
import { Plus, Copy, CheckCircle, Loader } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const RoomCreator = ({ onCreateRoom, pin, isCreating }) => {
    const [copied, setCopied] = useState(false);

    const handleCopyPin = () => {
        navigator.clipboard.writeText(pin);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareUrl = `${window.location.origin}?pin=${pin}`;

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!pin) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 bg-dark-800 rounded-lg">
                <div className="text-center max-w-md">
                    <div className="bg-blue-500/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                        <Plus className="w-10 h-10 text-blue-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">Create a Room</h2>
                    <p className="text-gray-400 mb-6">
                        Start a new session to share files and make video calls with anyone
                    </p>
                    <button
                        onClick={onCreateRoom}
                        disabled={isCreating}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-dark-600 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 mx-auto"
                    >
                        {isCreating ? (
                            <>
                                <Loader className="w-5 h-5 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Plus size={20} />
                                Create Room
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-dark-800 rounded-lg">
            <div className="text-center max-w-md">
                <h2 className="text-2xl font-bold text-white mb-2">Room Created!</h2>
                <p className="text-gray-400 mb-6">Share this PIN or QR code with someone to connect</p>

                {/* QR Code */}
                <div className="bg-white p-6 rounded-lg mb-6 inline-block">
                    <QRCodeSVG
                        value={shareUrl}
                        size={200}
                        level="H"
                        includeMargin={true}
                    />
                </div>

                {/* PIN Display */}
                <div className="bg-dark-700 rounded-lg p-6 mb-4">
                    <p className="text-sm text-gray-400 mb-2">Room PIN</p>
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-4xl font-mono font-bold text-blue-500 tracking-widest">
                            {pin}
                        </span>
                        <button
                            onClick={handleCopyPin}
                            className="ml-4 p-2 bg-dark-600 hover:bg-dark-500 rounded-lg transition-all"
                            title="Copy PIN"
                        >
                            {copied ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                                <Copy className="w-5 h-5 text-gray-400" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Share URL */}
                <div className="bg-dark-700 rounded-lg p-4 mb-6">
                    <p className="text-sm text-gray-400 mb-2">Or share this link</p>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={shareUrl}
                            readOnly
                            className="flex-1 bg-dark-600 text-gray-300 px-3 py-2 rounded text-sm"
                        />
                        <button
                            onClick={handleCopyUrl}
                            className="p-2 bg-dark-600 hover:bg-dark-500 rounded-lg transition-all"
                            title="Copy URL"
                        >
                            {copied ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                                <Copy className="w-5 h-5 text-gray-400" />
                            )}
                        </button>
                    </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
                    <p className="text-blue-400 text-sm">
                        ⏳ Waiting for someone to join...
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RoomCreator;
