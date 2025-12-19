import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Configure CORS for both Express and Socket.io
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    },
    maxHttpBufferSize: 1e8 // 100 MB for large file chunks
});

// Room management
const rooms = new Map(); // PIN -> { senderId, receiverId, senderSocket, receiverSocket }
const socketToRoom = new Map(); // socketId -> PIN

// Generate a unique 6-digit PIN
function generatePIN() {
    let pin;
    do {
        pin = Math.floor(100000 + Math.random() * 900000).toString();
    } while (rooms.has(pin));
    return pin;
}

app.get('/', (req, res) => {
    res.json({
        message: 'P2P Signaling Server Running',
        activeRooms: rooms.size,
        connectedClients: io.engine.clientsCount
    });
});

io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    // Create a new room and generate PIN
    socket.on('create-room', () => {
        const pin = generatePIN();

        rooms.set(pin, {
            senderId: socket.id,
            senderSocket: socket,
            receiverId: null,
            receiverSocket: null,
            createdAt: Date.now()
        });

        socketToRoom.set(socket.id, pin);

        socket.emit('room-created', { pin });
        console.log(`🔑 Room created with PIN: ${pin} by ${socket.id}`);
    });

    // Join an existing room with PIN
    socket.on('join-room', ({ pin }) => {
        const room = rooms.get(pin);

        if (!room) {
            socket.emit('error', { message: 'Invalid PIN. Room does not exist.' });
            return;
        }

        if (room.receiverId) {
            socket.emit('error', { message: 'Room is full. Only 2 users allowed.' });
            return;
        }

        // Add receiver to room
        room.receiverId = socket.id;
        room.receiverSocket = socket;
        socketToRoom.set(socket.id, pin);

        // Tell joiner who the room creator is
        socket.emit('room-joined', { pin, creatorId: room.senderId });

        // Notify sender that receiver has joined
        room.senderSocket.emit('peer-joined', { peerId: socket.id });

        console.log(`🤝 User ${socket.id} joined room ${pin}`);
    });

    // WebRTC signaling: forward offer, answer, and ICE candidates
    socket.on('signal', ({ signal, to }) => {
        console.log(`📡 Forwarding signal from ${socket.id} to ${to}`);
        io.to(to).emit('signal', { signal, from: socket.id });
    });

    // ICE candidate exchange
    socket.on('ice-candidate', ({ candidate, to }) => {
        io.to(to).emit('ice-candidate', { candidate, from: socket.id });
    });

    // File transfer initiation notification
    socket.on('file-metadata', ({ fileName, fileSize, fileType, to }) => {
        io.to(to).emit('file-metadata', {
            fileName,
            fileSize,
            fileType,
            from: socket.id
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const pin = socketToRoom.get(socket.id);

        if (pin) {
            const room = rooms.get(pin);

            if (room) {
                // Notify the other peer
                if (room.senderId === socket.id && room.receiverSocket) {
                    room.receiverSocket.emit('peer-disconnected');
                } else if (room.receiverId === socket.id && room.senderSocket) {
                    room.senderSocket.emit('peer-disconnected');
                }

                // Clean up room
                rooms.delete(pin);
                console.log(`🧹 Room ${pin} deleted`);
            }

            socketToRoom.delete(socket.id);
        }

        console.log(`❌ User disconnected: ${socket.id}`);
    });

    // Explicit leave room
    socket.on('leave-room', () => {
        const pin = socketToRoom.get(socket.id);

        if (pin) {
            const room = rooms.get(pin);

            if (room) {
                if (room.senderId === socket.id && room.receiverSocket) {
                    room.receiverSocket.emit('peer-disconnected');
                } else if (room.receiverId === socket.id && room.senderSocket) {
                    room.senderSocket.emit('peer-disconnected');
                }

                rooms.delete(pin);
            }

            socketToRoom.delete(socket.id);
        }
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`🚀 Signaling server running on http://localhost:${PORT}`);
});
