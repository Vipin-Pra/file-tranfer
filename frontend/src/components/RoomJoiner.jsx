import React, { useState, useEffect } from 'react';
import { LogIn, Loader } from 'lucide-react';

const RoomJoiner = ({ onJoinRoom, isJoining, error }) => {
    const [pin, setPin] = useState('');

    // Check URL for PIN parameter
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlPin = urlParams.get('pin');
        if (urlPin && urlPin.length === 6) {
            setPin(urlPin);
        }
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (pin.length === 6) {
            onJoinRoom(pin);
        }
    };

    const handlePinChange = (e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setPin(value);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-dark-800 rounded-lg">
            <div className="text-center max-w-md w-full">
                <div className="bg-green-500/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                    <LogIn className="w-10 h-10 text-green-500" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-4">Join a Room</h2>
                <p className="text-gray-400 mb-6">
                    Enter the 6-digit PIN to connect with a peer
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="text"
                            value={pin}
                            onChange={handlePinChange}
                            placeholder="Enter 6-digit PIN"
                            maxLength={6}
                            className="w-full bg-dark-700 text-white text-center text-3xl font-mono tracking-widest px-4 py-4 rounded-lg border-2 border-dark-600 focus:border-green-500 focus:outline-none transition-all"
                            autoFocus
                        />
                        <p className="text-sm text-gray-500 mt-2">
                            {pin.length}/6 digits
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={pin.length !== 6 || isJoining}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-dark-600 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                    >
                        {isJoining ? (
                            <>
                                <Loader className="w-5 h-5 animate-spin" />
                                Joining...
                            </>
                        ) : (
                            <>
                                <LogIn size={20} />
                                Join Room
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-dark-600">
                    <p className="text-sm text-gray-500">
                        Don't have a PIN? Ask your peer to create a room and share it with you.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RoomJoiner;
