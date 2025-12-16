import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Send as SendIcon,
  Code as CodeIcon,
  Image as ImageIcon,
  Videocam as VideoIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { Command } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { fileAPI } from '../services/api';

const ChatInterface: React.FC = () => {
  const [message, setMessage] = useState('');
  const [suggestedCommands, setSuggestedCommands] = useState<string[]>([
    'screenshot',
    'sysinfo',
    'whoami',
    'ls',
    'pwd',
    'shell dir',
    'shell ipconfig',
  ]);
  const { selectedBot, commands, sendCommand, loading } = useAppContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [commands]);

  const handleSendMessage = async () => {
    if (message.trim() && selectedBot) {
      await sendCommand(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCommandClick = (cmd: string) => {
    setMessage(cmd);
  };

  const renderCommandResult = (result: string) => {
    try {
      const parsed = JSON.parse(result);
      if (parsed.output) {
        return parsed.output;
      }
      if (parsed.error) {
        return `Error: ${parsed.error}`;
      }
      return result;
    } catch {
      return result;
    }
  };

  const getCommandIcon = (command: string) => {
    if (command.startsWith('screenshot')) return <ImageIcon fontSize="small" />;
    if (command.startsWith('shell')) return <CodeIcon fontSize="small" />;
    return <CodeIcon fontSize="small" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'executing': return 'warning';
      default: return 'default';
    }
  };

  if (!selectedBot) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="100%"
      >
        <Typography variant="h6" color="text.secondary">
          Select a bot to start chatting
        </Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" height="100%">
      {/* Header */}
      <Paper
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        <Typography variant="h6">
          {selectedBot.name} ({selectedBot.username})
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {selectedBot.ip_address} • {selectedBot.os}
        </Typography>
      </Paper>

      {/* Chat Messages */}
      <Box flex={1} overflow="auto" p={2}>
        {commands.length === 0 ? (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            height="100%"
          >
            <Typography color="text.secondary">
              No commands yet. Send your first command!
            </Typography>
          </Box>
        ) : (
          <List>
            {commands.map((cmd) => (
              <React.Fragment key={cmd.id}>
                <ListItem alignItems="flex-start" sx={{ py: 1 }}>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        {getCommandIcon(cmd.command)}
                        <Typography variant="subtitle2" fontWeight="bold">
                          Command:
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            bgcolor: 'action.hover',
                            p: 0.5,
                            borderRadius: 0.5,
                          }}
                        >
                          {cmd.command}
                        </Typography>
                        <Chip
                          label={cmd.status}
                          size="small"
                          color={getStatusColor(cmd.status) as any}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(cmd.created_at).toLocaleTimeString()}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      cmd.result && (
                        <Box
                          sx={{
                            mt: 1,
                            p: 1,
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            border: 1,
                            borderColor: 'divider',
                          }}
                        >
                          <Typography
                            variant="body2"
                            component="pre"
                            sx={{
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              fontFamily: 'monospace',
                              fontSize: '0.875rem',
                              m: 0,
                            }}
                          >
                            {renderCommandResult(cmd.result)}
                          </Typography>
                        </Box>
                      )
                    }
                  />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Suggested Commands */}
      <Box p={2} borderTop={1} borderColor="divider">
        <Typography variant="caption" color="text.secondary" gutterBottom>
          Suggested commands:
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
          {suggestedCommands.map((cmd) => (
            <Chip
              key={cmd}
              label={cmd}
              size="small"
              onClick={() => handleCommandClick(cmd)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>

        {/* Input Area */}
        <Box display="flex" gap={1}>
          <TextField
            fullWidth
            multiline
            maxRows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a command (e.g., screenshot, shell dir, sysinfo)..."
            disabled={loading}
            variant="outlined"
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!message.trim() || loading || !selectedBot}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          >
            Send
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatInterface;