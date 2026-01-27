import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

function VersionImporter({ open, onClose, onUpdateComplete }) {
  const [versionData, setVersionData] = useState('');
  const [format, setFormat] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [previewVersions, setPreviewVersions] = useState(null);
  const [showBrowserScript, setShowBrowserScript] = useState(false);
  const [browserScript, setBrowserScript] = useState('');

  const handlePreview = async () => {
    if (!versionData.trim()) {
      setResult({ error: 'Please paste some version data first' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/parse-versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: versionData,
          format: format,
          preview: true
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setPreviewVersions(data.versions);
        setResult({ success: true, message: `Found ${Object.keys(data.versions).length} wizard versions` });
      } else {
        setResult({ error: data.error || 'Failed to parse version data' });
        setPreviewVersions(null);
      }
    } catch (error) {
      setResult({ error: 'Network error: ' + error.message });
      setPreviewVersions(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTestParser = async () => {
    if (!versionData.trim()) {
      setResult({ error: 'Please paste some version data first' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/test-parser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: versionData
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult({ 
          success: true, 
          message: `Parser test successful! Found ${data.parsedCount} versions`,
          details: `Sample entries: ${data.sampleEntries.map(e => e.wizard).join(', ')}`
        });
        setPreviewVersions(data.parsedVersions);
      } else {
        setResult({ error: data.error || 'Parser test failed', details: data.details });
      }
    } catch (error) {
      setResult({ error: 'Test failed: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!versionData.trim()) {
      setResult({ error: 'Please paste some version data first' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/update-versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: versionData,
          format: format
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult({ 
          success: true, 
          message: data.message,
          updatedWizards: data.updatedWizards,
          totalUpdated: data.totalUpdated 
        });
        
        // Notify parent component
        if (onUpdateComplete) {
          onUpdateComplete(data);
        }
      } else {
        setResult({ 
          error: data.error || 'Failed to update versions',
          details: data.details,
          invalidVersions: data.invalidVersions
        });
      }
    } catch (error) {
      setResult({ error: 'Network error: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setVersionData('');
    setFormat('auto');
    setResult(null);
    setPreviewVersions(null);
    setShowBrowserScript(false);
    setBrowserScript('');
    onClose();
  };

  const handleGetBrowserScript = async () => {
    try {
      const response = await fetch('/api/browser-script');
      const data = await response.json();
      
      if (data.success) {
        setBrowserScript(data.script);
        setShowBrowserScript(true);
      } else {
        setResult({ error: 'Failed to get browser script' });
      }
    } catch (error) {
      setResult({ error: 'Network error: ' + error.message });
    }
  };

  const copyBrowserScript = () => {
    navigator.clipboard.writeText(browserScript).then(() => {
      setResult({ success: true, message: 'Browser script copied to clipboard!' });
    });
  };

  const exampleFormats = {
    text: `Asset Wizard: 3.4.16
Budget Wizard: 4.1.5
Employee Expense Wizard: 5.2.1`,
    csv: `Wizard Name,Version,Release Date
Asset Wizard,3.4.16,2024-10-15
Budget Wizard,4.1.5,2024-10-10
Employee Expense Wizard,5.2.1,2024-10-05`,
    json: `{
  "Asset Wizard": {
    "version": "3.4.16",
    "releaseDate": "2024-10-15"
  },
  "Budget Wizard": {
    "version": "4.1.5",
    "releaseDate": "2024-10-10"
  }
}`
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Import Version Data from More4apps Community
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Copy and paste version data from the More4apps community downloads page. 
          The system will automatically detect the format and parse the wizard versions.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Data Format</InputLabel>
            <Select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              label="Data Format"
            >
              <MenuItem value="auto">Auto-detect</MenuItem>
              <MenuItem value="text">Plain Text</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="json">JSON</MenuItem>
              <MenuItem value="html">HTML Table</MenuItem>
            </Select>
          </FormControl>

          <TextField
            multiline
            rows={12}
            fullWidth
            label="Paste version data here"
            value={versionData}
            onChange={(e) => setVersionData(e.target.value)}
            placeholder={`Paste your version data here. Supported formats:

Text format:
${exampleFormats.text}

CSV format:
${exampleFormats.csv}

JSON format:
${exampleFormats.json}

Or copy directly from the More4apps community HTML table.`}
            variant="outlined"
          />
        </Box>

        {result && (
          <Alert 
            severity={result.error ? 'error' : 'success'} 
            sx={{ mb: 2 }}
            icon={result.error ? <WarningIcon /> : <CheckCircleIcon />}
          >
            <Typography variant="body2">
              {result.error || result.message}
            </Typography>
            {result.details && (
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                Details: {result.details}
              </Typography>
            )}
            {result.invalidVersions && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption">Invalid versions found:</Typography>
                {result.invalidVersions.map((version, index) => (
                  <Chip key={index} label={version} size="small" color="error" sx={{ m: 0.5 }} />
                ))}
              </Box>
            )}
            {result.updatedWizards && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption">Updated wizards ({result.totalUpdated}):</Typography>
                {result.updatedWizards.slice(0, 10).map((wizard, index) => (
                  <Chip key={index} label={wizard} size="small" color="success" sx={{ m: 0.5 }} />
                ))}
                {result.updatedWizards.length > 10 && (
                  <Chip label={`+${result.updatedWizards.length - 10} more`} size="small" sx={{ m: 0.5 }} />
                )}
              </Box>
            )}
          </Alert>
        )}

        {previewVersions && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Preview: Found {Object.keys(previewVersions).length} Wizards
            </Typography>
            <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 1, p: 1 }}>
              {Object.keys(previewVersions).map((wizardName, index) => (
                <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="body2">{wizardName}</Typography>
                  <Typography variant="body2" color="primary">
                    {previewVersions[wizardName].header}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Alternative: Auto-Extract from Browser
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Can't copy the data easily? Use our browser script to automatically extract version information.
          </Typography>
          <Button 
            variant="outlined" 
            onClick={handleGetBrowserScript}
            sx={{ mb: 2 }}
          >
            Get Browser Script
          </Button>
          
          {showBrowserScript && (
            <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2, bgcolor: '#f8f9fa' }}>
              <Typography variant="subtitle2" gutterBottom>
                Instructions:
              </Typography>
              <Typography variant="body2" component="ol" sx={{ pl: 2, mb: 2 }}>
                <li>Go to the More4apps community downloads page</li>
                <li>Press F12 to open developer tools</li>
                <li>Click the "Console" tab</li>
                <li>Copy and paste this script:</li>
              </Typography>
              
              <TextField
                multiline
                rows={8}
                fullWidth
                value={browserScript}
                variant="outlined"
                size="small"
                InputProps={{
                  readOnly: true,
                  style: { fontFamily: 'monospace', fontSize: '0.8rem' }
                }}
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" onClick={copyBrowserScript}>
                  Copy Script
                </Button>
                <Button size="small" onClick={() => setShowBrowserScript(false)}>
                  Hide
                </Button>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                💡 After running the script, the version data will be copied to your clipboard. 
                Paste it into the text area above and click Import.
              </Typography>
            </Box>
          )}
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="caption" color="text.secondary">
          💡 Tip: You can copy data directly from the More4apps community downloads table, 
          or export it as CSV/JSON from your browser's developer tools.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button 
          onClick={handlePreview}
          disabled={loading || !versionData.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
        >
          Preview
        </Button>
        <Button 
          onClick={handleTestParser}
          disabled={loading || !versionData.trim()}
          variant="outlined"
          color="secondary"
        >
          Debug Parser
        </Button>
        <Button 
          onClick={handleImport}
          disabled={loading || !versionData.trim()}
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <UploadIcon />}
        >
          Import Versions
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default VersionImporter;