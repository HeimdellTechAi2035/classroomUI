const WebSocket = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3001;

// Create HTTP server for health checks and admin API
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      sessions: sessions.size,
      uptime: process.uptime(),
      version: '1.0.0'
    }));
  } 
  // Admin: Get all sessions
  else if (req.url === '/admin/sessions' && req.method === 'GET') {
    const sessionList = [];
    sessions.forEach((session, roomCode) => {
      sessionList.push({
        roomCode,
        trainerName: session.trainerName,
        weekNumber: session.weekNumber,
        dayNumber: session.dayNumber,
        participantCount: session.participants.length,
        createdAt: session.createdAt,
        messageCount: session.messages.length,
      });
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ sessions: sessionList }));
  }
  // Admin: Delete/end a session
  else if (req.url.startsWith('/admin/sessions/') && req.method === 'DELETE') {
    const roomCode = req.url.split('/').pop();
    if (sessions.has(roomCode)) {
      broadcastToRoom(roomCode, { type: 'session-ended', reason: 'Session ended by admin' });
      sessions.delete(roomCode);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: `Session ${roomCode} ended` }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Session not found' }));
    }
  }
  // Root page
  else if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head><title>RemoteAbility Classroom Server</title></head>
        <body style="font-family: system-ui; padding: 40px; background: #f5f5f5;">
          <h1>🎓 RemoteAbility Classroom Server</h1>
          <p>WebSocket server is running on port ${PORT}</p>
          <p>Active sessions: ${sessions.size}</p>
          <p>Connect your classroom app to: <code>ws://your-server:${PORT}</code></p>
          <h3>API Endpoints:</h3>
          <ul>
            <li><code>GET /health</code> - Server health check</li>
            <li><code>GET /admin/sessions</code> - List all active sessions</li>
            <li><code>DELETE /admin/sessions/:roomCode</code> - End a session</li>
          </ul>
        </body>
      </html>
    `);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store active sessions
// Map<roomCode, Session>
const sessions = new Map();

// Session structure
class Session {
  constructor(roomCode, trainerName, weekNumber, dayNumber) {
    this.roomCode = roomCode;
    this.trainerName = trainerName;
    this.weekNumber = weekNumber;
    this.dayNumber = dayNumber;
    this.currentSlide = 0;
    this.participants = new Map(); // Map<odejzej odejzej odejzej odejzej odejzejoClientId, Participant>
    this.messages = [];
    this.createdAt = new Date();
    this.isActive = true;
  }
  
  addParticipant(clientId, name, isTrainer = false) {
    const participant = {
      id: clientId,
      name,
      initials: this.getInitials(name),
      color: this.getRandomColor(),
      isOnline: true,
      isTrainer,
      joinedAt: new Date()
    };
    this.participants.set(clientId, participant);
    return participant;
  }
  
  removeParticipant(clientId) {
    const participant = this.participants.get(clientId);
    if (participant) {
      participant.isOnline = false;
    }
  }
  
  getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  
  getRandomColor() {
    const colors = [
      'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500',
      'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500',
      'bg-orange-500', 'bg-lime-500', 'bg-fuchsia-500', 'bg-sky-500'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  addMessage(clientId, senderName, message, senderType) {
    const msg = {
      id: uuidv4(),
      senderId: clientId,
      senderName,
      senderType,
      message,
      timestamp: new Date()
    };
    this.messages.push(msg);
    // Keep last 100 messages
    if (this.messages.length > 100) {
      this.messages = this.messages.slice(-100);
    }
    return msg;
  }
  
  getState() {
    return {
      roomCode: this.roomCode,
      trainerName: this.trainerName,
      weekNumber: this.weekNumber,
      dayNumber: this.dayNumber,
      currentSlide: this.currentSlide,
      participants: Array.from(this.participants.values()),
      messages: this.messages.slice(-50), // Last 50 messages
      isActive: this.isActive
    };
  }
}

// Generate a unique 6-character room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  // Make sure code is unique
  if (sessions.has(code)) {
    return generateRoomCode();
  }
  return code;
}

// Client connections Map<ws, { clientId, roomCode, isTrainer }>
const clients = new Map();

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  console.log(`Client connected: ${clientId}`);
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(ws, clientId, message);
    } catch (err) {
      console.error('Error parsing message:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
  
  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
    const clientInfo = clients.get(ws);
    if (clientInfo) {
      const session = sessions.get(clientInfo.roomCode);
      if (session) {
        session.removeParticipant(clientId);
        // Broadcast participant left
        broadcastToRoom(clientInfo.roomCode, {
          type: 'participant-left',
          participantId: clientId,
          participants: Array.from(session.participants.values())
        }, ws);
        
        // If trainer left, end session after timeout
        if (clientInfo.isTrainer) {
          console.log(`Trainer left session ${clientInfo.roomCode}`);
          // Give trainer 30 seconds to reconnect
          setTimeout(() => {
            const currentSession = sessions.get(clientInfo.roomCode);
            if (currentSession && !Array.from(currentSession.participants.values()).some(p => p.isTrainer && p.isOnline)) {
              console.log(`Ending session ${clientInfo.roomCode} - trainer didn't reconnect`);
              broadcastToRoom(clientInfo.roomCode, { type: 'session-ended', reason: 'Trainer disconnected' });
              sessions.delete(clientInfo.roomCode);
            }
          }, 30000);
        }
      }
      clients.delete(ws);
    }
  });
  
  ws.on('error', (err) => {
    console.error(`WebSocket error for ${clientId}:`, err);
  });
});

