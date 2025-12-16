import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Computer as ComputerIcon,
  Chat as ChatIcon,
  Folder as FolderIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useAppContext } from '../contexts/AppContext';
import BotList from '../components/BotList';
import ChatInterface from '../components/ChatInterface';
import FileBrowser from '../components/FileBrowser';
import SystemStats from '../components/SystemStats';

const drawerWidth = 320;

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  const { bots, selectedBot, refreshBots, loading } = useAppContext();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Connected Bots
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {bots.length} bot{bots.length !== 1 ? 's' : ''} • {bots.filter(b => b.is_online).length} online
        </Typography>
      </Box>

      {/* Bot List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <BotList bots={bots} />
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          Educational Cybersecurity Lab
        </Typography>
      </Box>
    </Box>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <ChatInterface />;
      case 1:
        return <FileBrowser />;
      case 2:
        return <SystemStats />;
      default:
        return <ChatInterface />;
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {selectedBot ? `Controlling: ${selectedBot.name}` : 'C2 Control Panel'}
          </Typography>
          <Typography variant="caption" sx={{ mr: 2 }}>
            {loading ? 'Updating...' : 'Ready'}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            open
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          pt: '64px', // AppBar height
        }}
      >
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="dashboard tabs">
            <Tab 
              icon={<ChatIcon />} 
              label="Command Chat" 
              iconPosition="start"
              sx={{ minHeight: 60 }}
            />
            <Tab 
              icon={<FolderIcon />} 
              label="File Browser" 
              iconPosition="start"
              sx={{ minHeight: 60 }}
            />
            <Tab 
              icon={<DashboardIcon />} 
              label="System Stats" 
              iconPosition="start"
              sx={{ minHeight: 60 }}
            />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ flex: 1, overflow: 'auto', borderRadius: 2 }}>
          {renderTabContent()}
        </Box>

        {/* Bottom Status Bar */}
        <Box
          sx={{
            mt: 2,
            p: 1,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Educational Use Only • C2 Control Panel v1.0
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Total Bots: {bots.length} | Online: {bots.filter(b => b.is_online).length}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;