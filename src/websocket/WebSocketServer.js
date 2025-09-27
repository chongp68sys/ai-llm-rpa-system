import { WebSocket, WebSocketServer } from 'ws';
import { authService } from '../auth/AuthService.js';
import { URL } from 'url';

export class WorkflowWebSocketServer {
  constructor(server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });
    this.clients = new Map(); // Map of authenticated clients
    this.rooms = new Map(); // Map of rooms (workflow executions)
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.wss.on('connection', async (ws, request) => {
      try {
        console.log('🔌 New WebSocket connection attempt');
        
        // Extract token from query string or headers
        const url = new URL(request.url, `http://${request.headers.host}`);
        const token = url.searchParams.get('token') || request.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          console.log('❌ WebSocket connection rejected: No token provided');
          ws.close(1008, 'No authentication token provided');
          return;
        }

        // Verify authentication
        const authData = await authService.verifyToken(token);
        
        // Store client info
        const clientId = this.generateClientId();
        const clientInfo = {
          id: clientId,
          ws,
          user: authData.user,
          subscribedRooms: new Set(),
          lastActivity: new Date()
        };
        
        this.clients.set(clientId, clientInfo);
        ws.clientId = clientId;
        
        console.log(`✅ WebSocket authenticated: ${authData.user.username} (${clientId})`);
        
        // Send connection confirmation
        this.sendToClient(clientId, {
          type: 'connection',
          status: 'authenticated',
          user: {
            id: authData.user.id,
            username: authData.user.username,
            role: authData.user.role
          }
        });

        // Set up message handlers
        ws.on('message', (data) => this.handleMessage(clientId, data));
        ws.on('close', () => this.handleDisconnection(clientId));
        ws.on('error', (error) => this.handleError(clientId, error));
        
        // Set up ping/pong for connection health
        ws.on('pong', () => {
          const client = this.clients.get(clientId);
          if (client) {
            client.lastActivity = new Date();
          }
        });

      } catch (error) {
        console.error('❌ WebSocket authentication failed:', error.message);
        ws.close(1008, 'Authentication failed');
      }
    });

    // Set up periodic ping to check connection health
    this.pingInterval = setInterval(() => {
      this.checkConnections();
    }, 30000); // Check every 30 seconds
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  handleMessage(clientId, data) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      client.lastActivity = new Date();
      
      const message = JSON.parse(data.toString());
      console.log(`📨 Message from ${client.user.username}:`, message.type);

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(clientId, message);
          break;
          
        case 'unsubscribe':
          this.handleUnsubscribe(clientId, message);
          break;
          
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
          break;
          
        case 'workflow_action':
          this.handleWorkflowAction(clientId, message);
          break;
          
        default:
          console.log(`⚠️ Unknown message type: ${message.type}`);
          this.sendToClient(clientId, {
            type: 'error',
            message: `Unknown message type: ${message.type}`
          });
      }
    } catch (error) {
      console.error(`❌ Error handling message from ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Invalid message format'
      });
    }
  }

  handleSubscribe(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { room } = message;
    if (!room) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Room parameter required for subscription'
      });
      return;
    }

    // Add client to room
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    
    this.rooms.get(room).add(clientId);
    client.subscribedRooms.add(room);

    console.log(`📡 Client ${client.user.username} subscribed to room: ${room}`);
    
    this.sendToClient(clientId, {
      type: 'subscribed',
      room,
      message: `Subscribed to ${room}`
    });
  }

  handleUnsubscribe(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { room } = message;
    if (!room) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Room parameter required for unsubscription'
      });
      return;
    }

    // Remove client from room
    if (this.rooms.has(room)) {
      this.rooms.get(room).delete(clientId);
      
      // Clean up empty rooms
      if (this.rooms.get(room).size === 0) {
        this.rooms.delete(room);
      }
    }
    
    client.subscribedRooms.delete(room);

    console.log(`📡 Client ${client.user.username} unsubscribed from room: ${room}`);
    
    this.sendToClient(clientId, {
      type: 'unsubscribed',
      room,
      message: `Unsubscribed from ${room}`
    });
  }

  handleWorkflowAction(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // This could trigger workflow actions like start, stop, pause
    // For now, we'll just acknowledge the message
    console.log(`🚀 Workflow action from ${client.user.username}:`, message.action);
    
    this.sendToClient(clientId, {
      type: 'workflow_action_ack',
      action: message.action,
      timestamp: new Date().toISOString()
    });
  }

  handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`🔌 Client disconnected: ${client.user.username} (${clientId})`);
    
    // Remove client from all rooms
    for (const room of client.subscribedRooms) {
      if (this.rooms.has(room)) {
        this.rooms.get(room).delete(clientId);
        
        // Clean up empty rooms
        if (this.rooms.get(room).size === 0) {
          this.rooms.delete(room);
        }
      }
    }
    
    // Remove client
    this.clients.delete(clientId);
  }

  handleError(clientId, error) {
    const client = this.clients.get(clientId);
    console.error(`❌ WebSocket error for ${client?.user?.username || 'unknown'} (${clientId}):`, error);
  }

  checkConnections() {
    const now = new Date();
    const staleThreshold = 60000; // 1 minute

    for (const [clientId, client] of this.clients) {
      // Check if connection is stale
      if (now - client.lastActivity > staleThreshold) {
        console.log(`🧹 Cleaning up stale connection: ${client.user.username} (${clientId})`);
        client.ws.terminate();
        this.handleDisconnection(clientId);
      } else if (client.ws.readyState === WebSocket.OPEN) {
        // Send ping to active connections
        client.ws.ping();
      }
    }
  }

  // Public methods for sending messages

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`❌ Error sending message to ${clientId}:`, error);
      return false;
    }
  }

  sendToRoom(room, message) {
    const roomClients = this.rooms.get(room);
    if (!roomClients) return 0;

    let sentCount = 0;
    for (const clientId of roomClients) {
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }

    return sentCount;
  }

  broadcast(message, excludeClientId = null) {
    let sentCount = 0;
    for (const [clientId, client] of this.clients) {
      if (clientId !== excludeClientId && this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }
    return sentCount;
  }

  // Workflow-specific broadcast methods

  broadcastWorkflowStatus(workflowId, executionId, status, data = {}) {
    const room = `workflow_${workflowId}`;
    const message = {
      type: 'workflow_status',
      workflowId,
      executionId,
      status,
      data,
      timestamp: new Date().toISOString()
    };

    const sentCount = this.sendToRoom(room, message);
    console.log(`📊 Workflow status broadcasted to ${sentCount} clients in room ${room}`);
    return sentCount;
  }

  broadcastNodeStatus(workflowId, executionId, nodeId, status, data = {}) {
    const room = `workflow_${workflowId}`;
    const message = {
      type: 'node_status',
      workflowId,
      executionId,
      nodeId,
      status,
      data,
      timestamp: new Date().toISOString()
    };

    const sentCount = this.sendToRoom(room, message);
    console.log(`📊 Node status broadcasted to ${sentCount} clients in room ${room}`);
    return sentCount;
  }

  broadcastExecutionLog(workflowId, executionId, logEntry) {
    const room = `workflow_${workflowId}`;
    const message = {
      type: 'execution_log',
      workflowId,
      executionId,
      log: logEntry,
      timestamp: new Date().toISOString()
    };

    const sentCount = this.sendToRoom(room, message);
    return sentCount;
  }

  // Statistics and monitoring

  getStats() {
    const roomStats = {};
    for (const [room, clients] of this.rooms) {
      roomStats[room] = clients.size;
    }

    return {
      totalClients: this.clients.size,
      totalRooms: this.rooms.size,
      roomStats,
      timestamp: new Date().toISOString()
    };
  }

  getClientInfo(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return null;

    return {
      id: clientId,
      user: {
        id: client.user.id,
        username: client.user.username,
        role: client.user.role
      },
      subscribedRooms: Array.from(client.subscribedRooms),
      lastActivity: client.lastActivity,
      connectionState: client.ws.readyState
    };
  }

  // Graceful shutdown
  async close() {
    console.log('🔄 Shutting down WebSocket server...');
    
    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Close all client connections
    for (const [clientId, client] of this.clients) {
      this.sendToClient(clientId, {
        type: 'server_shutdown',
        message: 'Server is shutting down'
      });
      client.ws.close(1001, 'Server shutdown');
    }

    // Close the WebSocket server
    return new Promise((resolve) => {
      this.wss.close(() => {
        console.log('✅ WebSocket server closed');
        resolve();
      });
    });
  }
}