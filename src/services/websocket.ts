// WebSocket service for real-time classroom communication

export interface Participant {
  id: string;
  name: string;
  initials: string;
  color: string;
  isOnline: boolean;
  isTrainer: boolean;
  joinedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'trainer' | 'trainee';
  message: string;
  timestamp: string;
}

export interface SessionState {
  roomCode: string;
  trainerName: string;
  weekNumber: number;
  dayNumber: number;
  currentSlide: number;
  participants: Participant[];
  messages: ChatMessage[];
  isActive: boolean;
}

type MessageHandler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string = '';
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private clientId: string | null = null;
  private roomCode: string | null = null;
  private isTrainer: boolean = false;

  // Get the WebSocket URL from environment or default
  getServerUrl(): string {
    // Check for environment variable first
    const envUrl = import.meta.env.VITE_WS_SERVER_URL;
    if (envUrl) return envUrl;
    
    // Check localStorage for custom server URL
    const savedUrl = localStorage.getItem('wsServerUrl');
    if (savedUrl) return savedUrl;
    
    // Default to production server on Render
    return 'wss://remoteability-server.onrender.com';
  }

  setServerUrl(url: string): void {
    localStorage.setItem('wsServerUrl', url);
    this.url = url;
  }

  connect(url?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.url = url || this.getServerUrl();
      
      console.log('Attempting WebSocket connection to:', this.url);
      
      try {
        this.ws = new WebSocket(this.url);
        
        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket connection timeout');
            this.ws.close();
            reject(new Error('Connection timeout - server may not be running'));
          }
        }, 5000);
        
        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket connected successfully to', this.url);
          this.reconnectAttempts = 0;
          this.startPing();
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };
        
        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket disconnected, code:', event.code, 'reason:', event.reason);
          this.stopPing();
          this.emit('disconnected', {});
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };
        
        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('WebSocket error:', error);
          console.error('Failed to connect to:', this.url);
          reject(new Error(`Failed to connect to WebSocket server at ${this.url}`));
        };
      } catch (err) {
        console.error('WebSocket creation error:', err);
        reject(err);
      }
    });
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000); // Ping every 30 seconds
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      this.emit('connection-failed', {});
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect(this.url).catch(() => {
        // Will trigger another reconnect attempt via onclose
      });
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.stopPing();
    this.maxReconnectAttempts = 0; // Prevent auto-reconnect
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleMessage(data: any): void {
    console.log('WebSocket message:', data.type, data);
    
    // Store client info from session responses
    if (data.type === 'session-created' || data.type === 'session-joined') {
      this.clientId = data.clientId;
      this.roomCode = data.session?.roomCode || data.roomCode;
      this.isTrainer = data.type === 'session-created';
    }
    
    // Emit to registered handlers
    this.emit(data.type, data);
  }

  on(event: string, handler: MessageHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  off(event: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
    
    // Also emit to wildcard handlers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => handler({ type: event, ...data }));
    }
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, message not sent:', data);
    }
  }

  // Session methods
  createSession(trainerName: string, weekNumber: number, dayNumber: number): void {
    this.send({
      type: 'create-session',
      trainerName,
      weekNumber,
      dayNumber
    });
  }

  joinSession(roomCode: string, participantName: string): void {
    this.send({
      type: 'join-session',
      roomCode: roomCode.toUpperCase(),
      participantName
    });
  }

  changeSlide(slideIndex: number): void {
    this.send({
      type: 'slide-change',
      slideIndex
    });
  }

  sendChatMessage(content: string): void {
    this.send({
      type: 'chat-message',
      content
    });
  }

  endSession(): void {
    this.send({
      type: 'end-session'
    });
  }

  // Getters
  getClientId(): string | null {
    return this.clientId;
  }

  getRoomCode(): string | null {
    return this.roomCode;
  }

  getIsTrainer(): boolean {
    return this.isTrainer;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const wsService = new WebSocketService();
export default wsService;
