import React, { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Chip,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Close as CloseIcon
} from '@mui/icons-material';

function ManualVersionEditor({ open, onClose, onUpdateComplete }) {
  const [versions, setVersions] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedWizard, setExpandedWizard] = useState(false);

  // Load current version data when component opens
  useEffect(() => {
    if (open) {
      loadCurrentVersions();
    }
  }, [open]);

  const loadCurrentVersions = async () => {
    try {
      // Load current versions from backend
      const response = await fetch('http://localhost:5000/api/get-current-versions');
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || {});
      } else {
        // Fallback to hardcoded versions if endpoint doesn't exist
        const fallbackVersions = {
          'Agreement & Funding Wizard': {
            header: 'Not required',
            body: 'Not required',
            releaseDate: '10-Sep-2025'
          },
          'AP Invoice Wizard': {
            header: '3.1.0',
            body: '3.7.0',
            releaseDate: '07-Apr-2025'
          },
          'AR Invoice Wizard': {
            header: '1.1.3',
            body: '1.2.4',
            releaseDate: '09-Sep-2025'
          },
          'Asset Wizard': {
            header: '2.0.9',
            body: '2.0.8',
            releaseDate: '12-Sep-2025'
          },
          'Item Cost Wizard': {
            header: '2.0.00',
            body: '1.05.11',
            releaseDate: '15-Apr-2025'
          },
          'Item Wizard': {
            header: '1.2.6',
            body: '1.3.17',
            releaseDate: '09-Sep-2025'
          },
          'Material Transaction Wizard': {
            header: '1.2.03',
            body: '2.4.08',
            releaseDate: '10-Sep-2025'
          },
          'PO Wizard': {
            header: '2.0.00',
            body: '2.0.01',
            releaseDate: '09-Sep-2025'
          },
          'Project Wizard': {
            header: '1.2.0',
            body: '1.4.0',
            releaseDate: '17-Apr-2025'
          },
          'Supplier Wizard': {
            header: '2.1.03',
            body: '2.1.46',
            releaseDate: '02-May-2025'
          }
        };
        setVersions(fallbackVersions);
      }
    } catch (error) {
      console.error('Error loading current versions:', error);
      setResult({ error: 'Failed to load current version data' });
    }
  };

  const handleVersionChange = (wizardName, field, value) => {
    setVersions(prev => ({
      ...prev,
      [wizardName]: {
        ...prev[wizardName],
        [field]: value
      }
    }));
  };

  const handleSaveVersions = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Send the updates directly to the backend (bypass proxy issues)
      const response = await fetch('http://localhost:5000/api/manual-update-versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ versions }),
      });

      if (response.ok) {
        const result = await response.json();
        setResult({ 
          success: true, 
          message: 'Version information updated successfully!',
          updated: Object.keys(versions).length
        });
        if (onUpdateComplete) {
          onUpdateComplete(result);
        }
      } else {
        throw new Error('Failed to update versions');
      }
    } catch (error) {
      console.error('Error updating versions:', error);
      setResult({ 
        error: 'Failed to update version information. Changes saved locally only.',
        details: error.message 
      });
    }

    setLoading(false);
  };

  const filteredWizards = Object.keys(versions).filter(wizardName =>
    wizardName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClose = () => {
    setVersions({});
    setResult(null);
    setSearchTerm('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh', maxHeight: '90vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Manual Version Editor</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 1 }}>
        <Box sx={{ p: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Manually edit the latest version information for More4Apps wizards. This will update the comparison baseline used in recommendations.
          </Typography>

          {/* Search Filter */}
          <TextField
            fullWidth
            label="Search Wizards"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mb: 1.5 }}
            placeholder="Type to filter wizards..."
            size="small"
          />

          {/* Results */}
          {result && (
            <Alert 
              severity={result.error ? 'error' : 'success'} 
              sx={{ mb: 1.5 }}
              onClose={() => setResult(null)}
            >
              <Typography variant="body2">
                {result.message || result.error}
              </Typography>
              {result.updated && (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  Updated {result.updated} wizard(s)
                </Typography>
              )}
            </Alert>
          )}

          {/* Version Edit Forms */}
          <Box sx={{ maxHeight: 'calc(80vh - 200px)', overflowY: 'auto' }}>
            {filteredWizards.map((wizardName, index) => (
              <Accordion 
                key={wizardName}
                expanded={expandedWizard === wizardName}
                onChange={(event, isExpanded) => setExpandedWizard(isExpanded ? wizardName : false)}
                sx={{ mb: 0.5 }}
              >
                <AccordionSummary 
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ 
                    minHeight: 40,
                    '&.Mui-expanded': { minHeight: 40 },
                    '& .MuiAccordionSummary-content': { 
                      my: 0.5,
                      '&.Mui-expanded': { my: 0.5 }
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>{wizardName}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mr: 1 }}>
                      <Chip 
                        label={`H: ${versions[wizardName]?.header || 'N/A'}`} 
                        size="small" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 22 }}
                      />
                      <Chip 
                        label={`B: ${versions[wizardName]?.body || 'N/A'}`} 
                        size="small" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 22 }}
                      />
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0.5, pb: 1, px: 2 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Header Version"
                        value={versions[wizardName]?.header || ''}
                        onChange={(e) => handleVersionChange(wizardName, 'header', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Body Version"
                        value={versions[wizardName]?.body || ''}
                        onChange={(e) => handleVersionChange(wizardName, 'body', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Release Date"
                        value={versions[wizardName]?.releaseDate || ''}
                        onChange={(e) => handleVersionChange(wizardName, 'releaseDate', e.target.value)}
                        size="small"
                        placeholder="DD-MMM-YYYY"
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>

          {filteredWizards.length === 0 && searchTerm && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No wizards found matching "{searchTerm}"
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 1.5, gap: 1 }}>
        <Button onClick={handleClose} size="small">
          Cancel
        </Button>
        <Button
          onClick={loadCurrentVersions}
          startIcon={<RefreshIcon />}
          disabled={loading}
          size="small"
        >
          Reset
        </Button>
        <Button
          onClick={handleSaveVersions}
          startIcon={<SaveIcon />}
          variant="contained"
          disabled={loading}
          size="small"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ManualVersionEditor;