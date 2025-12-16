import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Bot, Command, File } from '../types';
import { botAPI, commandAPI, fileAPI, webSocketService } from '../services/api';

interface AppContextType {
  bots: Bot[];
  selectedBot: Bot | null;
  commands: Command[];
  files: File[];
  loading: boolean;
  error: string | null;
  
  // Actions
  selectBot: (botId: string) => void;
  sendCommand: (command: string) => Promise<void>;
  refreshBots: () => Promise<void>;
  deleteBot: (botId: string) => Promise<void>;
  clearError: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [commands, setCommands] = useState<Command[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    refreshBots();
    
    // Connect WebSocket
    webSocketService.connect();
    
    // Set up WebSocket listeners
    webSocketService.on('bot_registered', (data) => {
      setBots(prev => [data.bot_data, ...prev]);
    });
    
    webSocketService.on('bot_online', (data) => {
      setBots(prev => prev.map(bot => 
        bot.id === data.bot_id ? { ...bot, is_online: true } : bot
      ));
    });
    
    webSocketService.on('bot_offline', (data) => {
      setBots(prev => prev.map(bot => 
        bot.id === data.bot_id ? { ...bot, is_online: false } : bot
      ));
    });
    
    webSocketService.on('command_result', (data) => {
      if (selectedBot && data.bot_id === selectedBot.id) {
        // Update commands list
        setCommands(prev => prev.map(cmd => 
          cmd.id === data.command_id 
            ? { ...cmd, status: data.status, result: data.result }
            : cmd
        ));
      }
    });
    
    webSocketService.on('file_uploaded', (data) => {
      if (selectedBot && data.bot_id === selectedBot.id) {
        const newFile = {
          id: data.file_id,
          bot_id: data.bot_id,
          filename: data.filename,
          filepath: data.filepath,
          file_type: data.file_type,
          size: data.size,
          uploaded_at: new Date().toISOString(),
        };
        setFiles(prev => [newFile, ...prev]);
      }
    });
    
    return () => {
      webSocketService.disconnect();
    };
  }, []);

  // Load bot details when selected
  useEffect(() => {
    if (selectedBot) {
      loadBotDetails(selectedBot.id);
    }
  }, [selectedBot]);

  const loadBotDetails = async (botId: string) => {
    try {
      setLoading(true);
      const data = await botAPI.getBotDetails(botId);
      setCommands(data.recent_commands);
      setFiles(data.files);
    } catch (err) {
      setError('Failed to load bot details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectBot = async (botId: string) => {
    const bot = bots.find(b => b.id === botId);
    if (bot) {
      setSelectedBot(bot);
    }
  };

  const sendCommand = async (command: string) => {
    if (!selectedBot) {
      setError('No bot selected');
      return;
    }

    try {
      setLoading(true);
      await commandAPI.sendCommand(selectedBot.id, command);
      
      // Add command to local state
      const newCommand: Command = {
        id: `temp_${Date.now()}`,
        bot_id: selectedBot.id,
        command,
        status: 'pending',
        result: '',
        created_at: new Date().toISOString(),
        completed_at: null,
      };
      setCommands(prev => [newCommand, ...prev]);
    } catch (err) {
      setError('Failed to send command');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const refreshBots = async () => {
    try {
      setLoading(true);
      const botsData = await botAPI.getAllBots();
      setBots(botsData);
    } catch (err) {
      setError('Failed to load bots');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteBot = async (botId: string) => {
    try {
      await botAPI.deleteBot(botId);
      setBots(prev => prev.filter(bot => bot.id !== botId));
      if (selectedBot && selectedBot.id === botId) {
        setSelectedBot(null);
        setCommands([]);
        setFiles([]);
      }
    } catch (err) {
      setError('Failed to delete bot');
      console.error(err);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AppContext.Provider value={{
      bots,
      selectedBot,
      commands,
      files,
      loading,
      error,
      selectBot,
      sendCommand,
      refreshBots,
      deleteBot,
      clearError,
    }}>
      {children}
    </AppContext.Provider>
  );
};