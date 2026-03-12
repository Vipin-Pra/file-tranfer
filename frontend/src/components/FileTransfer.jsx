import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, FileIcon, X, CheckCircle, Loader } from 'lucide-react';
import { playSound } from '../utils/sounds';

const CHUNK_SIZE = 64 * 1024; // 64KB chunks

const FileTransfer = ({ peer, socket, peerId }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [receivedFile, setReceivedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const fileInputRef = useRef(null);
    const receivedChunksRef = useRef([]);
    const fileMetadataRef = useRef(null);

    // Select and preview a file
    const selectFile = (file) => {
        setSelectedFile(file);
        setUploadProgress(0);

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        } else {
            setImagePreview(null);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) selectFile(file);
    };

    // Drag and drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) selectFile(file);
    };

    // Send file via P2P data channel
    const sendFile = async () => {
        if (!selectedFile || !peer || !socket) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            // Notify peer about incoming file via signaling server
            socket.emit('file-metadata', {
                fileName: selectedFile.name,
                fileSize: selectedFile.size,
                fileType: selectedFile.type,
                to: peerId,
            });

            const buffer = await selectedFile.arrayBuffer();
            const totalChunks = Math.ceil(buffer.byteLength / CHUNK_SIZE);

            // Send file metadata via data channel
            peer.send(JSON.stringify({
                type: 'file-start',
                fileName: selectedFile.name,
                fileSize: selectedFile.size,
                fileType: selectedFile.type,
                totalChunks,
            }));

            // Send chunks
            for (let i = 0; i < totalChunks; i++) {
                const start = i * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, buffer.byteLength);
                const chunk = buffer.slice(start, end);

                peer.send(JSON.stringify({ type: 'file-chunk', chunkIndex: i, totalChunks }));
                peer.send(chunk);

                setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
                await new Promise((r) => setTimeout(r, 10));
            }

            peer.send(JSON.stringify({ type: 'file-complete' }));
            setIsUploading(false);
            playSound('fileTransferComplete');
        } catch {
            setIsUploading(false);
            alert('Failed to send file.');
        }
    };

    // Receive file via data channel
    useEffect(() => {
        if (!peer) return;

        const handleData = (data) => {
            if (typeof data === 'string') {
                try {
                    const msg = JSON.parse(data);

                    if (msg.type === 'file-start') {
                        fileMetadataRef.current = msg;
                        receivedChunksRef.current = [];
                        setIsDownloading(true);
                        setDownloadProgress(0);
                    } else if (msg.type === 'file-chunk') {
                        setDownloadProgress(Math.round(((msg.chunkIndex + 1) / msg.totalChunks) * 100));
                    } else if (msg.type === 'file-complete') {
                        const meta = fileMetadataRef.current;
                        const blob = new Blob(receivedChunksRef.current, { type: meta.fileType });

                        setReceivedFile({
                            name: meta.fileName,
                            size: meta.fileSize,
                            url: URL.createObjectURL(blob),
                        });

                        setIsDownloading(false);
                        playSound('fileTransferComplete');
                        receivedChunksRef.current = [];
                        fileMetadataRef.current = null;
                    }
                } catch {
                    // Not JSON — binary data handled below
                }
            } else if (data instanceof ArrayBuffer) {
                receivedChunksRef.current.push(data);
            }
        };

        peer.on('data', handleData);
        return () => peer.off('data', handleData);
    }, [peer]);

    // Download received file
    const downloadReceivedFile = () => {
        if (!receivedFile) return;
        const a = document.createElement('a');
        a.href = receivedFile.url;
        a.download = receivedFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // Format file size
    const formatSize = (bytes) => {
        if (!bytes) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
    };

    const isConnected = peer?.connected;

    return (
        <div className="h-full flex flex-col gap-4 p-6 bg-dark-800 rounded-lg">
            <h2 className="text-2xl font-bold text-white mb-2">File Transfer</h2>

            {!isConnected && (
                <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
                    <p className="text-yellow-500 text-sm">Connect with a peer to enable file transfer</p>
                </div>
            )}

            {/* Send Section */}
            <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-300 mb-3">Send File</h3>

                <div
                    className={`drop-zone border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                        isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-dark-600 hover:border-dark-500'
                    } ${!isConnected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    onDragOver={isConnected ? handleDragOver : undefined}
                    onDragLeave={isConnected ? handleDragLeave : undefined}
                    onDrop={isConnected ? handleDrop : undefined}
                    onClick={() => isConnected && fileInputRef.current?.click()}
                >
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-300 mb-2">Drag & drop file here</p>
                    <p className="text-sm text-gray-500">or click to browse</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={!isConnected}
                    />
                </div>

                {selectedFile && (
                    <div className="mt-4 bg-dark-700 rounded-lg p-4">
                        {imagePreview && (
                            <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-full max-h-48 object-contain rounded-lg bg-dark-900 mb-4"
                            />
                        )}

                        <div className="flex items-center gap-3">
                            <FileIcon className="w-8 h-8 text-blue-500" />
                            <div className="flex-1 min-w-0">
                                <p className="text-white truncate">{selectedFile.name}</p>
                                <p className="text-sm text-gray-400">{formatSize(selectedFile.size)}</p>
                            </div>
                            <button
                                onClick={() => { setSelectedFile(null); setImagePreview(null); }}
                                className="text-gray-400 hover:text-white"
                                disabled={isUploading}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {isUploading ? (
                            <div className="mt-3">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-400">Uploading...</span>
                                    <span className="text-blue-500">{uploadProgress}%</span>
                                </div>
                                <div className="w-full bg-dark-600 rounded-full h-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={sendFile}
                                disabled={!isConnected}
                                className="mt-3 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-dark-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                            >
                                <Upload size={20} /> Send File
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Receive Section */}
            <div className="flex-1 border-t border-dark-600 pt-4">
                <h3 className="text-lg font-semibold text-gray-300 mb-3">Receive File</h3>

                {isDownloading ? (
                    <div className="bg-dark-700 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <Loader className="w-6 h-6 text-blue-500 animate-spin" />
                            <div>
                                <p className="text-white">Receiving file...</p>
                                <p className="text-sm text-gray-400">{fileMetadataRef.current?.fileName}</p>
                            </div>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">Progress</span>
                            <span className="text-blue-500">{downloadProgress}%</span>
                        </div>
                        <div className="w-full bg-dark-600 rounded-full h-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${downloadProgress}%` }}
                            />
                        </div>
                    </div>
                ) : receivedFile ? (
                    <div className="bg-dark-700 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                            <div className="flex-1 min-w-0">
                                <p className="text-white truncate">{receivedFile.name}</p>
                                <p className="text-sm text-gray-400">{formatSize(receivedFile.size)}</p>
                            </div>
                        </div>
                        <button
                            onClick={downloadReceivedFile}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                        >
                            <Download size={20} /> Download File
                        </button>
                    </div>
                ) : (
                    <div className="bg-dark-700 rounded-lg p-8 text-center">
                        <Download className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                        <p className="text-gray-400">No files received yet</p>
                        <p className="text-sm text-gray-500 mt-1">Waiting for incoming files...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileTransfer;
