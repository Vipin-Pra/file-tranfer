# Deployment Guide

## Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- A hosting platform (Render, Heroku, Vercel, Railway, etc.)

## Local Production Build

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run build
npm run preview
```

## Environment Variables

### Backend (.env)
```
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com
```

### Frontend (.env)
```
VITE_SIGNALING_SERVER=https://your-backend-domain.com
```

## Deployment Options

### Option 1: Deploy to Render

#### Backend Deployment
1. Create account on [Render](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: p2p-signaling-server
   - **Environment**: Node
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Add Environment Variables**:
     - `PORT=3001`
     - `NODE_ENV=production`
     - `CORS_ORIGIN=https://your-frontend-url.onrender.com`
5. Click "Create Web Service"
6. Copy the deployed URL (e.g., `https://p2p-signaling-server.onrender.com`)

#### Frontend Deployment
1. Click "New +" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   - **Name**: p2p-file-video-app
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
   - **Add Environment Variables**:
     - `VITE_SIGNALING_SERVER=https://your-backend-url.onrender.com`
4. Click "Create Static Site"

### Option 2: Deploy to Vercel (Frontend) + Railway (Backend)

#### Backend (Railway)
1. Create account on [Railway](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select repository
4. Configure:
   - **Root Directory**: `backend`
   - **Start Command**: `npm start`
   - **Add Variables**:
     - `PORT=3001`
     - `NODE_ENV=production`
     - `CORS_ORIGIN=https://your-frontend.vercel.app`
5. Deploy and copy URL

#### Frontend (Vercel)
1. Install Vercel CLI: `npm i -g vercel`
2. Navigate to project: `cd frontend`
3. Run: `vercel`
4. Configure:
   - Set environment variable: `VITE_SIGNALING_SERVER=https://your-backend.railway.app`
5. Run: `vercel --prod` for production

### Option 3: Deploy to Heroku

#### Backend
```bash
cd backend
heroku create p2p-signaling-server
heroku config:set NODE_ENV=production
heroku config:set CORS_ORIGIN=https://your-frontend.herokuapp.com
git subtree push --prefix backend heroku main
```

#### Frontend
```bash
cd frontend
heroku create p2p-file-video-app
heroku config:set VITE_SIGNALING_SERVER=https://p2p-signaling-server.herokuapp.com
heroku buildpacks:add heroku/nodejs
git subtree push --prefix frontend heroku main
```

### Option 4: Self-Hosted (VPS/Cloud)

#### Setup on Ubuntu/Debian Server

1. **Install Node.js**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Install PM2**:
```bash
sudo npm install -g pm2
```

3. **Clone Repository**:
```bash
git clone <your-repo-url>
cd "file transfer and vidio call"
```

4. **Setup Backend**:
```bash
cd backend
npm install
pm2 start server.js --name p2p-backend
pm2 save
```

5. **Setup Frontend**:
```bash
cd ../frontend
npm install
npm run build
sudo npm install -g serve
pm2 start "serve -s dist -p 5173" --name p2p-frontend
pm2 save
```

6. **Setup Nginx Reverse Proxy**:
```nginx
# Backend (/etc/nginx/sites-available/p2p-backend)
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend (/etc/nginx/sites-available/p2p-frontend)
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

7. **Enable Sites**:
```bash
sudo ln -s /etc/nginx/sites-available/p2p-backend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/p2p-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

8. **Setup SSL with Certbot** (Optional but recommended):
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

## Important Notes

### WebRTC Considerations
- For production, consider adding TURN servers for better connectivity behind NATs
- Free TURN servers: [Twilio NAT Traversal](https://www.twilio.com/stun-turn), [Metered](https://www.metered.ca/tools/openrelay/)
- Add to `App.jsx`:
```javascript
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:your-turn-server.com:3478',
    username: 'username',
    credential: 'password'
  }
];
```

### Security Best Practices
1. Always use HTTPS in production (WebRTC requires secure context)
2. Set appropriate CORS origins (don't use `*`)
3. Implement rate limiting on signaling server
4. Add authentication for room creation (optional)
5. Sanitize all user inputs

### Performance Optimization
- Enable gzip compression
- Use CDN for static assets
- Implement connection pooling
- Add health check endpoints
- Monitor with tools like PM2 or New Relic

### Testing Production Build
1. Build frontend: `cd frontend && npm run build`
2. Test locally: `npm run preview`
3. Check all features work:
   - ✓ Video calling
   - ✓ Screen sharing
   - ✓ Recording
   - ✓ File transfer
   - ✓ Chat
   - ✓ Theme toggle
   - ✓ Sound notifications

## Troubleshooting

### CORS Issues
- Ensure `CORS_ORIGIN` in backend matches frontend URL exactly
- Check browser console for specific CORS errors
- Verify both HTTP and WebSocket connections allowed

### WebRTC Connection Fails
- Check if HTTPS is enabled (required for getUserMedia)
- Verify STUN/TURN servers are accessible
- Test with different browsers
- Check firewall settings

### Socket.io Connection Issues
- Verify backend URL is correct and accessible
- Check if WebSocket transport is allowed
- Look for proxy/firewall blocking WebSocket
- Ensure backend is running and healthy

## Monitoring

### Backend Health Check
Add to `server.js`:
```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});
```

### Frontend Error Tracking
Consider adding services like:
- Sentry
- LogRocket
- Bugsnag

## Cost Estimation

### Free Tier Options
- **Render**: Free tier (sleeps after 15 min inactivity)
- **Railway**: $5 credit monthly
- **Vercel**: Free for frontend
- **Heroku**: Limited free hours

### Recommended for Production
- **Backend**: Railway ($5-10/month) or DigitalOcean Droplet ($4-6/month)
- **Frontend**: Vercel/Netlify (Free or $10-20/month)
- **TURN Server**: Metered.ca (Pay-as-you-go, ~$0.05-0.10 per GB)

## Support
For issues, check:
1. Browser console (F12)
2. Backend logs
3. Network tab for failed requests
4. WebRTC internals: `chrome://webrtc-internals`
