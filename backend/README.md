# P2P Signaling Server (Backend)

Production-ready WebSocket signaling server for peer-to-peer video calls and file transfers.

## Features

- ✅ Real-time WebRTC signaling via Socket.IO
- ✅ Room-based peer connections with PIN system
- ✅ Large file transfer support (up to 100MB)
- ✅ Production-ready security (Helmet, CORS, Rate Limiting)
- ✅ Connection analytics and monitoring
- ✅ Health check endpoints
- ✅ Automatic cleanup of stale rooms
- ✅ Graceful shutdown handling
- ✅ Comprehensive logging

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **WebSocket**: Socket.IO
- **Security**: Helmet, CORS, Rate Limiting
- **Performance**: Compression middleware

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file:

```env
PORT=3001
HOST=0.0.0.0
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### Health Check
```
GET /
GET /api/health
```

Returns server status and statistics.

### Stats Endpoint
```
GET /api/stats
```

Returns connection statistics:
- Active rooms
- Connected clients
- Total connections
- Peak connections
- Uptime

## Socket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `create-room` | - | Create a new room and get PIN |
| `join-room` | `{ pin }` | Join existing room with PIN |
| `signal` | `{ signal, to }` | WebRTC signaling data |
| `ice-candidate` | `{ candidate, to }` | ICE candidate exchange |
| `file-metadata` | `{ fileName, fileSize, fileType, to }` | File transfer initiation |
| `leave-room` | - | Leave current room |
| `ping` | - | Keep-alive heartbeat |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ socketId, serverTime }` | Connection confirmation |
| `room-created` | `{ pin, roomId, features }` | Room created successfully |
| `room-joined` | `{ pin, roomId, creatorId, features }` | Joined room successfully |
| `peer-joined` | `{ peerId, timestamp }` | Peer joined your room |
| `peer-disconnected` | `{ reason, timestamp }` | Peer left the room |
| `signal` | `{ signal, from, timestamp }` | WebRTC signaling from peer |
| `ice-candidate` | `{ candidate, from, timestamp }` | ICE candidate from peer |
| `file-metadata` | `{ fileName, fileSize, fileType, from, timestamp }` | Incoming file transfer |
| `error` | `{ message }` | Error message |
| `pong` | `{ timestamp }` | Heartbeat response |

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client A  │◄───────►│   Signaling  │◄───────►│   Client B  │
│  (Browser)  │         │    Server    │         │  (Browser)  │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                         │
      │   WebSocket/Socket.IO  │   WebSocket/Socket.IO   │
      │                        │                         │
      └────────────────────────┴─────────────────────────┘
                     WebRTC P2P Connection
              (Video, Audio, Data Channel for Files)
```

## Security Features

1. **Helmet**: Security headers protection
2. **CORS**: Configurable cross-origin resource sharing
3. **Rate Limiting**: 100 requests per 15 minutes per IP
4. **Input Validation**: PIN validation and sanitization
5. **Connection Limits**: 2 peers per room maximum

## Monitoring

### Logs
The server provides structured logging:
- `[INFO]` - Normal operations
- `[WARN]` - Warning messages
- `[ERROR]` - Error conditions

### Metrics
Track via `/api/stats` endpoint:
- Active connections
- Total connections
- Peak connections
- Active rooms
- Server uptime

## Deployment

### Render (Recommended)
See [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) for detailed instructions.

Quick deploy button:
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### Heroku
```bash
heroku create your-app-name
git push heroku main
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## Environment Variables for Production

```env
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=https://your-frontend.vercel.app
```

## Performance

- **Compression**: Gzip compression enabled
- **Connection Pooling**: Socket.IO connection optimization
- **Cleanup**: Automatic stale room cleanup every hour
- **Graceful Shutdown**: Proper cleanup on SIGTERM/SIGINT

## License

ISC
