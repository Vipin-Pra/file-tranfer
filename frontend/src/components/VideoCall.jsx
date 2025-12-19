import React, { useRef, useEffect, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, Circle, Square } from 'lucide-react';

const VideoCall = ({ peer, isCallActive, onEndCall }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);

    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isRemoteVideoLoaded, setIsRemoteVideoLoaded] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [startTime, setStartTime] = useState(null);

    // Call duration timer
    useEffect(() => {
        if (!isCallActive) {
            setCallDuration(0);
            setStartTime(null);
            return;
        }

        setStartTime(Date.now());
        const interval = setInterval(() => {
            setCallDuration(Math.floor((Date.now() - Date.now()) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [isCallActive]);

    useEffect(() => {
        if (startTime) {
            const interval = setInterval(() => {
                setCallDuration(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [startTime]);

    // Initialize local video stream
    useEffect(() => {
        if (!isCallActive) return;

        const initializeMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'user'
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });

                localStreamRef.current = stream;

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                // Add stream to peer connection
                if (peer) {
                    stream.getTracks().forEach(track => {
                        peer.addTrack(track, stream);
                    });
                }

            } catch (error) {
                console.error('Error accessing media devices:', error);
                alert('Could not access camera/microphone. Please grant permissions.');
            }
        };

        initializeMedia();

        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [isCallActive, peer]);

    // Handle remote stream
    useEffect(() => {
        if (!peer) return;

        const handleStream = (stream) => {
            console.log('Received remote stream');
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
                setIsRemoteVideoLoaded(true);
            }
        };

        peer.on('stream', handleStream);

        return () => {
            peer.off('stream', handleStream);
        };
    }, [peer]);

    // Toggle video
    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
            }
        }
    };

    // Toggle audio
    const toggleAudio = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);
            }
        }
    };

    // Screen sharing
    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            // Stop screen sharing, return to camera
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: { echoCancellation: true }
                });

                const videoTrack = stream.getVideoTracks()[0];
                const sender = peer._pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }

                localStreamRef.current.getVideoTracks()[0].stop();
                localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
                localStreamRef.current.addTrack(videoTrack);

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = localStreamRef.current;
                }

                setIsScreenSharing(false);
            } catch (error) {
                console.error('Error returning to camera:', error);
            }
        } else {
            // Start screen sharing
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { cursor: 'always' },
                    audio: false
                });

                const screenTrack = screenStream.getVideoTracks()[0];
                const sender = peer._pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(screenTrack);
                }

                localStreamRef.current.getVideoTracks()[0].stop();
                localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
                localStreamRef.current.addTrack(screenTrack);

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = localStreamRef.current;
                }

                setIsScreenSharing(true);

                screenTrack.onended = () => {
                    toggleScreenShare();
                };
            } catch (error) {
                console.error('Error sharing screen:', error);
            }
        }
    };

    // Recording
    const startRecording = () => {
        try {
            const combinedStream = new MediaStream([
                ...localStreamRef.current.getTracks(),
            ]);

            mediaRecorderRef.current = new MediaRecorder(combinedStream, {
                mimeType: 'video/webm;codecs=vp8,opus'
            });

            recordedChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `recording-${Date.now()}.webm`;
                a.click();
                URL.revokeObjectURL(url);
            };

            mediaRecorderRef.current.start(1000);
            setIsRecording(true);
        } catch (error) {
            console.error('Error starting recording:', error);
            alert('Recording not supported in this browser');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    // Format call duration
    const formatDuration = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // End call
    const handleEndCall = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (isRecording) {
            stopRecording();
        }
        onEndCall();
    };

    if (!isCallActive) {
        return (
            <div className="flex items-center justify-center h-full bg-dark-800 rounded-lg">
                <div className="text-center">
                    <Video className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Video call not started</p>
                    <p className="text-sm text-gray-500 mt-2">Connect with a peer to start video call</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-full bg-dark-900 rounded-lg overflow-hidden">
            {/* Remote Video (Full Screen) */}
            <div className="relative w-full h-full">
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />
                {!isRemoteVideoLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-dark-800">
                        <div className="text-center">
                            <div className="animate-pulse-slow mb-4">
                                <Video className="w-16 h-16 text-blue-500 mx-auto" />
                            </div>
                            <p className="text-gray-400">Waiting for remote video...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Call Duration Timer */}
            <div className="absolute top-4 left-4 bg-dark-800/90 px-4 py-2 rounded-lg">
                <span className="text-white font-mono text-lg">{formatDuration(callDuration)}</span>
            </div>

            {/* Recording Indicator */}
            {isRecording && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500/90 px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse">
                    <Circle size={12} className="fill-current" />
                    <span className="text-white font-semibold text-sm">Recording</span>
                </div>
            )}

            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute top-4 right-4 w-48 h-36 bg-dark-800 rounded-lg overflow-hidden border-2 border-dark-600 shadow-lg">
                <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />
                {!isVideoEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-dark-800">
                        <VideoOff className="w-8 h-8 text-gray-500" />
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3">
                <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-full transition-all ${isVideoEnabled
                        ? 'bg-dark-700 hover:bg-dark-600 text-white'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                    title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
                >
                    {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
                </button>

                <button
                    onClick={toggleAudio}
                    className={`p-4 rounded-full transition-all ${isAudioEnabled
                        ? 'bg-dark-700 hover:bg-dark-600 text-white'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                    title={isAudioEnabled ? 'Mute' : 'Unmute'}
                >
                    {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                </button>

                <button
                    onClick={toggleScreenShare}
                    className={`p-4 rounded-full transition-all ${isScreenSharing
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-dark-700 hover:bg-dark-600 text-white'
                        }`}
                    title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
                >
                    <Monitor size={24} />
                </button>

                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`p-4 rounded-full transition-all ${isRecording
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-dark-700 hover:bg-dark-600 text-white'
                        }`}
                    title={isRecording ? 'Stop recording' : 'Start recording'}
                >
                    {isRecording ? <Square size={24} /> : <Circle size={24} />}
                </button>

                <button
                    onClick={handleEndCall}
                    className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all"
                    title="End call"
                >
                    <PhoneOff size={24} />
                </button>
            </div>
        </div>
    );
};

export default VideoCall;
