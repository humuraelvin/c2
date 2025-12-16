// Bot type definition
export interface Bot {
  id: string;
  name: string;
  os: string;
  username: string;
  hostname: string;
  ip_address: string;
  last_seen: string;
  is_online: boolean;
  created_at: string;
  tags: string[];
}

// Command type definition
export interface Command {
  id: string;
  bot_id: string;
  command: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result: string;
  created_at: string;
  completed_at: string | null;
}

// File type definition
export interface File {
  id: string;
  bot_id: string;
  filename: string;
  filepath: string;
  file_type: 'screenshot' | 'video' | 'document' | 'other';
  size: number;
  uploaded_at: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

// System stats
export interface SystemStats {
  total_bots: number;
  online_bots: number;
  total_commands: number;
  total_files: number;
  total_storage_mb: number;
}