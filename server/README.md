# RemoteAbility Classroom WebSocket Server

Real-time WebSocket server for the RemoteAbility Classroom application.

## Local Development

```bash
cd server
npm install
npm start
```

Server runs on `http://localhost:3001`

## Deploy to Railway (Recommended)

1. Create account at [railway.app](https://railway.app)
2. Install Railway CLI: `npm install -g @railway/cli`
3. Login: `railway login`
4. Initialize project:
   ```bash
   cd server
   railway init
   ```
5. Deploy:
   ```bash
   railway up
   ```
6. Get your URL from Railway dashboard (e.g., `your-app.railway.app`)

## Deploy to Render

1. Create account at [render.com](https://render.com)
2. Create new "Web Service"
3. Connect your GitHub repo
4. Set:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Deploy!

## Deploy to Heroku

```bash
cd server
heroku create your-classroom-server
git subtree push --prefix server heroku main
```

## Environment Variables

- `PORT` - Server port (default: 3001, automatically set by hosting providers)

## API

### WebSocket Messages

**Create Session (Trainer)**
```json
{
  "type": "create-session",
  "trainerName": "John Trainer",
  "weekNumber": 1,
  "dayNumber": 1
}
```

**Join Session (Trainee)**
```json
{
  "type": "join-session",
  "roomCode": "ABC123",
  "participantName": "Jane Student"
}
```

**Change Slide (Trainer only)**
```json
{
  "type": "slide-change",
  "slideIndex": 2
}
```

**Send Chat Message**
```json
{
  "type": "chat-message",
  "content": "Hello everyone!"
}
```

**End Session (Trainer only)**
```json
{
  "type": "end-session"
}
```

### HTTP Endpoints

- `GET /` - Server info page
- `GET /health` - Health check (returns `{ status: 'ok', sessions: X }`)
