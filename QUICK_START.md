# Quick Start Guide

## Getting Started in 3 Steps

### Step 1: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Start the Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 3: Open the App

Open your browser and go to: **http://localhost:5173**

## Usage

### To Share Files or Video Call:

**Person 1 (Sender):**
1. Click "Create Room"
2. Share the 6-digit PIN with Person 2

**Person 2 (Receiver):**
1. Click "Join Room"
2. Enter the PIN from Person 1
3. Click "Join"

**Now you're connected!**
- Video call starts automatically
- Drag & drop files to transfer
- Click controls to mute/disable camera

## Testing on Phone

1. Make sure your phone is on the same WiFi network
2. Find your computer's local IP address:
   - Windows: Run `ipconfig` in terminal, look for IPv4 Address
   - Mac/Linux: Run `ifconfig` or `ip addr`
3. On your phone's browser, go to: `http://YOUR-IP:5173`
   - Example: `http://192.168.1.100:5173`
4. Scan the QR code or enter the PIN

## Common Issues

**Camera not working?**
- Allow camera/microphone permissions in browser

**Can't connect?**
- Make sure both backend (port 3001) and frontend (port 5173) are running
- Check if firewall is blocking the ports

**File transfer stuck?**
- Ensure stable internet connection
- Try smaller files first

---

For detailed information, see the full [README.md](README.md)
