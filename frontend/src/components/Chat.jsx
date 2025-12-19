import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, X } from 'lucide-react';
import { playSound } from '../utils/sounds';

const Chat = ({ peer, socket, peerId }) => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Receive messages via peer connection
    useEffect(() => {
        if (!peer) return;

        const handleData = (data) => {
            if (typeof data === 'string') {
                try {
                    const message = JSON.parse(data);
                    if (message.type === 'chat-message') {
                        const newMessage = {
                            text: message.text,
                            sender: 'peer',
                            timestamp: new Date().toLocaleTimeString()
                        };
                        setMessages(prev => [...prev, newMessage]);

                        if (!isOpen) {
                            setUnreadCount(prev => prev + 1);
                        }

                        // Play notification sound
                        playSound('messageReceived');
                    }
                } catch (error) {
                    // Not a chat message
                }
            }
        };

        peer.on('data', handleData);
        return () => peer.off('data', handleData);
    }, [peer, isOpen]);

    const sendMessage = () => {
        if (!inputMessage.trim() || !peer) return;

        const message = {
            text: inputMessage,
            sender: 'me',
            timestamp: new Date().toLocaleTimeString()
        };

        setMessages(prev => [...prev, message]);

        // Send via peer connection
        peer.send(JSON.stringify({
            type: 'chat-message',
            text: inputMessage
        }));

        setInputMessage('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setUnreadCount(0);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={toggleChat}
                className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all z-50"
            >
                <MessageCircle size={24} />
                {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-80 h-96 bg-dark-800 rounded-lg shadow-2xl flex flex-col z-50">
            {/* Header */}
            <div className="bg-dark-700 px-4 py-3 rounded-t-lg flex items-center justify-between">
                <h3 className="text-white font-semibold flex items-center gap-2">
                    <MessageCircle size={20} />
                    Chat
                </h3>
                <button
                    onClick={toggleChat}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                        <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No messages yet</p>
                        <p className="text-sm">Start chatting!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] rounded-lg px-3 py-2 ${msg.sender === 'me'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-dark-600 text-gray-200'
                                    }`}
                            >
                                <p className="text-sm break-words">{msg.text}</p>
                                <p className="text-xs opacity-70 mt-1">{msg.timestamp}</p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-dark-700 rounded-b-lg">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 bg-dark-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!peer || !peer.connected}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim() || !peer || !peer.connected}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-dark-600 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chat;
