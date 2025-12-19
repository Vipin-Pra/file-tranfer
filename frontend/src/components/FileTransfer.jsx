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

    // Handle file selection
    const handleFileSelect = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setUploadProgress(0);

            // Create image preview
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagePreview(reader.result);
                };
                reader.readAsDataURL(file);
            } else {
                setImagePreview(null);
            }
        }
    };

    // Handle drag and drop
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {

        // Create image preview
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setImagePreview(null);
        }
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            setSelectedFile(file);
            setUploadProgress(0);
        }
    };

    // Send file via P2P
    const sendFile = async () => {
        if (!selectedFile || !peer || !socket) {
            alert('Please select a file and ensure peer is connected');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            // Send file metadata first via socket
            socket.emit('file-metadata', {
                fileName: selectedFile.name,
                fileSize: selectedFile.size,
                fileType: selectedFile.type,
                to: peerId
            });

            // Read file and split into chunks
            const arrayBuffer = await selectedFile.arrayBuffer();
            const totalChunks = Math.ceil(arrayBuffer.byteLength / CHUNK_SIZE);

            // Send metadata via peer connection
            peer.send(JSON.stringify({
                type: 'file-start',
                fileName: selectedFile.name,
                fileSize: selectedFile.size,
                fileType: selectedFile.type,
                totalChunks
            }));

            // Send file in chunks
            for (let i = 0; i < totalChunks; i++) {
                const start = i * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, arrayBuffer.byteLength);
                const chunk = arrayBuffer.slice(start, end);

                // Send chunk with metadata
                peer.send(JSON.stringify({
                    type: 'file-chunk',
                    chunkIndex: i,
                    totalChunks
                }));

                // Send the actual chunk data
                peer.send(chunk);

                // Update progress
                const progress = ((i + 1) / totalChunks) * 100;
                setUploadProgress(Math.round(progress));

                // Small delay to prevent overwhelming the connection
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            // Send completion signal
            peer.send(JSON.stringify({
                type: 'file-complete'
            }));

            console.log('File sent successfully');
            setIsUploading(false);
            playSound('fileTransferComplete');

        } catch (error) {
            console.error('Error sending file:', error);
            alert('Failed to send file');
            setIsUploading(false);
        }
    };

    // Receive file via P2P
    useEffect(() => {
        if (!peer) return;

        const handleData = (data) => {
            // Handle JSON messages
            if (typeof data === 'string') {
                try {
                    const message = JSON.parse(data);

                    if (message.type === 'file-start') {
                        console.log('Receiving file:', message.fileName);
                        fileMetadataRef.current = message;
                        receivedChunksRef.current = [];
                        setIsDownloading(true);
                        setDownloadProgress(0);
                    }
                    else if (message.type === 'file-chunk') {
                        // Update progress based on chunks received
                        const progress = ((message.chunkIndex + 1) / message.totalChunks) * 100;
                        setDownloadProgress(Math.round(progress));
                    }
                    else if (message.type === 'file-complete') {
                        // Reconstruct file from chunks
                        const blob = new Blob(receivedChunksRef.current, {
                            type: fileMetadataRef.current.fileType
                        });

                        setReceivedFile({
                            name: fileMetadataRef.current.fileName,
                            size: fileMetadataRef.current.fileSize,
                            blob: blob,
                            url: URL.createObjectURL(blob)
                        });

                        setIsDownloading(false);
                        console.log('File received successfully');
                        playSound('fileTransferComplete');

                        // Clean up
                        receivedChunksRef.current = [];
                        fileMetadataRef.current = null;
                    }
                } catch (error) {
                    // Not JSON, must be chunk data
                }
            }
            // Handle binary chunk data
            else if (data instanceof ArrayBuffer) {
                receivedChunksRef.current.push(data);
            }
        };

        peer.on('data', handleData);

        return () => {
            peer.off('data', handleData);
        };
    }, [peer]);

    // Download received file
    const downloadReceivedFile = () => {
        if (!receivedFile) return;

        const link = document.createElement('a');
        link.href = receivedFile.url;
        link.download = receivedFile.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const isConnected = peer && peer.connected;

    return (
        <div className="h-full flex flex-col gap-4 p-6 bg-dark-800 rounded-lg">
            <h2 className="text-2xl font-bold text-white mb-2">File Transfer</h2>

            {!isConnected && (
                <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
                    <p className="text-yellow-500 text-sm">⚠️ Connect with a peer to enable file transfer</p>
                </div>
            )}

            {/* Upload Section */}
            <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-300 mb-3">Send File</h3>

                <div
                    className={`drop-zone border-2 border-dashed rounded-lg p-8 text-center transition-all ${isDragging
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-dark-600 hover:border-dark-500'
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
                            <div className="mb-4">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full max-h-48 object-contain rounded-lg bg-dark-900"
                                />
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <FileIcon className="w-8 h-8 text-blue-500" />
                            <div className="flex-1 min-w-0">
                                <p className="text-white truncate">{selectedFile.name}</p>
                                <p className="text-sm text-gray-400">{formatFileSize(selectedFile.size)}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedFile(null);
                                    setImagePreview(null);
                                }}
                                className="text-gray-400 hover:text-white"
                                disabled={isUploading}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {isUploading && (
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
                        )}

                        {!isUploading && (
                            <button
                                onClick={sendFile}
                                disabled={!isConnected}
                                className="mt-3 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-dark-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                <Upload size={20} />
                                Send File
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Download Section */}
            <div className="flex-1 border-t border-dark-600 pt-4">
                <h3 className="text-lg font-semibold text-gray-300 mb-3">Receive File</h3>

                {isDownloading && (
                    <div className="bg-dark-700 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <Loader className="w-6 h-6 text-blue-500 animate-spin" />
                            <div className="flex-1">
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
                )}

                {receivedFile && !isDownloading && (
                    <div className="bg-dark-700 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                            <div className="flex-1 min-w-0">
                                <p className="text-white truncate">{receivedFile.name}</p>
                                <p className="text-sm text-gray-400">{formatFileSize(receivedFile.size)}</p>
                            </div>
                        </div>
                        <button
                            onClick={downloadReceivedFile}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Download size={20} />
                            Download File
                        </button>
                    </div>
                )}

                {!isDownloading && !receivedFile && (
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
