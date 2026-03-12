import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import VideoCall from './components/VideoCall';
import FileTransfer from './components/FileTransfer';
import RoomCreator from './components/RoomCreator';
import RoomJoiner from './components/RoomJoiner';
import Chat from './components/Chat';
import ErrorBoundary from './components/ErrorBoundary';
import { Video, FileText, Users, LogOut, Sun, Moon, Wifi, WifiOff, MessageCircle } from 'lucide-react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { playSound } from './utils/sounds';

const SIGNALING_SERVER = import.meta.env.VITE_SIGNALING_SERVER || 'http://localhost:3001';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
    ],
};

function App() {
    const { theme, toggleTheme } = useTheme();

    // Core state
    const [mode, setMode] = useState('home');
    const [connectionState, setConnectionState] = useState('disconnected');
    const [pin, setPin] = useState('');
    const [peerId, setPeerId] = useState('');
    const [error, setError] = useState('');
    const [isCallActive, setIsCallActive] = useState(false);
    const [activeTab, setActiveTab] = useState('video');
    const [unreadMessages, setUnreadMessages] = useState(0);

    // Connection state
    const [serverConnected, setServerConnected] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const maxReconnectAttempts = 10;

    // Refs
    const socketRef = useRef(null);
    const peerRef = useRef(null);
    const isInitiatorRef = useRef(false);
    const remotePeerIdRef = useRef(null);

    // --- Network status ---
    useEffect(() => {
        const onOnline = () => {
            setError('');
            if (!serverConnected && socketRef.current) socketRef.current.connect();
        };
        const onOffline = () => {
            setServerConnected(false);
            setError('Network connection lost. Please check your internet.');
        };

        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, [serverConnected]);

    // --- Socket initialization ---
    useEffect(() => {
        const socket = io(SIGNALING_SERVER, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity,
            timeout: 20000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setServerConnected(true);
            setIsReconnecting(false);
            setReconnectAttempts(0);
            setError('');
        });

        socket.on('disconnect', (reason) => {
            setServerConnected(false);
            if (reason !== 'io client disconnect') {
                setError('Connection lost. Reconnecting...');
            }
        });

        socket.on('connect_error', () => {
            setServerConnected(false);
            setError('Unable to connect to server. Retrying...');
        });

        socket.on('error', ({ message }) => setError(message));
        socket.on('server-shutdown', ({ message }) => setError(message));

        return () => socket.disconnect();
    }, []);

    // --- Socket event listeners ---
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        socket.on('room-created', ({ pin: roomPin }) => {
            setPin(roomPin);
            isInitiatorRef.current = true;
        });

        socket.on('room-joined', ({ pin: roomPin, creatorId }) => {
            setPin(roomPin);
            setPeerId(creatorId);
            remotePeerIdRef.current = creatorId;
            isInitiatorRef.current = false;
            setConnectionState('connecting');
            createPeer(true);
        });

        socket.on('peer-joined', ({ peerId: remotePeerId }) => {
            setPeerId(remotePeerId);
            remotePeerIdRef.current = remotePeerId;
            setConnectionState('connecting');
            createPeer(false);
        });

        socket.on('signal', ({ signal, from }) => {
            remotePeerIdRef.current = from;
            setPeerId(from);
            if (peerRef.current) peerRef.current.signal(signal);
        });

        socket.on('peer-disconnected', () => {
            playSound('peerDisconnected');
            handleDisconnect();
        });

        return () => {
            socket.off('room-created');
            socket.off('room-joined');
            socket.off('peer-joined');
            socket.off('signal');
            socket.off('peer-disconnected');
        };
    }, []);

    // --- Create WebRTC peer ---
    const createPeer = (initiator) => {
        try {
            const peer = new Peer({
                initiator,
                trickle: true,
                config: ICE_SERVERS,
                channelName: 'data-channel',
                channelConfig: { ordered: true, maxRetransmits: 30 },
                offerOptions: { offerToReceiveAudio: true, offerToReceiveVideo: true },
            });

            peer.on('signal', (signal) => {
                if (remotePeerIdRef.current) {
                    socketRef.current.emit('signal', { signal, to: remotePeerIdRef.current });
                }
            });

            peer.on('connect', () => {
                setConnectionState('connected');
                setIsCallActive(true);
                setError('');
                playSound('peerJoined');
            });

            peer.on('error', () => setError('Connection failed. Please try again.'));
            peer.on('close', () => handleDisconnect());

            peerRef.current = peer;
        } catch {
            setError('Failed to create connection.');
        }
    };

    // --- Actions ---
    const handleCreateRoom = () => {
        setMode('create');
        setError('');
        socketRef.current.emit('create-room');
    };

    const handleJoinRoom = (roomPin) => {
        setMode('join');
        setError('');
        socketRef.current.emit('join-room', { pin: roomPin });
    };

    const handleDisconnect = () => {
        peerRef.current?.destroy();
        peerRef.current = null;
        socketRef.current?.emit('leave-room');
        setConnectionState('disconnected');
        setIsCallActive(false);
        setPin('');
        setPeerId('');
        setMode('home');
        setError('');
        isInitiatorRef.current = false;
    };

    // --- Home screen ---
    if (mode === 'home') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center p-4">
                {/* Connection status */}
                <div className="fixed top-4 left-4 z-50">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                        serverConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                        {serverConnected ? (
                            <><Wifi size={16} /><span className="text-sm font-medium">Connected</span></>
                        ) : (
                            <><WifiOff size={16} /><span className="text-sm font-medium">Disconnected</span></>
                        )}
                    </div>
                </div>

                {/* Theme toggle */}
                <button
                    onClick={toggleTheme}
                    className="fixed top-6 right-6 bg-dark-700 hover:bg-dark-600 text-white p-3 rounded-full shadow-lg z-50"
                    title="Toggle theme"
                >
                    {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
                </button>

                <div className="max-w-4xl w-full">
                    <div className="text-center mb-12">
                        <h1 className="text-5xl font-bold text-white mb-4">P2P Connect</h1>
                        <p className="text-xl text-gray-400">Secure peer-to-peer file sharing and video calling</p>
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
                            <p className="text-gray-400">Start a new session and invite someone to join</p>
                        </button>

                        <button
                            onClick={() => setMode('join')}
                            className="bg-dark-800 hover:bg-dark-700 border-2 border-dark-600 hover:border-green-500 rounded-xl p-8 transition-all group"
                        >
                            <div className="bg-green-500/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500/20 transition-all">
                                <LogOut className="w-8 h-8 text-green-500 transform rotate-180" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Join Room</h2>
                            <p className="text-gray-400">Enter a PIN to connect with someone</p>
                        </button>
                    </div>

                    <div className="mt-12 text-center">
                        <div className="flex justify-center gap-8 text-gray-500">
                            <div className="flex items-center gap-2">
                                <Video size={20} /><span>HD Video Calls</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <FileText size={20} /><span>Large File Transfer</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users size={20} /><span>End-to-End P2P</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- Join screen ---
    if (mode === 'join' && connectionState === 'disconnected') {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <button onClick={() => setMode('home')} className="mb-4 text-gray-400 hover:text-white transition-all">
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

    // --- Create room screen (waiting for peer) ---
    if (mode === 'create' && connectionState !== 'connected') {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full">
                    <button onClick={handleDisconnect} className="mb-4 text-gray-400 hover:text-white transition-all">
                        ← Cancel
                    </button>
                    <RoomCreator
                        onCreateRoom={handleCreateRoom}
                        pin={pin}
                        isCreating={connectionState === 'connecting'}
                    />
                </div>
            </div>
        );
    }

    // --- Connected screen ---
    if (connectionState === 'connected' && isCallActive) {
        return (
            <div className="h-screen bg-gray-900 flex overflow-hidden">
                {/* Left: Chat */}
                <div
                    className="w-1/3 flex flex-col border-r border-gray-700 relative"
                    onClick={() => setUnreadMessages(0)}
                >
                    {unreadMessages > 0 && (
                        <div className="absolute top-3 right-3 z-10 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                            {unreadMessages > 9 ? '9+' : unreadMessages}
                        </div>
                    )}
                    <Chat
                        peer={peerRef.current}
                        onNewMessage={() => setUnreadMessages((c) => c + 1)}
                    />
                </div>

                {/* Right: Video / File Transfer */}
                <div className="flex-1 flex flex-col">
                    {/* Tab switcher */}
                    <div className="flex border-b border-gray-700 bg-gray-800">
                        <button
                            onClick={() => setActiveTab('video')}
                            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                                activeTab === 'video'
                                    ? 'text-blue-400 border-b-2 border-blue-400'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <Video size={18} /> Video Call
                        </button>
                        <button
                            onClick={() => setActiveTab('file')}
                            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                                activeTab === 'file'
                                    ? 'text-blue-400 border-b-2 border-blue-400'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <FileText size={18} /> File Transfer
                        </button>
                    </div>

                    {activeTab === 'video' ? (
                        <VideoCall
                            peer={peerRef.current}
                            isCallActive={isCallActive}
                            onEndCall={handleDisconnect}
                        />
                    ) : (
                        <div className="h-full p-4 overflow-auto">
                            <FileTransfer
                                peer={peerRef.current}
                                socket={socketRef.current}
                                peerId={peerId}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
}

function AppWrapper() {
    return (
        <ErrorBoundary>
            <ThemeProvider>
                <App />
            </ThemeProvider>
        </ErrorBoundary>
    );
}

export default AppWrapper;
