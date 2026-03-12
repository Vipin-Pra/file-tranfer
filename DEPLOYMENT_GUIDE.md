# Deployment Guide

## Architecture

- **Frontend**: Deployed on Vercel (Static hosting)
- **Backend**: Deployed on Render (WebSocket server)

## Backend Deployment (Render)

### Step 1: Prepare Backend
1. Navigate to backend folder: `cd backend`
2. Install dependencies: `npm install`
3. Test locally: `npm start`

### Step 2: Deploy to Render
1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: `p2p-signaling-server`
   - **Root Directory**: `backend` (if monorepo) or leave empty
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### Step 3: Set Environment Variables on Render
Add these in Render dashboard:
```
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-name.vercel.app
```

### Step 4: Get Backend URL
After deployment, Render will provide a URL like:
`https://p2p-signaling-server.onrender.com`

---

## Frontend Deployment (Vercel)

### Step 1: Update Frontend Environment
1. Navigate to frontend folder: `cd frontend`
2. Create `.env.production` file:
```
VITE_SIGNALING_SERVER=https://your-backend-name.onrender.com
```

### Step 2: Deploy to Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel`
4. For production: `vercel --prod`

Or use Vercel Dashboard:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` (if monorepo)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 3: Set Environment Variable
In Vercel dashboard, add:
```
VITE_SIGNALING_SERVER=https://your-backend-name.onrender.com
```

### Step 4: Update Backend CORS
Go back to Render and update `CORS_ORIGIN`:
```
CORS_ORIGIN=https://your-frontend-name.vercel.app
```

---

## Post-Deployment

### Test the Application
1. Open your Vercel URL
2. Create a room
3. Share the PIN
4. Join from another device/browser

### Monitor Backend
- Health Check: `https://your-backend.onrender.com/api/health`
- Stats: `https://your-backend.onrender.com/api/stats`

---

## Important Notes

1. **Render Free Tier**: Server spins down after 15 minutes of inactivity. First connection may take 30-60 seconds.

2. **WebSocket Connection**: Ensure your backend URL uses `https://` for production. The Socket.IO client will automatically upgrade to WebSocket.

3. **CORS**: Always update CORS_ORIGIN on backend when frontend URL changes.

4. **Environment Variables**: Never commit `.env` files to Git. Use `.env.example` as template.

---

## Troubleshooting

### Connection Issues
- Check browser console for errors
- Verify backend URL in frontend `.env`
- Verify CORS settings on backend
- Check Render logs for backend errors

### WebSocket Fails
- Ensure using `https://` not `http://` for production backend
- Check if firewall/proxy blocks WebSocket
- Try different network

### Room Creation Fails
- Check backend logs on Render
- Verify backend is running (visit health endpoint)
- Check rate limiting (max 100 requests per 15 minutes)
