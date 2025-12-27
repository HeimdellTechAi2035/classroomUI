# 🚀 RemoteAbility Classroom Deployment Guide

## Architecture Overview

| Component | Deploy To | Purpose |
|-----------|-----------|---------|
| Frontend (React) | Netlify | Static site hosting |
| WebSocket Server | Railway/Render | Real-time communication |

---

## Step 1: Deploy WebSocket Server (Railway - Recommended)

### Option A: Railway (Free tier available)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Click "Add variables" and add: `PORT` = `3001` (optional, Railway auto-assigns)

3. **Configure Service**
   - Click on the service → Settings
   - Set **Root Directory**: `server`
   - Railway auto-detects Node.js

4. **Get Your Server URL**
   - Go to Settings → Domains
   - Click "Generate Domain"
   - Copy URL (e.g., `classroom-server-production.up.railway.app`)
   - Your WebSocket URL is: `wss://classroom-server-production.up.railway.app`

### Option B: Render (Free tier available)

1. Go to [render.com](https://render.com) and sign up
2. Create "New Web Service"
3. Connect GitHub repo
4. Configure:
   - **Name**: `remoteability-server`
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click "Create Web Service"
6. Copy your URL: `wss://remoteability-server.onrender.com`

---

## Step 2: Deploy Frontend (Netlify)

1. **Create Netlify Account**
   - Go to [netlify.com](https://netlify.com)
   - Sign up with GitHub

2. **Import Project**
   - Click "Add new site" → "Import an existing project"
   - Choose GitHub and select your repository
   
3. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Click "Deploy site"

4. **Set Environment Variables**
   - Go to Site Settings → Environment Variables
   - Add: `VITE_WS_SERVER_URL` = `wss://your-server.railway.app` (your Railway URL)
   - Redeploy the site

5. **Custom Domain (Optional)**
   - Go to Domain Settings
   - Add your custom domain

---

## Step 3: Configure the App

### Update CSP for Production

Edit `index.html` and update the Content-Security-Policy to include your server domain:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' wss://your-server.railway.app https://your-server.railway.app ws://localhost:3001;">
```

---

## Step 4: Test Your Deployment

1. **Test Server**
   - Open `https://your-server.railway.app/health`
   - Should return: `{"status":"ok","sessions":0}`

2. **Test Frontend**
   - Open your Netlify URL
   - Navigate to Week 1 → Day 1 → Present (as Trainer)
   - Click "Start Live Session"
   - Should generate a room code

3. **Test Join**
   - Open a new incognito window
   - Go to `https://your-netlify-site.netlify.app/join`
   - Enter the room code
   - Should successfully join!

---

## Quick Reference

### URLs After Deployment

| Page | URL |
|------|-----|
| Home | `https://your-site.netlify.app/` |
| Admin | `https://your-site.netlify.app/admin` |
| Join Session | `https://your-site.netlify.app/join?code=XXXXX` |
| Trainer View | `https://your-site.netlify.app/present?week=1&day=1&role=trainer` |

### Admin Dashboard

- URL: `/admin`
- Default Password: `admin123` (change this in production!)
- Features: View active sessions, end sessions, configure server URL

---

## Troubleshooting

### "Failed to connect to server"
- Check if WebSocket server is running (visit `/health` endpoint)
- Verify `VITE_WS_SERVER_URL` environment variable is set correctly
- Make sure CSP allows your server domain

### Sessions not syncing
- Check browser console for WebSocket errors
- Verify both trainer and trainee are connected to same server

### Netlify deploy fails
- Check build logs for errors
- Ensure `npm run build` works locally first

---

## Updating the App

### Frontend (Netlify)
- Push to GitHub → Netlify auto-deploys

### Server (Railway/Render)
- Push to GitHub → Auto-deploys from `server` folder

---

## Security Notes

1. **Change Admin Password**: Edit `src/pages/AdminDashboard.tsx` and change `ADMIN_PASSWORD`
2. **Use HTTPS/WSS**: Both Netlify and Railway provide HTTPS by default
3. **Environment Variables**: Never commit `.env` files with secrets
