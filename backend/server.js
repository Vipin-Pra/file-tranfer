import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// --- Security & Performance ---
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'];

const corsHandler = (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
        return cb(null, true);
    }
    cb(null, true);
};

app.use(cors({
    origin: corsHandler,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.',
}));

// --- Socket.IO ---
const io = new Server(httpServer, {
    cors: { origin: corsHandler, methods: ['GET', 'POST'], credentials: true },
    maxHttpBufferSize: 1e8,
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    connectTimeout: 45000,
});

// --- State ---
const rooms = new Map();
const socketToRoom = new Map();
const stats = {
    totalConnections: 0,
    activeConnections: 0,
    totalRooms: 0,
    peakConnections: 0,
    startTime: Date.now(),
};

// --- Logger ---
const log = {
    info: (msg, data = '') => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data),
    error: (msg, err = '') => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err),
    warn: (msg, data = '') => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data),
};

// --- Helpers ---
function generatePIN() {
    for (let i = 0; i < 1000; i++) {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        if (!rooms.has(pin)) return pin;
    }
    throw new Error('Unable to generate unique PIN');
}

function notifyPeer(room, disconnectingId, event, payload) {
    try {
        if (room.senderId === disconnectingId && room.receiverSocket) {
            room.receiverSocket.emit(event, payload);
        } else if (room.receiverId === disconnectingId && room.senderSocket) {
            room.senderSocket.emit(event, payload);
        }
    } catch (err) {
        log.error('Error notifying peer', err);
    }
}

function cleanupRoom(socketId) {
    const pin = socketToRoom.get(socketId);
    if (!pin) return;

    const room = rooms.get(pin);
    if (room) {
        notifyPeer(room, socketId, 'peer-disconnected', {
            reason: 'user-left',
            timestamp: Date.now(),
        });
        rooms.delete(pin);
        log.info(`Room ${pin} deleted`);
    }

    socketToRoom.delete(socketId);
}

// Cleanup stale rooms every hour
setInterval(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [pin, room] of rooms) {
        if (room.createdAt < cutoff) {
            rooms.delete(pin);
            log.info(`Cleaned up stale room: ${pin}`);
        }
    }
}, 60 * 60 * 1000);

// --- REST Routes ---
app.get('/', (_req, res) => {
    res.json({
        status: 'healthy',
        message: 'P2P Signaling Server Running',
        version: '2.0.0',
        uptime: Math.floor((Date.now() - stats.startTime) / 1000),
        stats: {
            activeRooms: rooms.size,
            connectedClients: stats.activeConnections,
            totalConnections: stats.totalConnections,
            peakConnections: stats.peakConnections,
        },
    });
});

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/stats', (_req, res) => {
    res.json({
        rooms: rooms.size,
        connections: stats.activeConnections,
        total: stats.totalConnections,
        peak: stats.peakConnections,
        uptime: Math.floor((Date.now() - stats.startTime) / 1000),
    });
});

// --- Socket.IO Events ---
io.on('connection', (socket) => {
    stats.totalConnections++;
    stats.activeConnections++;
    stats.peakConnections = Math.max(stats.peakConnections, stats.activeConnections);
    log.info(`User connected: ${socket.id}`);
    socket.emit('connected', { socketId: socket.id });

    // Create room
    socket.on('create-room', () => {
        try {
            const pin = generatePIN();
            rooms.set(pin, {
                senderId: socket.id,
                senderSocket: socket,
                receiverId: null,
                receiverSocket: null,
                createdAt: Date.now(),
                metadata: { features: ['video', 'audio', 'chat', 'file-transfer'] },
            });
            socketToRoom.set(socket.id, pin);
            stats.totalRooms++;
            socket.emit('room-created', {
                pin,
                roomId: pin,
                features: ['video', 'audio', 'chat', 'file-transfer'],
            });
            log.info(`Room created: ${pin} by ${socket.id}`);
        } catch (err) {
            log.error('Error creating room', err);
            socket.emit('error', { message: 'Failed to create room.' });
        }
    });

    // Join room
    socket.on('join-room', ({ pin }) => {
        const room = rooms.get(pin);
        if (!room) {
            return socket.emit('error', { message: 'Invalid PIN. Room does not exist.' });
        }
        if (room.receiverId) {
            return socket.emit('error', { message: 'Room is full. Only 2 users allowed.' });
        }

        room.receiverId = socket.id;
        room.receiverSocket = socket;
        socketToRoom.set(socket.id, pin);

        socket.emit('room-joined', {
            pin,
            roomId: pin,
            creatorId: room.senderId,
            features: room.metadata.features,
        });
        room.senderSocket.emit('peer-joined', {
            peerId: socket.id,
            timestamp: Date.now(),
        });
        log.info(`User ${socket.id} joined room ${pin}`);
    });

    // WebRTC signaling
    socket.on('signal', ({ signal, to }) => {
        io.to(to).emit('signal', { signal, from: socket.id });
    });

    socket.on('ice-candidate', ({ candidate, to }) => {
        io.to(to).emit('ice-candidate', { candidate, from: socket.id });
    });

    // File metadata relay
    socket.on('file-metadata', ({ fileName, fileSize, fileType, to }) => {
        io.to(to).emit('file-metadata', { fileName, fileSize, fileType, from: socket.id });
    });

    // Heartbeat
    socket.on('ping', () => socket.emit('pong', { timestamp: Date.now() }));

    // Leave room
    socket.on('leave-room', () => cleanupRoom(socket.id));

    // Disconnect
    socket.on('disconnect', (reason) => {
        stats.activeConnections--;
        cleanupRoom(socket.id);
        log.info(`User disconnected: ${socket.id} (${reason})`);
    });

    socket.on('error', (err) => {
        log.error('Socket error', { socketId: socket.id, error: err });
    });
});

// --- Graceful Shutdown ---
async function gracefulShutdown(signal) {
    log.info(`${signal} received: shutting down`);

    io.emit('server-shutdown', {
        message: 'Server is shutting down. Please reconnect shortly.',
    });

    await new Promise((r) => setTimeout(r, 1000));

    const sockets = await io.fetchSockets();
    sockets.forEach((s) => s.disconnect(true));
    io.close();

    httpServer.close(() => {
        log.info('Shutdown complete');
        process.exit(0);
    });

    setTimeout(() => process.exit(1), 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
    log.error('Uncaught exception', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    log.error('Unhandled rejection', reason);
});

// --- Start Server ---
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, '0.0.0.0', () => {
    log.info(`Server running on http://0.0.0.0:${PORT} | ENV: ${process.env.NODE_ENV || 'development'}`);
});

httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        log.error(`Port ${PORT} is already in use`);
    } else {
        log.error('Server error', err);
    }
    process.exit(1);
});
