import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useCatalog } from '../context/CatalogContext';
import { uploadCatalogFile } from '../services/api';

function FileUpload() {
  const navigate = useNavigate();
  const { addCatalog, setLoading, loading } = useCatalog();
  const [uploadStatus, setUploadStatus] = useState({ open: false, message: '', severity: 'success' });

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setLoading(true);
    try {
      const result = await uploadCatalogFile(file);
      addCatalog(result.data);
      setUploadStatus({
        open: true,
        message: `Successfully uploaded and parsed ${file.name}`,
        severity: 'success',
      });

      // Add a 2-second delay before triggering backend version update
      setTimeout(async () => {
        try {
          await fetch('/api/update-latest-versions', { method: 'POST' });
        } catch (err) {
          // Log error but don't block navigation
          console.error('Version update failed:', err);
        }
        // Navigate to dashboard after update completes
        navigate('/');
      }, 2000);

    } catch (error) {
      setUploadStatus({
        open: true,
        message: `Failed to upload file: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleCloseSnackbar = () => {
    setUploadStatus({ ...uploadStatus, open: false });
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Upload Catalog File
      </Typography>
      
      <Card>
        <CardContent>
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragActive ? 'action.hover' : 'background.paper',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            <input {...getInputProps()} />
            
            {loading ? (
              <Box>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="body1">
                  Processing catalog file...
                </Typography>
              </Box>
            ) : (
              <Box>
                <CloudUploadIcon 
                  sx={{ 
                    fontSize: 64, 
                    color: 'primary.main', 
                    mb: 2 
                  }} 
                />
                <Typography variant="h6" gutterBottom>
                  {isDragActive
                    ? 'Drop the catalog file here'
                    : 'Drag & drop a catalog file here, or click to select'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Accepted file types: .txt (Max size: 10MB)
                </Typography>
                <Button variant="contained" component="span">
                  Select File
                </Button>
              </Box>
            )}
          </Box>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>How to generate a catalog file:</strong>
              <br />
              Please have your DBA run the SQL script from the following link as the User APPS in the Oracle Instance with the issue, and send the resulting file (m4aps_catalog.txt):
              <br />
              <br />
              <a 
                href="https://outgoing.more4apps.com/permanent/m4aps_catalog.sql" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#0041C8', fontWeight: '500' }}
              >
                https://outgoing.more4apps.com/permanent/m4aps_catalog.sql
              </a>
              <br />
              <br />
              Upload the generated m4aps_catalog.txt file here for analysis.
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      <Snackbar
        open={uploadStatus.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={uploadStatus.severity}
          sx={{ width: '100%' }}
        >
          {uploadStatus.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default FileUpload;