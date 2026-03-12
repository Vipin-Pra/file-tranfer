import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { playSound } from '../utils/sounds';

const Chat = ({ peer, onNewMessage }) => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Track peer connection state reactively
    useEffect(() => {
        if (!peer) { setIsConnected(false); return; }

        setIsConnected(!!peer.connected);

        const onConnect = () => setIsConnected(true);
        const onClose = () => setIsConnected(false);

        peer.on('connect', onConnect);
        peer.on('close', onClose);
        peer.on('error', onClose);
        return () => {
            peer.off('connect', onConnect);
            peer.off('close', onClose);
            peer.off('error', onClose);
        };
    }, [peer]);

    // Receive messages via peer data channel
    useEffect(() => {
        if (!peer) return;

        const handleData = (data) => {
            if (typeof data !== 'string') return;
            try {
                const msg = JSON.parse(data);
                if (msg.type === 'chat-message') {
                    setMessages((prev) => [...prev, {
                        text: msg.text,
                        sender: 'peer',
                        timestamp: new Date().toLocaleTimeString(),
                    }]);
                    playSound('messageReceived');
                    onNewMessage?.();
                }
            } catch {
                // Not a chat message (could be file transfer data)
            }
        };

        peer.on('data', handleData);
        return () => peer.off('data', handleData);
    }, [peer, onNewMessage]);

    // Send message
    const sendMessage = () => {
        if (!inputMessage.trim() || !peer) return;

        setMessages((prev) => [...prev, {
            text: inputMessage,
            sender: 'me',
            timestamp: new Date().toLocaleTimeString(),
        }]);

        peer.send(JSON.stringify({ type: 'chat-message', text: inputMessage }));
        setInputMessage('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="h-full bg-gray-800 flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
                <h3 className="text-white text-xl font-semibold">Chat</h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-12">
                        <MessageCircle className="w-16 h-16 mx-auto mb-3 opacity-30" />
                        <p className="text-lg">No messages yet</p>
                        <p className="text-sm mt-1">Start a conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                                msg.sender === 'me'
                                    ? 'bg-blue-600 text-white rounded-br-sm'
                                    : 'bg-gray-700 text-gray-100 rounded-bl-sm'
                            }`}>
                                <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                                <p className={`text-[10px] mt-1 ${
                                    msg.sender === 'me' ? 'text-blue-200' : 'text-gray-400'
                                }`}>
                                    {msg.timestamp}
                                </p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-gray-800 border-t border-gray-700">
                <div className="flex gap-2 items-center bg-gray-700 rounded-lg px-3 py-2">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent text-gray-100 placeholder-gray-400 focus:outline-none text-sm"
                        disabled={!isConnected}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim() || !isConnected}
                        className="text-gray-400 hover:text-blue-400 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors p-1"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chat;
