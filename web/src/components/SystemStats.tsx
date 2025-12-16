import React, { useState, useEffect } from 'react';
import {
  Paper,
  Grid,
  Typography,
  Box,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Computer as ComputerIcon,
  Storage as StorageIcon,
  Terminal as TerminalIcon,
  Folder as FolderIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { SystemStats } from '../types';
import { systemAPI } from '../services/api';

const SystemStats: React.FC = () => {
  const [stats, setStats] = useState<SystemStats>({
    total_bots: 0,
    online_bots: 0,
    total_commands: 0,
    total_files: 0,
    total_storage_mb: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await systemAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    {
      title: 'Total Bots',
      value: stats.total_bots,
      icon: <ComputerIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      color: 'primary',
      progress: stats.total_bots > 0 ? (stats.online_bots / stats.total_bots) * 100 : 0,
      subtitle: `${stats.online_bots} online`,
    },
    {
      title: 'Commands Executed',
      value: stats.total_commands,
      icon: <TerminalIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
      color: 'secondary',
      subtitle: 'Total commands',
    },
    {
      title: 'Files Captured',
      value: stats.total_files,
      icon: <FolderIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      color: 'success',
      subtitle: 'Screenshots & files',
    },
    {
      title: 'Storage Used',
      value: `${stats.total_storage_mb.toFixed(1)} MB`,
      icon: <StorageIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
      color: 'warning',
      progress: Math.min(stats.total_storage_mb / 100, 100), // Assuming 100MB max for demo
      subtitle: 'Total storage',
    },
  ];

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h6" fontWeight="bold">
          System Statistics
        </Typography>
        <Tooltip title="Refresh stats">
          <IconButton onClick={fetchStats} disabled={loading} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {card.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.title}
                  </Typography>
                  {card.subtitle && (
                    <Typography variant="caption" color="text.secondary">
                      {card.subtitle}
                    </Typography>
                  )}
                </Box>
                {card.icon}
              </Box>
              
              {card.progress !== undefined && (
                <Box mt={2}>
                  <LinearProgress
                    variant="determinate"
                    value={card.progress}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: `${card.color}.light`,
                      '& .MuiLinearProgress-bar': {
                        bgcolor: `${card.color}.main`,
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {card.progress.toFixed(1)}%
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Status Indicators */}
      <Box mt={3} display="flex" gap={1} flexWrap="wrap">
        <Chip
          icon={<ComputerIcon />}
          label={`${stats.online_bots} Online`}
          color="success"
          variant="outlined"
        />
        <Chip
          icon={<ComputerIcon />}
          label={`${stats.total_bots - stats.online_bots} Offline`}
          color="error"
          variant="outlined"
        />
        <Chip
          icon={<TerminalIcon />}
          label={`${stats.total_commands} Commands`}
          color="info"
          variant="outlined"
        />
        <Chip
          icon={<FolderIcon />}
          label={`${stats.total_files} Files`}
          color="warning"
          variant="outlined"
        />
      </Box>
    </Paper>
  );
};

export default SystemStats;