function handleMessage(ws, clientId, message) {
  console.log(`Message from ${clientId}:`, message.type);
  
  switch (message.type) {
    case 'create-session':
      handleCreateSession(ws, clientId, message);
      break;
    case 'join-session':
      handleJoinSession(ws, clientId, message);
      break;
    case 'slide-change':
      handleSlideChange(ws, clientId, message);
      break;
    case 'chat-message':
      handleChatMessage(ws, clientId, message);
      break;
    case 'end-session':
      handleEndSession(ws, clientId, message);
      break;
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

function handleCreateSession(ws, clientId, message) {
  const { trainerName, weekNumber, dayNumber } = message;
  
  const roomCode = generateRoomCode();
  const session = new Session(roomCode, trainerName, weekNumber, dayNumber);
  const participant = session.addParticipant(clientId, trainerName, true);
  
  sessions.set(roomCode, session);
  clients.set(ws, { clientId, roomCode, isTrainer: true });
  
  console.log(`Session created: ${roomCode} by ${trainerName}`);
  
  ws.send(JSON.stringify({
    type: 'session-created',
    roomCode,
    clientId,
    participant,
    session: session.getState()
  }));
}

function handleJoinSession(ws, clientId, message) {
  const { roomCode, participantName } = message;
  
  const session = sessions.get(roomCode.toUpperCase());
  if (!session) {
    ws.send(JSON.stringify({
      type: 'join-error',
      message: 'Session not found. Please check the room code.'
    }));
    return;
  }
  
  if (!session.isActive) {
    ws.send(JSON.stringify({
      type: 'join-error',
      message: 'This session has ended.'
    }));
    return;
  }
  
  const participant = session.addParticipant(clientId, participantName, false);
  clients.set(ws, { clientId, roomCode: roomCode.toUpperCase(), isTrainer: false });
  
  console.log(`${participantName} joined session ${roomCode}`);
  
  // Send session state to new participant
  ws.send(JSON.stringify({
    type: 'session-joined',
    clientId,
    participant,
    session: session.getState()
  }));
  
  // Broadcast new participant to others
  broadcastToRoom(roomCode.toUpperCase(), {
    type: 'participant-joined',
    participant,
    participants: Array.from(session.participants.values())
  }, ws);
}

function handleSlideChange(ws, clientId, message) {
  const clientInfo = clients.get(ws);
  if (!clientInfo || !clientInfo.isTrainer) {
    ws.send(JSON.stringify({ type: 'error', message: 'Only trainer can change slides' }));
    return;
  }
  
  const session = sessions.get(clientInfo.roomCode);
  if (!session) return;
  
  session.currentSlide = message.slideIndex;
  
  broadcastToRoom(clientInfo.roomCode, {
    type: 'slide-changed',
    slideIndex: message.slideIndex
  });
}

function handleChatMessage(ws, clientId, message) {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;
  
  const session = sessions.get(clientInfo.roomCode);
  if (!session) return;
  
  const participant = session.participants.get(clientId);
  if (!participant) return;
  
  const chatMsg = session.addMessage(
    clientId,
    participant.name,
    message.content,
    participant.isTrainer ? 'trainer' : 'trainee'
  );
  
  broadcastToRoom(clientInfo.roomCode, {
    type: 'chat-message',
    message: chatMsg
  });
}

function handleEndSession(ws, clientId, message) {
  const clientInfo = clients.get(ws);
  if (!clientInfo || !clientInfo.isTrainer) {
    ws.send(JSON.stringify({ type: 'error', message: 'Only trainer can end session' }));
    return;
  }
  
  const session = sessions.get(clientInfo.roomCode);
  if (!session) return;
  
  session.isActive = false;
  
  broadcastToRoom(clientInfo.roomCode, {
    type: 'session-ended',
    reason: 'Trainer ended the session'
  });
  
  console.log(`Session ${clientInfo.roomCode} ended by trainer`);
  
  // Clean up after a short delay
  setTimeout(() => {
    sessions.delete(clientInfo.roomCode);
  }, 5000);
}

function broadcastToRoom(roomCode, message, excludeWs = null) {
  const messageStr = JSON.stringify(message);
  
  clients.forEach((clientInfo, ws) => {
    if (clientInfo.roomCode === roomCode && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

// Clean up old sessions every hour
setInterval(() => {
  const now = new Date();
  sessions.forEach((session, roomCode) => {
    const ageHours = (now - session.createdAt) / (1000 * 60 * 60);
    if (ageHours > 8) { // Sessions older than 8 hours
      console.log(`Cleaning up old session: ${roomCode}`);
      broadcastToRoom(roomCode, { type: 'session-ended', reason: 'Session expired' });
      sessions.delete(roomCode);
    }
  });
}, 60 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`🎓 RemoteAbility Classroom Server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
});
