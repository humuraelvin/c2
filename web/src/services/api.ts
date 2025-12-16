import axios from 'axios';
import { Bot, Command, File, SystemStats } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Bot API calls
export const botAPI = {
  // Get all bots
  getAllBots: async (): Promise<Bot[]> => {
    const response = await api.get('/api/bots');
    return response.data.bots;
  },

  // Get bot details
  getBotDetails: async (botId: string): Promise<{
    bot: Bot;
    recent_commands: Command[];
    files: File[];
  }> => {
    const response = await api.get(`/api/bot/${botId}`);
    return response.data;
  },

  // Delete bot
  deleteBot: async (botId: string): Promise<void> => {
    await api.delete(`/api/bot/${botId}`);
  },
};

// Command API calls
export const commandAPI = {
  // Send command to bot
  sendCommand: async (botId: string, command: string): Promise<{ command_id: string }> => {
    const response = await api.post('/api/command', {
      bot_id: botId,
      command: command,
    });
    return response.data;
  },

  // Get bot commands
  getBotCommands: async (botId: string, limit: number = 50): Promise<Command[]> => {
    const response = await api.get(`/api/commands/${botId}`, {
      params: { limit },
    });
    return response.data.commands;
  },
};

// File API calls
export const fileAPI = {
  // Get bot files
  getBotFiles: async (botId: string): Promise<File[]> => {
    const response = await api.get(`/api/files/${botId}`);
    return response.data.files;
  },

  // Download file
  downloadFile: (filepath: string): string => {
    return `${API_BASE_URL}${filepath}`;
  },
};

// System API calls
export const systemAPI = {
  // Get system stats
  getStats: async (): Promise<SystemStats> => {
    const response = await api.get('/api/stats');
    return response.data;
  },

  // Health check
  healthCheck: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await api.get('/health');
    return response.data;
  },
};

// WebSocket service
export class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();

  connect(): void {
    const wsUrl = API_BASE_URL.replace('http', 'ws') + '/ws/dashboard';
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.emit('connected', null);
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type, data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.emit('disconnected', null);
      // Attempt to reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => callback(data));
    }
  }
}

export const webSocketService = new WebSocketService();