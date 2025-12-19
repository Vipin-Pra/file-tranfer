# P2P File Transfer & Video Calling App

A full-stack peer-to-peer (P2P) application for secure file sharing and real-time video calling with advanced features like screen sharing, recording, and text chat.

## 🚀 Features

### Core Features
- **🎥 Video Calling**: Real-time peer-to-peer video calls with camera and microphone controls
- **📁 File Transfer**: Secure P2P file sharing with chunked transfer (64KB chunks) and progress tracking
- **💬 Text Chat**: Real-time messaging between connected peers
- **📱 QR Code Sharing**: Easy room joining via QR code scan

### Advanced Features
- **🖥️ Screen Sharing**: Share your screen during video calls
- **⏺️ Call Recording**: Record video calls (WebM format) with download option
- **⏱️ Call Timer**: Track call duration in HH:MM:SS format
- **🖼️ Image Preview**: Preview images before sending
- **🎨 Theme Toggle**: Light/dark mode with localStorage persistence
- **🔔 Sound Notifications**: Audio notifications for join/leave/message/file events
- **📱 Mobile Responsive**: Optimized for mobile devices

## 🛠️ Tech Stack

### Frontend
- **React 18.2.0** - UI framework
- **Vite 5.0** - Build tool
- **Tailwind CSS 3.3.5** - Styling
- **simple-peer 9.11.1** - WebRTC wrapper
- **socket.io-client 4.6.1** - WebSocket client
- **lucide-react 0.292.0** - Icons
- **qrcode.react 3.1.0** - QR code generation

### Backend
- **Node.js** - Runtime
- **Express 4.18.2** - Web framework
- **Socket.io 4.6.1** - WebSocket server
- **CORS 2.8.5** - Cross-origin resource sharing
- **CORS** - Cross-origin resource sharing

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Modern web browser** with WebRTC support (Chrome, Firefox, Edge, Safari)
- **HTTPS** (for camera/microphone access in production)

## 🚀 Installation & Setup

### 1. Clone or Navigate to the Project

## 📋 Prerequisites

- Node.js 18+ and npm installed
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Webcam and microphone (for video calling)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd "file transfer and vidio call"
```

### 2. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 3. Configure Environment Variables

**Backend** (`backend/.env`):
```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```env
VITE_SIGNALING_SERVER=http://localhost:3001
```

### 4. Start the Application

**Option A: Manual Start**

Backend:
```bash
cd backend
npm start
```

Frontend (in new terminal):
```bash
cd frontend
npm run dev
```

**Option B: Using Batch File** (Windows)
```bash
RUN_PROJECT.bat
```

### 5. Access the Application

Open your browser and navigate to:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

## 📖 How to Use

### Creating a Room
1. Click "Create Room"
2. Share the 6-digit PIN or QR code with another user
3. Wait for them to join

### Joining a Room
1. Click "Join Room"
2. Enter the 6-digit PIN or scan QR code
3. Connection establishes automatically

### During Call
- **Video Tab**: Toggle camera, microphone, screen share, and recording
- **File Transfer Tab**: Drag & drop or select files to send
- **Chat**: Click blue chat button (bottom-right) to open messaging
- **Theme**: Toggle light/dark mode (top-right)
- **Sound**: Toggle notification sounds (top-right)
- **Leave**: Click "Leave Room" to disconnect

## 🏗️ Project Structure

```
file transfer and vidio call/
├── backend/
│   ├── server.js              # Signaling server
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VideoCall.jsx       # Video call interface
│   │   │   ├── FileTransfer.jsx    # File transfer UI
│   │   │   ├── Chat.jsx            # Chat component
│   │   │   ├── RoomCreator.jsx     # Room creation
│   │   │   └── RoomJoiner.jsx      # Room joining
│   │   ├── contexts/
│   │   │   └── ThemeContext.jsx    # Theme management
│   │   ├── utils/
│   │   │   └── sounds.js           # Sound notifications
│   │   ├── App.jsx                 # Main application
│   │   ├── index.css               # Global styles
│   │   └── main.jsx                # Entry point
│   ├── package.json
│   ├── vite.config.js
│   └── .env
├── RUN_PROJECT.bat            # Windows start script
├── README.md
├── DEPLOYMENT.md              # Deployment guide
└── .gitignore
```

## 🎯 Key Features Explained

### WebRTC P2P Connection
- Uses simple-peer library for WebRTC connectivity
- STUN servers for NAT traversal
- Direct peer-to-peer communication (no data through server)

### File Transfer
- 64KB chunk size for efficient transfer
- Real-time progress tracking
- Supports all file types
- Drag & drop support

### Video Features
- Screen sharing with display selection
- Call recording using MediaRecorder API
- Downloadable WebM format recordings
- Real-time call duration timer

### Security
- P2P encryption (WebRTC built-in DTLS/SRTP)
- PIN-based room system
- 2-user room limit
- No file storage on server

## 🔧 Configuration

### Customize Chunk Size
Edit `frontend/src/components/FileTransfer.jsx`:
```javascript
const CHUNK_SIZE = 64 * 1024; // Change as needed
```

### Add TURN Servers
Edit `frontend/src/App.jsx`:
```javascript
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:your-turn-server.com:3478',
    username: 'your-username',
    credential: 'your-password'
  }
];
```

## 🚢 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions covering:
- Render
- Vercel + Railway
- Heroku
- Self-hosted VPS

## 🐛 Troubleshooting

### Connection Issues
- Ensure both backend and frontend are running
- Check browser console (F12) for errors
- Verify firewall/antivirus not blocking WebRTC
- Try different STUN/TURN servers

### Camera/Microphone Not Working
- Grant browser permissions when prompted
- Check browser settings for media access
- Verify no other app is using camera/microphone
- Use HTTPS in production (required for getUserMedia)

### File Transfer Fails
- Check file size (large files may take time)
- Verify stable network connection
- Try smaller files first
- Check browser console for errors

### Chat Not Showing
- Ensure connection is established (should see video/file tabs)
- Look for blue circular button in bottom-right corner
- Check if z-index being overridden by browser extensions
- Try refreshing page after connection

## 📊 Browser Support

| Browser | Video Call | File Transfer | Screen Share | Recording |
|---------|-----------|---------------|--------------|-----------|
| Chrome  | ✅        | ✅            | ✅           | ✅        |
| Firefox | ✅        | ✅            | ✅           | ✅        |
| Edge    | ✅        | ✅            | ✅           | ✅        |
| Safari  | ✅        | ✅            | ⚠️          | ⚠️       |
| Opera   | ✅        | ✅            | ✅           | ✅        |

⚠️ = Limited support or requires additional configuration

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- [simple-peer](https://github.com/feross/simple-peer) - WebRTC wrapper
- [Socket.io](https://socket.io/) - Real-time communication
- [React](https://react.dev/) - UI framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Lucide Icons](https://lucide.dev/) - Icon library

## 📧 Support

For issues and questions:
1. Check browser console (F12) for errors
2. Review [DEPLOYMENT.md](DEPLOYMENT.md) for deployment issues
3. Open an issue on GitHub
4. Check WebRTC internals: `chrome://webrtc-internals`

---

Made with ❤️ for secure P2P communication
- **Tailwind CSS** for beautiful styling

## 📞 Support

If you encounter any issues or have questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Ensure all dependencies are installed
4. Verify network connectivity

---

**Built with ❤️ using React, Node.js, and WebRTC**
