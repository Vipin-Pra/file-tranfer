import React, { useRef, useEffect, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, Monitor, Circle, Square } from 'lucide-react';

const VideoCall = ({ peer, isCallActive, onEndCall }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);

    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isRemoteVideoLoaded, setIsRemoteVideoLoaded] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [showLocalInLarge, setShowLocalInLarge] = useState(false);

    // Call duration timer
    useEffect(() => {
        if (!isCallActive) return;
        const start = Date.now();
        const id = setInterval(() => {
            setCallDuration(Math.floor((Date.now() - start) / 1000));
        }, 1000);
        return () => clearInterval(id);
    }, [isCallActive]);

    // Initialize local media
    useEffect(() => {
        if (!isCallActive) return;
        let cancelled = false;

        const init = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                });
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                localStreamRef.current = stream;
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                if (peer) stream.getTracks().forEach((track) => peer.addTrack(track, stream));
            } catch {
                alert('Could not access camera/microphone. Please grant permissions.');
            }
        };

        init();
        return () => {
            cancelled = true;
            localStreamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, [isCallActive, peer]);

    // Handle remote stream
    useEffect(() => {
        if (!peer) return;
        const onStream = (stream) => {
            remoteStreamRef.current = stream;
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
            setIsRemoteVideoLoaded(true);
        };
        peer.on('stream', onStream);
        return () => peer.off('stream', onStream);
    }, [peer]);

    // Re-apply srcObject when swapping video views
    useEffect(() => {
        if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
        }
        if (remoteVideoRef.current && remoteStreamRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
    }, [showLocalInLarge]);

    // Toggle video
    const toggleVideo = () => {
        const track = localStreamRef.current?.getVideoTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setIsVideoEnabled(track.enabled);
        }
    };

    // Toggle audio
    const toggleAudio = () => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setIsAudioEnabled(track.enabled);
        }
    };

    // Screen sharing
    const toggleScreenShare = async () => {
        try {
            if (isScreenSharing) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                });
                const track = stream.getVideoTracks()[0];
                const sender = peer._pc.getSenders().find((s) => s.track?.kind === 'video');
                if (sender) sender.replaceTrack(track);

                localStreamRef.current.getVideoTracks()[0].stop();
                localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
                localStreamRef.current.addTrack(track);
                if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
                setIsScreenSharing(false);
            } else {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { cursor: 'always' },
                });
                const screenTrack = screenStream.getVideoTracks()[0];
                const sender = peer._pc.getSenders().find((s) => s.track?.kind === 'video');
                if (sender) sender.replaceTrack(screenTrack);

                localStreamRef.current.getVideoTracks()[0].stop();
                localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
                localStreamRef.current.addTrack(screenTrack);
                if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
                setIsScreenSharing(true);

                screenTrack.onended = () => toggleScreenShare();
            }
        } catch (err) {
            console.error('Screen share error:', err);
        }
    };

    // Recording
    const startRecording = () => {
        try {
            const stream = new MediaStream([...localStreamRef.current.getTracks()]);
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
            recordedChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordedChunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `recording-${Date.now()}.webm`;
                a.click();
                URL.revokeObjectURL(url);
            };

            recorder.start(1000);
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
        } catch {
            alert('Recording not supported in this browser.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    // Format duration
    const formatDuration = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return h > 0
            ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
            : `${m}:${String(s).padStart(2, '0')}`;
    };

    // End call
    const handleEndCall = () => {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        if (isRecording) stopRecording();
        onEndCall();
    };

    // Not active state
    if (!isCallActive) {
        return (
            <div className="flex items-center justify-center h-full bg-dark-800 rounded-lg">
                <div className="text-center">
                    <Video className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Connect with a peer to start video call</p>
                </div>
            </div>
        );
    }

    // Large video content
    const largeVideo = showLocalInLarge ? (
        <>
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                    <VideoOff className="w-20 h-20 text-gray-500" />
                </div>
            )}
            <div className="absolute bottom-6 left-6 bg-black/60 px-4 py-2 rounded-lg text-sm text-white font-medium">You</div>
        </>
    ) : (
        <>
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {!isRemoteVideoLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                    <div className="text-center">
                        <Video className="w-20 h-20 text-blue-500 animate-pulse mx-auto mb-3" />
                        <p className="text-gray-400 text-lg">Connecting...</p>
                    </div>
                </div>
            )}
            <div className="absolute bottom-6 left-6 bg-black/60 px-4 py-2 rounded-lg text-sm text-white font-medium">Participant</div>
        </>
    );

    // Small PIP video content
    const smallVideo = showLocalInLarge ? (
        <>
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {!isRemoteVideoLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                    <Video className="w-10 h-10 text-blue-500 animate-pulse" />
                </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white">Participant</div>
        </>
    ) : (
        <>
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                    <VideoOff className="w-10 h-10 text-gray-500" />
                </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white">You</div>
        </>
    );

    return (
        <div className="relative h-full bg-gray-800">
            {/* Main video - full screen */}
            <div className="absolute inset-0">
                {largeVideo}
            </div>

            {/* Picture-in-picture - small corner video */}
            <div
                className="absolute top-6 right-6 w-64 h-48 bg-gray-700 rounded-lg overflow-hidden cursor-pointer shadow-2xl border-2 border-gray-600 hover:border-blue-500 transition-all z-20"
                onClick={() => setShowLocalInLarge(!showLocalInLarge)}
                title="Click to switch video"
            >
                {smallVideo}
            </div>

            {/* Recording indicator */}
            {isRecording && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-500/90 px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse z-10">
                    <Circle size={12} className="fill-current" />
                    <span className="text-white font-semibold text-sm">Recording</span>
                </div>
            )}

            {/* Call duration */}
            <div className="absolute top-6 left-6 bg-gray-900/80 px-3 py-1.5 rounded-lg z-10">
                <span className="text-white font-mono text-sm">{formatDuration(callDuration)}</span>
            </div>

            {/* Controls - bottom center */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 z-10">
                <button
                    onClick={handleEndCall}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
                    title="End call"
                >
                    End Meeting
                </button>
                <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full transition-all ${
                        isVideoEnabled ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-500 hover:bg-red-600'
                    } text-white`}
                    title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
                >
                    {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
                <button
                    onClick={toggleAudio}
                    className={`p-3 rounded-full transition-all ${
                        isAudioEnabled ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-500 hover:bg-red-600'
                    } text-white`}
                    title={isAudioEnabled ? 'Mute' : 'Unmute'}
                >
                    {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
                <button
                    onClick={toggleScreenShare}
                    className={`p-3 rounded-full transition-all ${
                        isScreenSharing ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'
                    } text-white`}
                    title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
                >
                    <Monitor size={20} />
                </button>
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`p-3 rounded-full transition-all ${
                        isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-500'
                    } text-white`}
                    title={isRecording ? 'Stop recording' : 'Start recording'}
                >
                    {isRecording ? <Square size={20} /> : <Circle size={20} />}
                </button>
            </div>
        </div>
    );
};

export default VideoCall;
