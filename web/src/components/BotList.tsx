import React from 'react';
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  IconButton,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import {
  Computer as ComputerIcon,
  Delete as DeleteIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { Bot } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface BotListProps {
  bots: Bot[];
}

const BotList: React.FC<BotListProps> = ({ bots }) => {
  const { selectBot, deleteBot, selectedBot } = useAppContext();

  const getOSIcon = (os: string) => {
    if (os.toLowerCase().includes('win')) return '💻';
    if (os.toLowerCase().includes('linux')) return '🐧';
    if (os.toLowerCase().includes('mac')) return '🍎';
    return '🖥️';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
      {bots.map((bot) => (
        <React.Fragment key={bot.id}>
          <ListItem
            alignItems="flex-start"
            sx={{
              bgcolor: selectedBot?.id === bot.id ? 'action.selected' : 'transparent',
              '&:hover': { bgcolor: 'action.hover' },
              cursor: 'pointer',
            }}
            onClick={() => selectBot(bot.id)}
            secondaryAction={
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete bot ${bot.name}?`)) {
                    deleteBot(bot.id);
                  }
                }}
              >
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: bot.is_online ? 'success.main' : 'error.main' }}>
                <ComputerIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {bot.name}
                  </Typography>
                  <Chip
                    icon={
                      <CircleIcon
                        sx={{
                          fontSize: '0.75rem',
                          color: bot.is_online ? 'success.main' : 'error.main',
                        }}
                      />
                    }
                    label={bot.is_online ? 'Online' : 'Offline'}
                    size="small"
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {getOSIcon(bot.os)}
                  </Typography>
                </Box>
              }
              secondary={
                <React.Fragment>
                  <Typography component="span" variant="body2" color="text.primary">
                    {bot.username}@{bot.hostname}
                  </Typography>
                  <br />
                  <Typography component="span" variant="caption" color="text.secondary">
                    {bot.ip_address} • {formatDate(bot.last_seen)}
                  </Typography>
                </React.Fragment>
              }
            />
          </ListItem>
          <Divider variant="inset" component="li" />
        </React.Fragment>
      ))}
    </List>
  );
};

export default BotList;