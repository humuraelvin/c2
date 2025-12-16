import React, { useState } from 'react';
import {
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  IconButton,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  Image as ImageIcon,
  VideoFile as VideoIcon,
  Description as DocumentIcon,
  Folder as FolderIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { File } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { fileAPI } from '../services/api';

const FileBrowser: React.FC = () => {
  const { files, selectedBot } = useAppContext();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  if (!selectedBot) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="100%"
      >
        <Typography variant="h6" color="text.secondary">
          Select a bot to view files
        </Typography>
      </Box>
    );
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'screenshot':
        return <ImageIcon sx={{ fontSize: 40, color: 'primary.main' }} />;
      case 'video':
        return <VideoIcon sx={{ fontSize: 40, color: 'secondary.main' }} />;
      case 'document':
        return <DocumentIcon sx={{ fontSize: 40, color: 'success.main' }} />;
      default:
        return <FolderIcon sx={{ fontSize: 40, color: 'text.secondary' }} />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleDownload = (file: File) => {
    const downloadUrl = fileAPI.downloadFile(file.filepath);
    window.open(downloadUrl, '_blank');
  };

  const handleView = (file: File) => {
    if (file.file_type === 'screenshot' || file.file_type === 'video') {
      setSelectedFile(file);
      setViewDialogOpen(true);
    } else {
      handleDownload(file);
    }
  };

  const handleCloseDialog = () => {
    setViewDialogOpen(false);
    setSelectedFile(null);
  };

  const renderFileContent = (file: File) => {
    const fileUrl = fileAPI.downloadFile(file.filepath);
    
    if (file.file_type === 'screenshot') {
      return (
        <img
          src={fileUrl}
          alt={file.filename}
          style={{ width: '100%', height: 'auto', maxHeight: '70vh', objectFit: 'contain' }}
        />
      );
    }
    
    if (file.file_type === 'video') {
      return (
        <video controls style={{ width: '100%', maxHeight: '70vh' }}>
          <source src={fileUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      );
    }
    
    return (
      <Box p={2}>
        <Typography>Preview not available for this file type.</Typography>
        <Button onClick={() => handleDownload(file)} startIcon={<DownloadIcon />}>
          Download File
        </Button>
      </Box>
    );
  };

  if (files.length === 0) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="100%"
        flexDirection="column"
        gap={2}
      >
        <ImageIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5 }} />
        <Typography variant="h6" color="text.secondary">
          No files captured yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Use the "screenshot" command to capture images
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Grid container spacing={2} p={2}>
        {files.map((file) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-4px)',
                  transition: 'all 0.2s ease-in-out',
                },
              }}
            >
              {/* File Preview */}
              <Box
                sx={{
                  height: 140,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'background.default',
                  position: 'relative',
                }}
              >
                {file.file_type === 'screenshot' ? (
                  <CardMedia
                    component="img"
                    height="140"
                    image={fileAPI.downloadFile(file.filepath)}
                    alt={file.filename}
                    sx={{ objectFit: 'cover' }}
                  />
                ) : (
                  getFileIcon(file.file_type)
                )}
                
                {/* Action Buttons Overlay */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    display: 'flex',
                    gap: 0.5,
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    '&:hover': { opacity: 1 },
                  }}
                >
                  <Tooltip title="View">
                    <IconButton
                      size="small"
                      onClick={() => handleView(file)}
                      sx={{ bgcolor: 'background.paper' }}
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download">
                    <IconButton
                      size="small"
                      onClick={() => handleDownload(file)}
                      sx={{ bgcolor: 'background.paper' }}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* File Info */}
              <CardContent sx={{ flexGrow: 1, p: 1.5 }}>
                <Typography
                  variant="subtitle2"
                  noWrap
                  title={file.filename}
                  sx={{ fontWeight: 'bold', mb: 0.5 }}
                >
                  {file.filename}
                </Typography>
                
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Chip
                    label={file.file_type}
                    size="small"
                    color={
                      file.file_type === 'screenshot' ? 'primary' :
                      file.file_type === 'video' ? 'secondary' :
                      file.file_type === 'document' ? 'success' : 'default'
                    }
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(file.size)}
                  </Typography>
                </Box>

                <Typography variant="caption" color="text.secondary">
                  {formatDate(file.uploaded_at)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
      >
        {selectedFile && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="h6">{selectedFile.filename}</Typography>
                <IconButton onClick={() => handleDownload(selectedFile)}>
                  <DownloadIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              {renderFileContent(selectedFile)}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

export default FileBrowser;