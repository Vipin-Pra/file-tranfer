import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import VideoCall from './components/VideoCall';
import FileTransfer from './components/FileTransfer';
import RoomCreator from './components/RoomCreator';
import RoomJoiner from './components/RoomJoiner';
import Chat from './components/Chat';
import { Video, FileText, Users, LogOut, Sun, Moon, Volume2, VolumeX } from 'lucide-react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { playSound, toggleSound, isSoundEnabled } from './utils/sounds';

const SIGNALING_SERVER = import.meta.env.VITE_SIGNALING_SERVER || 'http://localhost:3001';

// Ice servers for WebRTC (using public STUN servers)
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ]
};

function App() {
    console.log('App component rendering...');

    const { theme, toggleTheme } = useTheme();

    const [mode, setMode] = useState('home'); // 'home', 'create', 'join'
    const [connectionState, setConnectionState] = useState('disconnected'); // 'disconnected', 'connecting', 'connected'
    const [pin, setPin] = useState('');
    const [peerId, setPeerId] = useState('');
    const [error, setError] = useState('');
    const [isCallActive, setIsCallActive] = useState(false);
    const [activeTab, setActiveTab] = useState('video'); // 'video' or 'file'
    const [soundEnabled, setSoundEnabled] = useState(isSoundEnabled());

    const socketRef = useRef(null);
    const peerRef = useRef(null);
    const isInitiatorRef = useRef(false);
    const remotePeerIdRef = useRef(null);

    // Initialize socket connection
    useEffect(() => {
        socketRef.current = io(SIGNALING_SERVER, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        socketRef.current.on('connect', () => {
            console.log('Connected to signaling server');
        });

        socketRef.current.on('disconnect', () => {
            console.log('Disconnected from signaling server');
        });

        socketRef.current.on('error', (err) => {
            console.error('Socket error:', err);
            setError('Connection error. Please try again.');
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    // Setup socket event listeners
    useEffect(() => {
        if (!socketRef.current) return;

        // Room created successfully
        socketRef.current.on('room-created', ({ pin: roomPin }) => {
            setPin(roomPin);
            isInitiatorRef.current = true;
            // Keep disconnected state to show PIN/QR code until peer joins
            console.log('Room created with PIN:', roomPin);
        });

        // Room joined successfully
        socketRef.current.on('room-joined', ({ pin: roomPin, creatorId }) => {
            setPin(roomPin);
            setPeerId(creatorId);
            remotePeerIdRef.current = creatorId;
            isInitiatorRef.current = false;
            setConnectionState('connecting');
            console.log('Joined room with PIN:', roomPin, 'Creator ID:', creatorId);

            // As receiver, create peer and initiate connection
            createPeer(true);
        });

        // Peer joined the room (sender receives this)
        socketRef.current.on('peer-joined', ({ peerId: remotePeerId }) => {
            setPeerId(remotePeerId);
            remotePeerIdRef.current = remotePeerId;
            setConnectionState('connecting');
            console.log('Peer joined:', remotePeerId);

            // As sender, create peer connection
            createPeer(false);
        });

        // Receive WebRTC signal
        socketRef.current.on('signal', ({ signal, from }) => {
            console.log('Received signal from:', from);
            setPeerId(from);
            remotePeerIdRef.current = from;

            if (peerRef.current) {
                peerRef.current.signal(signal);
            }
        });

        // Peer disconnected
        socketRef.current.on('peer-disconnected', () => {
            console.log('Peer disconnected');
            playSound('peerDisconnected');
            handleDisconnect();
        });

        return () => {
            socketRef.current.off('room-created');
            socketRef.current.off('room-joined');
            socketRef.current.off('peer-joined');
            socketRef.current.off('signal');
            socketRef.current.off('peer-disconnected');
        };
    }, []);

    // Create peer connection
    const createPeer = (initiator) => {
        try {
            const peer = new Peer({
                initiator,
                trickle: true,
                config: ICE_SERVERS,
                // Increase channel buffer for large file transfers
                channelConfig: {
                    ordered: true,
                    maxRetransmits: 30
                },
                // Increase offer/answer constraints
                offerOptions: {
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true
                }
            });

            peer.on('signal', (signal) => {
                console.log('Sending signal to:', remotePeerIdRef.current);
                if (remotePeerIdRef.current) {
                    socketRef.current.emit('signal', {
                        signal,
                        to: remotePeerIdRef.current
                    });
                }
            });

            peer.on('connect', () => {
                console.log('P2P connection established');
                setConnectionState('connected');
                setIsCallActive(true);
                setError('');
                playSound('peerJoined');
            });

            peer.on('error', (err) => {
                console.error('Peer connection error:', err);
                setError('Connection failed. Please try again.');
            });

            peer.on('close', () => {
                console.log('Peer connection closed');
                handleDisconnect();
            });

            peerRef.current = peer;
        } catch (err) {
            console.error('Error creating peer:', err);
            setError('Failed to create connection. Please try again.');
        }
    };

    // Create room
    const handleCreateRoom = () => {
        setMode('create');
        setError('');
        socketRef.current.emit('create-room');
    };

    // Join room
    const handleJoinRoom = (roomPin) => {
        setMode('join');
        setError('');
        socketRef.current.emit('join-room', { pin: roomPin });
    };

    // Disconnect and reset
    const handleDisconnect = () => {
        if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
        }

        if (socketRef.current) {
            socketRef.current.emit('leave-room');
        }

        setConnectionState('disconnected');
        setIsCallActive(false);
        setPin('');
        setPeerId('');
        setMode('home');
        setError('');
        isInitiatorRef.current = false;
    };

    // End call
    const handleEndCall = () => {
        setIsCallActive(false);
    };

    // Render home screen
    if (mode === 'home') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center p-4">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="fixed top-6 right-6 bg-dark-700 hover:bg-dark-600 text-white p-3 rounded-full shadow-lg transition-all z-50"
                    title="Toggle theme"
                >
                    {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
                </button>

                <div className="max-w-4xl w-full">
                    <div className="text-center mb-12">
                        <h1 className="text-5xl font-bold text-white mb-4">
                            P2P Connect
                        </h1>
                        <p className="text-xl text-gray-400">
                            Secure peer-to-peer file sharing and video calling
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <button
                            onClick={handleCreateRoom}
                            className="bg-dark-800 hover:bg-dark-700 border-2 border-dark-600 hover:border-blue-500 rounded-xl p-8 transition-all group"
                        >
                            <div className="bg-blue-500/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/20 transition-all">
                                <Users className="w-8 h-8 text-blue-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Create Room</h2>
                            <p className="text-gray-400">
                                Start a new session and invite someone to join
                            </p>
                        </button>

                        <button
                            onClick={() => setMode('join')}
                            className="bg-dark-800 hover:bg-dark-700 border-2 border-dark-600 hover:border-green-500 rounded-xl p-8 transition-all group"
                        >
                            <div className="bg-green-500/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500/20 transition-all">
                                <LogOut className="w-8 h-8 text-green-500 transform rotate-180" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Join Room</h2>
                            <p className="text-gray-400">
                                Enter a PIN to connect with someone
                            </p>
                        </button>
                    </div>

                    <div className="mt-12 text-center">
                        <div className="flex justify-center gap-8 text-gray-500">
                            <div className="flex items-center gap-2">
                                <Video size={20} />
                                <span>HD Video Calls</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <FileText size={20} />
                                <span>Large File Transfer</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users size={20} />
                                <span>End-to-End P2P</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Render join screen
    if (mode === 'join' && connectionState === 'disconnected') {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <button
                        onClick={() => setMode('home')}
                        className="mb-4 text-gray-400 hover:text-white transition-all"
                    >
                        ← Back
                    </button>
                    <RoomJoiner
                        onJoinRoom={handleJoinRoom}
                        isJoining={connectionState === 'connecting'}
                        error={error}
                    />
                </div>
            </div>
        );
    }

    // Render create room screen (waiting for peer)
    if (mode === 'create' && connectionState !== 'connected') {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full">
                    <button
                        onClick={handleDisconnect}
                        className="mb-4 text-gray-400 hover:text-white transition-all"
                    >
                        ← Cancel
                    </button>
                    <RoomCreator
                        onCreateRoom={handleCreateRoom}
                        pin={pin} false
                        isCreating={connectionState === 'connecting'}
                    />
                </div>
            </div>
        );
    }

    // Render connected screen with video call and file transfer
    if (connectionState === 'connected' && isCallActive) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex flex-col">
                {/* Header */}
                <header className="bg-dark-800/80 backdrop-blur-sm border-b border-dark-700 px-6 py-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-bold text-white">P2P Connect</h1>
                            <div className="bg-dark-700 px-4 py-2 rounded-lg">
                                <span className="text-gray-400 text-sm">PIN:</span>
                                <span className="text-blue-500 font-mono font-bold ml-2">{pin}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-sm text-gray-400">Connected</span>
                            </div>
                            <button
                                onClick={() => {
                                    const newState = toggleSound();
                                    setSoundEnabled(newState);
                                }}
                                className="bg-dark-700 hover:bg-dark-600 text-white p-2 rounded-lg transition-all"
                                title={soundEnabled ? "Disable sounds" : "Enable sounds"}
                            >
                                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                            </button>
                            <button
                                onClick={toggleTheme}
                                className="bg-dark-700 hover:bg-dark-600 text-white p-2 rounded-lg transition-all"
                                title="Toggle theme"
                            >
                                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                            <button
                                onClick={handleDisconnect}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                            >
                                <LogOut size={16} />
                                <span className="hidden sm:inline">Disconnect</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Tabs */}
                <div className="bg-dark-800 border-b border-dark-700 px-6">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setActiveTab('video')}
                            className={`px-4 py-3 font-medium transition-all border-b-2 ${activeTab === 'video'
                                ? 'text-blue-500 border-blue-500'
                                : 'text-gray-400 border-transparent hover:text-white'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Video size={18} />
                                <span>Video Call</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('file')}
                            className={`px-4 py-3 font-medium transition-all border-b-2 ${activeTab === 'file'
                                ? 'text-blue-500 border-blue-500'
                                : 'text-gray-400 border-transparent hover:text-white'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <FileText size={18} />
                                <span>File Transfer</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-auto p-4">
                    {activeTab === 'video' ? (
                        <VideoCall
                            peer={peerRef.current}
                            isCallActive={isCallActive}
                            onEndCall={handleEndCall}
                        />
                    ) : (
                        <FileTransfer
                            peer={peerRef.current}
                            socket={socketRef.current}
                            peerId={peerId}
                        />
                    )}
                </div>

                {/* Chat Component */}
                <Chat
                    peer={peerRef.current}
                    socket={socketRef.current}
                    peerId={peerId}
                />
            </div>
        );
    }

    return null;
}

function AppWrapper() {
    return (
        <ThemeProvider>
            <App />
        </ThemeProvider>
    );
}

export default AppWrapper;
