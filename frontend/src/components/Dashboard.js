import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  TextField,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon,
  ContentCopy as ContentCopyIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { useCatalog } from '../context/CatalogContext';
import { refreshCatalogAnalysis, getCatalogById } from '../services/api';
import ManualVersionEditor from './ManualVersionEditor';
import VersionUpdater from './VersionUpdater';
import moment from 'moment';
import { clients } from '../data/clients';

// ...existing code...
const COLORS = ['#0041C8', '#63666A', '#4F7FEA', '#8E9196', '#002A7A'];

function Dashboard() {
  // Collapsible state for Client License Lookup
  const [licenseLookupOpen, setLicenseLookupOpen] = useState(true);
  // Client search and license fetch state
  const [clientSearch, setClientSearch] = useState('');
  const [filteredClients, setFilteredClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [licenseError, setLicenseError] = useState(null);

  // Filter clients by search
  React.useEffect(() => {
    const normalizedSearch = clientSearch.toLowerCase().trim();

    if (normalizedSearch === '') {
      setFilteredClients([]);
      return;
    }

    const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedSearch = escapeRegExp(normalizedSearch);
    const phrasePattern = escapedSearch.replace(/\s+/g, '\\s+');
    const nameRegex = new RegExp(`\\b${phrasePattern}\\b`, 'i');

    setFilteredClients(
      clients.filter(c => {
        const normalizedCode = c.code.toLowerCase();

        return (
          nameRegex.test(c.name) ||
          normalizedCode.includes(normalizedSearch)
        );
      })
    );
  }, [clientSearch]);

  // Fetch license info for selected client via backend proxy
  const fetchLicenseInfo = async (client) => {
    setLicenseLoading(true);
    setLicenseError(null);
    setLicenseInfo(null);
    try {
      const url = `/api/client-license/${client.code}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch license info');
      const json = await response.json();
      setLicenseInfo(json);
    } catch (err) {
      setLicenseError(err.message);
    } finally {
      setLicenseLoading(false);
    }
  };
  // State for update script feedback
  const [updateScriptLoading, setUpdateScriptLoading] = useState(false);
  const [updateScriptResult, setUpdateScriptResult] = useState(null);
  const { catalogs, selectedCatalog, updateCatalog, setLoading, setError } = useCatalog();
  const [versionEditorOpen, setVersionEditorOpen] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [expandedWizards, setExpandedWizards] = useState({});
  const [expandedLicenses, setExpandedLicenses] = useState({});
  // Auto-import modal state
  const [autoImportOpen, setAutoImportOpen] = useState(false);
  const [autoImportLoading, setAutoImportLoading] = useState(false);
  const [autoImportError, setAutoImportError] = useState(null);
  const [autoImportVersions, setAutoImportVersions] = useState(null);
  // Fetch version data from More4apps JSON endpoint
  const handleAutoImport = async () => {
    setAutoImportLoading(true);
    setAutoImportError(null);
    setAutoImportVersions(null);
    try {
      const response = await fetch('/api/more4apps-versions');
      if (!response.ok) throw new Error('Failed to fetch version data');
      const json = await response.json();
      // Parse items for wizard version info
      const versions = {};
      if (json.items && Array.isArray(json.items)) {
        json.items.forEach(item => {
          if (item.name && item.tag_template) {
            versions[item.name] = {
              code: item.code || '',
              version: item.tag_template,
              minPkgVersion: item.min_pkg_version || '',
              releaseDate: item.release_date || ''
            };
          }
        });
      }
      setAutoImportVersions(versions);
    } catch (err) {
      setAutoImportError(err.message);
    } finally {
      setAutoImportLoading(false);
    }
  };

  // Toggle wizard expansion
  const toggleWizardExpanded = (wizardCode) => {
    setExpandedWizards(prev => ({
      ...prev,
      [wizardCode]: !prev[wizardCode]
    }));
  };

  // Toggle license expansion
  const toggleLicenseExpanded = (licenseCode) => {
    setExpandedLicenses(prev => ({
      ...prev,
      [licenseCode]: !prev[licenseCode]
    }));
  };

  // Handle version updates from the VersionUpdater component
  const handleVersionsUpdated = (result) => {
    console.log('Versions updated:', result);
    // Optionally trigger a refresh of the analysis
    if (latestCatalog?.id) {
      handleRefreshAnalysis();
    }
  };

  // Refresh analysis function
  
        // Function to trigger backend update of latest versions
        const handleUpdateLatestVersions = async () => {
          setUpdateScriptLoading(true);
          setUpdateScriptResult(null);
          try {
            const response = await fetch('/api/update-latest-versions', { method: 'POST' });
            const result = await response.json();
            setUpdateScriptResult(result);
          } catch (err) {
            setUpdateScriptResult({ success: false, message: err.message });
          } finally {
            setUpdateScriptLoading(false);
          }
        };
  const handleRefreshAnalysis = async () => {
    if (!latestCatalog?.id) return;
    
    setRefreshing(true);
    setError(null);
    try {
      // Refresh the analysis on the server
      await refreshCatalogAnalysis(latestCatalog?.id);
      
      // Get the updated catalog data
      const updatedCatalogResponse = await getCatalogById(latestCatalog?.id);
      const updatedCatalog = updatedCatalogResponse.data;
      
      // Update the catalog in the context state
      updateCatalog(updatedCatalog);
      
      console.log('Analysis refreshed successfully');
    } catch (error) {
      console.error('Error refreshing analysis:', error);
      setError('Failed to refresh analysis: ' + error.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Wizard name mapping function - matches backend productMapping.js
  const getWizardName = (wizardCode) => {
    const wizardMap = {
      // Based on 7-Eleven catalog wizard codes and package names
      "AIW": "Application Interface Wizard",
      "AW": "Asset Wizard", 
      "BW": "Budget Wizard",
      "EEW": "Employee Expense Wizard",
      "EMW": "Employee Wizard",
      "IW": "Item Wizard",
      "PIW": "Payables Invoice Wizard", 
      "PLW": "Price List Wizard",
      "POW": "Purchase Order Wizard",
      "PW": "Project Wizard",
      "RIW": "Receivables Invoice Wizard",
      "SIW": "Special Information Wizard",
      "SW": "Supplier Wizard",
      
      // Additional common More4apps wizards
      "ICW": "Item Cost Wizard",
      "PMW": "Pricing Modifiers Wizard",
      "TW": "Project Transaction Wizard",
      "EO": "Excel-Out",
      "AFW": "Agreement & Funding Wizard",
      "CW": "Customer Wizard",
      "ARW": "AR Receipt Wizard",
      "RTW": "Routing Wizard",
      "SOW": "Sales Order Wizard",
      "BMW": "Bill of Materials Wizard",
      "EW": "Event Wizard",
      "MTW": "Material Transaction Wizard",
      "PRW": "PO Receiving Wizard",
      "GLW": "GL Wizard",
      "RW": "Requisition Wizard",
      "SCW": "Sourcing Wizard"
    };
    return wizardMap[wizardCode] || wizardCode;
  };

  // License name mapping function
  const getLicenseName = (licenseCode) => {
    const licenseMap = {
      "AIW": "Application Interface Wizard",
      "AW": "Asset Wizard", 
      "BW": "Budget Wizard",
      "EEW": "Employee Expense Wizard",
      "EMW": "Employee Wizard",
      "IW": "Item Wizard",
      "PIW": "Payables Invoice Wizard", 
      "PLW": "Price List Wizard",
      "POW": "Purchase Order Wizard",
      "PW": "Project Wizard",
      "RIW": "Receivables Invoice Wizard",
      "SIW": "Special Information Wizard",
      "SW": "Supplier Wizard",
      "ICW": "Item Cost Wizard",
      "PMW": "Pricing Modifiers Wizard",
      "TW": "Project Transaction Wizard",
      "EO": "Excel-Out",
      "AFW": "Agreement & Funding Wizard",
      "CW": "Customer Wizard",
      "ARW": "AR Receipt Wizard",
      "RTW": "Routing Wizard",
      "SOW": "Sales Order Wizard",
      "BMW": "Bill of Materials Wizard",
      "EW": "Event Wizard",
      "MTW": "Material Transaction Wizard",
      "PRW": "PO Receiving Wizard",
      "GLW": "GL Wizard",
      "RW": "Requisition Wizard",
      "SCW": "Sourcing Wizard"
    };
    return licenseMap[licenseCode] || licenseCode;
  };

  const getWizardDisplayName = (wizardVersion) => {
    const wizardCode = wizardVersion.split(' ')[0];
    const wizardName = getWizardName(wizardCode);
    return `${wizardName} (${wizardCode})`;
  };

  // Helper function to filter connections from the past 6 months
  const getRecentConnections = (connections) => {
    if (!connections) return [];
    
    const sixMonthsAgo = moment().subtract(6, 'months');
    console.log('Six months ago:', sixMonthsAgo.format('DD-MMM-YY'));
    
    return connections.filter(connection => {
      if (!connection.connectionDate) return false;
      
      // Handle the format from catalog: "17-Jul-25 21:08" or "DD-MMM-YY HH:MM"
      let connectionDate;
      
      // Parse the exact format from the catalog file: DD-MMM-YY HH:mm
      connectionDate = moment(connection.connectionDate, 'DD-MMM-YY HH:mm');
      
      // If that fails, try without time
      if (!connectionDate.isValid()) {
        connectionDate = moment(connection.connectionDate, 'DD-MMM-YY');
      }
      
      // If still invalid, try other formats
      if (!connectionDate.isValid()) {
        connectionDate = moment(connection.connectionDate, [
          'DD-MON-YY', 
          'DD-MON-YYYY', 
          'YYYY-MM-DD', 
          'DD-MMM-YYYY HH:mm',
          'DD-MMM-YYYY'
        ]);
      }
      
      const isValid = connectionDate.isValid();
      const isRecent = isValid && connectionDate.isAfter(sixMonthsAgo);
      
      // Debug logging for first few connections
      if (connections.indexOf(connection) < 3) {
        console.log(`Connection ${connections.indexOf(connection)}:`, {
          originalDate: connection.connectionDate,
          parsedDate: connectionDate.format('DD-MMM-YY HH:mm'),
          isValid,
          isRecent,
          sixMonthsAgo: sixMonthsAgo.format('DD-MMM-YY')
        });
      }
      
      return isRecent;
    });
  };

  // Helper function to group connections by wizard and version
  const groupConnectionsByWizardAndVersion = (connections) => {
    const grouped = {};
    
    connections.forEach(connection => {
      const wizardCode = connection.wizardVersion.split(' ')[0];
      const wizardName = getWizardName(wizardCode);
      const version = connection.wizardVersion.split(' ')[1] || 'Unknown';
      
      if (!grouped[wizardCode]) {
        grouped[wizardCode] = {
          wizardName,
          wizardCode,
          versions: {}
        };
      }
      
      if (!grouped[wizardCode].versions[version]) {
        grouped[wizardCode].versions[version] = {
          version,
          connections: [],
          userCount: 0,
          uniqueUsers: new Set()
        };
      }
      
      grouped[wizardCode].versions[version].connections.push(connection);
      grouped[wizardCode].versions[version].uniqueUsers.add(connection.username);
      grouped[wizardCode].versions[version].userCount = grouped[wizardCode].versions[version].uniqueUsers.size;
    });
    
    return grouped;
  };

  const extractDomainSuffix = (urlValue) => {
    if (!urlValue || typeof urlValue !== 'string') return '';

    let hostname = '';
    try {
      hostname = new URL(urlValue).hostname;
    } catch (error) {
      try {
        hostname = new URL(`http://${urlValue}`).hostname;
      } catch (innerError) {
        return '';
      }
    }

    const firstDotIndex = hostname.indexOf('.');
    if (firstDotIndex === -1) {
      return hostname.toLowerCase();
    }

    return hostname.slice(firstDotIndex + 1).toLowerCase();
  };

  // Check if catalogs is undefined, null, or empty
  if (!catalogs || catalogs.length === 0) {
    return (
      <Box>
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Typography variant="h5" gutterBottom>
            Welcome to More4apps Catalog Analyzer
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Upload a catalog file to get started with analyzing your More4apps environment.
          </Typography>
          <Button
            variant="contained"
            component={Link}
            to="/upload"
            startIcon={<TrendingUpIcon />}
          >
            Upload Catalog File
          </Button>
        </Box>
      </Box>
    );
  }

  const latestCatalog = selectedCatalog || catalogs[catalogs.length - 1];
  const analysis = latestCatalog?.analysis || {};

  // Prepare chart data - fix data access based on actual API response
  const packageStatusData = [
    { name: 'Valid', value: (latestCatalog?.m4apsPackages || []).filter(pkg => pkg.bodyStatus === 'VALID').length },
    { name: 'Invalid', value: (latestCatalog?.invalidObjects || []).length },
  ];

  const wizardUsageData = Object.keys(analysis.usageAnalysis?.wizardUsage || {}).map(wizardCode => {
    const wizardData = analysis.usageAnalysis?.wizardUsage?.[wizardCode];
    return {
      name: wizardData?.name || wizardCode,
      code: wizardCode,
      connections: wizardData?.connections || 0,
      userCount: wizardData?.userCount || 0
    };
  });

  // Get environment info from the actual data structure
  const environmentInfo = {
    instance: latestCatalog?.generalInfo?.Instance || latestCatalog?.databaseInfo?.['Database Name'] || 'Unknown',
    dbVersion: latestCatalog?.generalInfo?.['DB Version'] || 'Unknown',
    release: latestCatalog?.generalInfo?.Release || 'Unknown'
  };

  // Get servlet and web agent info from general information
  const servletAgent = latestCatalog?.generalInfo?.['Servlet Agent'] || 'Unknown';
  const webAgent = latestCatalog?.generalInfo?.['Web Agent'] || 'Unknown';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Catalog Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshAnalysis}
            disabled={refreshing || !latestCatalog?.id}
            size="small"
          >
            {refreshing ? 'Refreshing...' : 'Refresh Analysis'}
          </Button>
        </Box>
      </Box>

      {/* Button to update latestVersions in versionChecker.js */}
      {catalogs && catalogs.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, mb: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdateLatestVersions}
            disabled={updateScriptLoading}
          >
            {updateScriptLoading ? 'Updating...' : 'Update Latest Versions'}
          </Button>
          {updateScriptResult && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {updateScriptResult.success ? (
                <span style={{ color: 'green', fontSize: '1.5em' }}>✓</span>
              ) : (
                <span style={{ color: 'red', fontSize: '1.5em' }}>✗</span>
              )}
              <Typography variant="body2" color={updateScriptResult.success ? 'success.main' : 'error.main'}>
                <strong>{updateScriptResult.success ? 'Success:' : 'Error:'}</strong> {updateScriptResult.message ? updateScriptResult.message : (updateScriptResult.success ? 'Latest versions updated successfully.' : 'An error occurred.')}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      <Typography variant="body2" color="text.secondary" gutterBottom>
        Environment: {environmentInfo.instance} | 
        DB Version: {environmentInfo.dbVersion} | 
        Release: {environmentInfo.release} | 
        Last Updated: {moment(latestCatalog?.uploadTimestamp).fromNow()}
      </Typography>



      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Top Row - Summary Cards */}
        {/* Package Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 200 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                More4apps Packages
              </Typography>
              <Typography variant="h4" color="primary">
                {analysis.packageAnalysis?.summary?.total || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Installed
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="success.main">
                  ✓ {analysis.packageAnalysis?.summary?.valid || 0} Valid
                </Typography>
                <br />
                <Typography variant="caption" color="error.main">
                  ✗ {analysis.packageAnalysis?.summary?.invalid || 0} Invalid
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Servlet Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 200 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Servlet Agent
              </Typography>
              <Typography variant="h5" color="secondary" sx={{ wordBreak: 'break-all', lineHeight: 1.2 }}>
                {servletAgent !== 'Unknown' ? servletAgent.replace('https://', '').replace('http://', '') : 'Unknown'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Servlet Endpoint
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {servletAgent !== 'Unknown' ? 'Configured' : 'Not available'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Web Agent Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 200 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Web Agent
              </Typography>
              <Typography variant="h5" color="info.main" sx={{ wordBreak: 'break-all', lineHeight: 1.2 }}>
                {webAgent !== 'Unknown' ? webAgent.replace('https://', '').replace('http://', '') : 'Unknown'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Web Endpoint
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {webAgent !== 'Unknown' ? 'Configured' : 'Not available'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Client License Lookup Section - moved here */}
        <Grid item xs={12}>
          {/* Collapsible Client Search and License Lookup */}
          <Card sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, cursor: 'pointer' }} onClick={() => setLicenseLookupOpen(v => !v)}>
              <Typography variant="h6" gutterBottom>Client License Lookup</Typography>
              <IconButton size="small" sx={{ color: '#0041C8' }}>
                {licenseLookupOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            <Collapse in={licenseLookupOpen}>
              <CardContent>
                <TextField
                  label="Search Client Name"
                  variant="outlined"
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                {filteredClients.length > 0 && (
                  <List sx={{ maxHeight: 200, overflowY: 'auto', bgcolor: '#fafafa', borderRadius: 1 }}>
                    {filteredClients.map(client => (
                      <ListItem
                        key={client.code}
                        button
                        selected={selectedClient?.code === client.code}
                        onClick={() => {
                          setSelectedClient(client);
                          fetchLicenseInfo(client);
                        }}
                      >
                        <ListItemText primary={client.name} secondary={`Code: ${client.code}`} />
                      </ListItem>
                    ))}
                  </List>
                )}
                {selectedClient && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1">Selected Client: {selectedClient.name} ({selectedClient.code})</Typography>
                    {licenseLoading && <LinearProgress sx={{ mt: 1, mb: 1 }} />}
                    {licenseError && <Alert severity="error">{licenseError}</Alert>}
                    {licenseInfo && Array.isArray(licenseInfo.items) && (
                      <Box sx={{ mt: 2 }}>
                        {(() => {
                          const servletDomainSuffix = extractDomainSuffix(servletAgent);
                          const licenseItemsForDisplay = servletDomainSuffix
                            ? licenseInfo.items.filter(item =>
                                extractDomainSuffix(item.url) === servletDomainSuffix
                              )
                            : licenseInfo.items;

                          return (
                            <>
                        {/* Comparison check between API licenses and catalog licenses */}
                        {(() => {
                          // Catalog licenses
                          const catalogLicenses = (latestCatalog?.licenseKeys || []).map(l => l.licenseName.replace('M4APS_', '').replace('_LICENCE_KEY', ''));
                          // API licenses
                          const apiLicenses = licenseItemsForDisplay.map(l => l.product_code);
                          // Missing in API
                          const missingInApi = catalogLicenses.filter(code => !apiLicenses.includes(code));
                          // Extra in API
                          const extraInApi = apiLicenses.filter(code => !catalogLicenses.includes(code));
                          if (missingInApi.length === 0 && extraInApi.length === 0) {
                            return <Alert severity="success" sx={{ mb: 2 }}>All catalog licenses are present in the API response.</Alert>;
                          }
                          return (
                            <Box sx={{ mb: 2 }}>
                              {missingInApi.length > 0 && (
                                <Alert severity="warning" sx={{ mb: 1 }}>
                                  Missing in API: {missingInApi.join(', ')}
                                </Alert>
                              )}
                              {extraInApi.length > 0 && (
                                <Alert severity="info" sx={{ mb: 1 }}>
                                  Extra in API: {extraInApi.join(', ')}
                                </Alert>
                              )}
                            </Box>
                          );
                        })()}
                        {/* Group licenses by product_name and display as cards with expand/collapse */}
                        {Object.entries(
                          licenseItemsForDisplay.reduce((acc, item) => {
                            const key = item.product_name || item.product_code;
                            if (!acc[key]) acc[key] = [];
                            acc[key].push(item);
                            return acc;
                          }, {})
                        ).map(([productName, licenses]) => {
                          const code = licenses[0]?.product_code;
                          const isExpanded = expandedLicenses[code] ?? false;
                          return (
                            <Box key={productName} sx={{ mb: 3 }}>
                              <Card sx={{ boxShadow: 0, bgcolor: '#fafafa', borderRadius: 2, border: '1px solid #eee' }}>
                                <Box 
                                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', p: 2 }}
                                  onClick={() => toggleLicenseExpanded(code)}
                                >
                                  <Typography variant="body1" fontWeight="bold" sx={{ color: '#0041C8' }}>
                                    {productName} ({code})
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="caption" color="text.secondary">Licensed</Typography>
                                    <IconButton size="small" sx={{ color: '#0041C8' }}>
                                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                    </IconButton>
                                  </Box>
                                </Box>
                                <Collapse in={isExpanded}>
                                  <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #eee' }}>
                                    <List>
                                      {licenses.map(lic => (
                                        <ListItem key={lic.id} sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
                                          <Typography variant="body2" fontWeight="bold">License Name: {lic.license_name}</Typography>
                                          <Typography variant="body2">Expiry Date: {lic.expiry_date}</Typography>
                                          <Typography variant="body2">Seats: {lic.seats ?? 'N/A'}</Typography>
                                          <Typography variant="body2">URL: {lic.url ?? 'N/A'}</Typography>
                                          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>Key: {lic.generated_key}</Typography>
                                        </ListItem>
                                      ))}
                                    </List>
                                  </Box>
                                </Collapse>
                              </Card>
                            </Box>
                          );
                        })}
                            </>
                          );
                        })()}
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
            </Collapse>
          </Card>
        </Grid>

        {/* Second Row - License and Recent Activity */}
        {/* License Keys */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 600 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>
                License Information
              </Typography>
              {latestCatalog?.licenseKeys && latestCatalog.licenseKeys.length > 0 ? (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    ✓ {latestCatalog?.licenseKeys?.length} licensed wizard{latestCatalog?.licenseKeys?.length !== 1 ? 's' : ''} detected
                  </Typography>
                  <Box sx={{ 
                    flex: 1, 
                    overflowY: 'auto',
                    minHeight: 250,
                    maxHeight: 500,
                    pr: 1,
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#f1f1f1',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#c1c1c1',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: '#a8a8a8',
                    },
                  }}>
                    {latestCatalog?.licenseKeys?.map((license, index) => {
                      const licenseCode = license.licenseName.replace('M4APS_', '').replace('_LICENCE_KEY', '');
                      const licenseName = getLicenseName(licenseCode);
                      const isExpanded = expandedLicenses[licenseCode] ?? false;
                      
                      return (
                        <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 2, bgcolor: '#fafafa' }}>
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              cursor: 'pointer',
                              '&:hover': { bgcolor: '#f0f0f0' },
                              p: 1,
                              borderRadius: 1,
                              mb: isExpanded ? 2 : 0
                            }}
                            onClick={() => toggleLicenseExpanded(licenseCode)}
                          >
                            <Typography variant="body1" fontWeight="bold" sx={{ color: '#0041C8' }}>
                              {licenseName} ({licenseCode})
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                Licensed
                              </Typography>
                              <IconButton size="small" sx={{ color: '#0041C8' }}>
                                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              </IconButton>
                            </Box>
                          </Box>
                          
                          <Collapse in={isExpanded}>
                            <Box sx={{ ml: 2, p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #eee' }}>
                              <Grid container spacing={1} alignItems="center">
                                <Grid item xs={12} sm={3}>
                                  <Typography variant="body2" color="text.secondary">Product</Typography>
                                  <Typography variant="body2" fontWeight="bold">{licenseName}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={2}>
                                  <Typography variant="body2" color="text.secondary">Code</Typography>
                                  <Typography variant="body2">{licenseCode}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={2}>
                                  <Typography variant="body2" color="text.secondary">Status</Typography>
                                  <Chip label="Active" color="success" size="small" />
                                </Grid>
                                <Grid item xs={12} sm={5}>
                                  <Typography variant="body2" color="text.secondary">License Key</Typography>
                                  <Typography variant="caption" sx={{ 
                                    fontFamily: 'monospace', 
                                    wordBreak: 'break-all',
                                    display: 'block',
                                    lineHeight: 1.4,
                                    backgroundColor: '#f8f8f8',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #e8e8e8',
                                    mt: 0.5
                                  }}>
                                    {license.key}
                                  </Typography>
                                </Grid>
                              </Grid>
                            </Box>
                          </Collapse>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No license information available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Wizard Activity */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 600 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>
                Wizard Activity (Past 6 Months) 
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                {(() => {
                  const total = latestCatalog?.wizardConnections?.length || 0;
                  const recent = getRecentConnections(latestCatalog?.wizardConnections || []).length;
                  return `${recent} of ${total} total connections`;
                })()}
              </Typography>
              {(() => {
                const allConnections = latestCatalog?.wizardConnections || [];
                console.log('Total wizard connections:', allConnections.length);
                console.log('Sample connection date:', allConnections[0]?.connectionDate);
                
                const recentConnections = getRecentConnections(allConnections);
                console.log('Recent connections (past 6 months):', recentConnections.length);
                
                const groupedData = groupConnectionsByWizardAndVersion(recentConnections);
                const wizardKeys = Object.keys(groupedData);
                
                return wizardKeys.length > 0 ? (
                  <Box sx={{ 
                    flex: 1, 
                    overflowY: 'auto',
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#f1f1f1',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#c1c1c1',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: '#a8a8a8',
                    },
                  }}>
                    {wizardKeys.map((wizardCode) => {
                      const wizardData = groupedData[wizardCode];
                      const versionKeys = Object.keys(wizardData.versions).sort();
                      const isExpanded = expandedWizards[wizardCode] ?? false;
                      
                      return (
                        <Box key={wizardCode} sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 2, bgcolor: '#fafafa' }}>
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              cursor: 'pointer',
                              '&:hover': { bgcolor: '#f0f0f0' },
                              p: 1,
                              borderRadius: 1,
                              mb: isExpanded ? 2 : 0
                            }}
                            onClick={() => toggleWizardExpanded(wizardCode)}
                          >
                            <Typography variant="body1" fontWeight="bold" sx={{ color: '#0041C8' }}>
                              {wizardData.wizardName} ({wizardCode})
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {versionKeys.length} version{versionKeys.length !== 1 ? 's' : ''}
                              </Typography>
                              <IconButton size="small" sx={{ color: '#0041C8' }}>
                                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              </IconButton>
                            </Box>
                          </Box>
                          
                          <Collapse in={isExpanded}>
                            <Box>
                              {versionKeys.map((version) => {
                                const versionData = wizardData.versions[version];
                                const latestConnection = versionData.connections.sort((a, b) => {
                                  const dateA = moment(a.connectionDate, 'DD-MMM-YY HH:mm', true).isValid() 
                                    ? moment(a.connectionDate, 'DD-MMM-YY HH:mm') 
                                    : moment(a.connectionDate, ['DD-MON-YY', 'DD-MON-YYYY', 'YYYY-MM-DD', 'DD-MMM-YYYY HH:mm']);
                                  const dateB = moment(b.connectionDate, 'DD-MMM-YY HH:mm', true).isValid() 
                                    ? moment(b.connectionDate, 'DD-MMM-YY HH:mm') 
                                    : moment(b.connectionDate, ['DD-MON-YY', 'DD-MON-YYYY', 'YYYY-MM-DD', 'DD-MMM-YYYY HH:mm']);
                                  return dateB.valueOf() - dateA.valueOf();
                                })[0];
                                
                                return (
                                  <Box key={version} sx={{ ml: 2, mb: 2, p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #eee' }}>
                                    <Grid container spacing={1} alignItems="center">
                                      <Grid item xs={12} sm={3}>
                                        <Typography variant="body2" color="text.secondary">Version</Typography>
                                        <Typography variant="body2" fontWeight="bold">{version}</Typography>
                                      </Grid>
                                      <Grid item xs={12} sm={2}>
                                        <Typography variant="body2" color="text.secondary">Users</Typography>
                                        <Typography variant="body2">{versionData.userCount}</Typography>
                                      </Grid>
                                      <Grid item xs={12} sm={2}>
                                        <Typography variant="body2" color="text.secondary">Connections</Typography>
                                        <Typography variant="body2">{versionData.connections.length}</Typography>
                                      </Grid>
                                      <Grid item xs={12} sm={3}>
                                        <Typography variant="body2" color="text.secondary">Last Used</Typography>
                                        <Typography variant="body2">{latestConnection?.connectionDate || 'Unknown'}</Typography>
                                      </Grid>
                                      <Grid item xs={12} sm={2}>
                                        <Typography variant="body2" color="text.secondary">Servlet</Typography>
                                        <Typography variant="caption">{latestConnection?.servletVersion || 'N/A'}</Typography>
                                      </Grid>
                                    </Grid>
                                  </Box>
                                );
                              })}
                            </Box>
                          </Collapse>
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Alert severity="info">
                    <Typography variant="body2">
                      No wizard activity recorded in the past 6 months.
                    </Typography>
                  </Alert>
                );
              })()}
            </CardContent>
          </Card>
        </Grid>

        {/* Package Analysis Table - Full Width */}
        {analysis.versionComparison && analysis.versionComparison.packages.length > 0 ? (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      More4apps Package Analysis ({analysis.versionComparison?.packages?.length || 0} packages)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Comprehensive analysis of your More4Apps packages with version comparison against community latest releases
                    </Typography>
                  </Box>
                  {analysis.versionComparison && analysis.versionComparison.recommendations.some(rec => rec.detailedMessage) && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        // Find the first recommendation with detailed message
                        const detailedRecommendation = analysis.versionComparison.recommendations.find(rec => rec.detailedMessage);
                        setSelectedRecommendation(detailedRecommendation);
                        setDetailModalOpen(true);
                      }}
                      startIcon={<span style={{ fontSize: '1.2em' }}>✨</span>}
                      sx={{ 
                        flexShrink: 0, 
                        ml: 2,
                        background: 'linear-gradient(45deg, #0041C8 30%, #FF6B35 90%)',
                        color: 'white',
                        fontWeight: 'bold',
                        boxShadow: '0 3px 5px 2px rgba(153, 0, 165, .3)',
                        animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                          '0%': {
                            transform: 'scale(1)',
                            boxShadow: '0 3px 5px 2px rgba(153, 0, 165, .3)',
                          },
                          '50%': {
                            transform: 'scale(1.05)',
                            boxShadow: '0 5px 10px 4px rgba(153, 0, 165, .4)',
                          },
                          '100%': {
                            transform: 'scale(1)',
                            boxShadow: '0 3px 5px 2px rgba(153, 0, 165, .3)',
                          },
                        },
                        '&:hover': {
                          background: 'linear-gradient(45deg, #B300C7 30%, #FF8557 90%)',
                          transform: 'scale(1.05)',
                          boxShadow: '0 6px 12px 4px rgba(153, 0, 165, .5)',
                        },
                        transition: 'all 0.3s ease-in-out',
                      }}
                    >
                      View Detailed Recommendations
                    </Button>
                  )}
                </Box>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f0e6f2' }}>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #0041C8', minWidth: '200px', color: '#002A7A', fontWeight: '600' }}>Wizard</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #0041C8', minWidth: '180px', color: '#002A7A', fontWeight: '600' }}>Package Name</th>
                        <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #0041C8', minWidth: '120px', color: '#002A7A', fontWeight: '600' }}>Installed Body</th>
                        <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #0041C8', minWidth: '120px', color: '#002A7A', fontWeight: '600' }}>Minimum Body</th>
                        <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #0041C8', minWidth: '120px', color: '#002A7A', fontWeight: '600' }}>Latest Body</th>
                        <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #0041C8', minWidth: '100px', color: '#002A7A', fontWeight: '600' }}>Status</th>
                        <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #0041C8', minWidth: '120px', color: '#002A7A', fontWeight: '600' }}>Release Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.versionComparison.packages.map((pkg, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>
                            {pkg.wizardName}
                          </td>
                          <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {(() => {
                              if (!pkg.packageName) return 'N/A';
                              const trimmed = pkg.packageName.replace(/^((APPS|BOLINF)\.M4APS_)/, '');
                              return trimmed === 'XML' ? 'SHARED PACKAGE' : trimmed;
                            })()}
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            textAlign: 'center',
                            backgroundColor: pkg.status === 'Update Required' ? '#fff3cd' : 
                                            pkg.status === 'Update Recommended' ? '#e2f3ff' :
                                            pkg.status === 'Current' ? '#d4edda' : '#f8f9fa'
                          }}>
                            {pkg.currentBody}
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            textAlign: 'center',
                            fontStyle: 'italic',
                            color: pkg.status === 'Update Required' ? '#856404' : '#6c757d'
                          }}>
                            {pkg.minBodyVersion || 'N/A'}
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            textAlign: 'center',
                            fontWeight: pkg.status === 'Update Required' ? 'bold' : 
                                       pkg.status === 'Update Recommended' ? '500' : 'normal',
                            color: pkg.status === 'Update Required' ? '#856404' : 
                                  pkg.status === 'Update Recommended' ? '#004085' : 'inherit'
                          }}>
                            {pkg.latestBody || 'N/A'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <Chip 
                              label={pkg.status}
                              color={
                                pkg.status === 'Current' ? 'success' : 
                                pkg.status === 'Update Required' ? 'warning' : 
                                pkg.status === 'Update Recommended' ? 'info' :
                                pkg.status === 'Unknown' ? 'default' : 
                                pkg.status === 'Error' ? 'error' : 'default'
                              }
                              size="small"
                            />
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', fontSize: '0.875rem' }}>
                            {pkg.releaseDate || 'Unknown'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
                <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, backgroundColor: '#d4edda', border: '1px solid #c3e6cb' }}></Box>
                    <Typography variant="caption">Current</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}></Box>
                    <Typography variant="caption">Outdated (needs update)</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, backgroundColor: '#d1ecf1', border: '1px solid #bee5eb' }}></Box>
                    <Typography variant="caption">Update Recommended</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ) : latestCatalog && latestCatalog.m4apsPackages && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Alert severity="info">
                  <Typography variant="body2">
                    No More4Apps packages found in this environment or version comparison data is unavailable.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        )}

      </Grid>

      {/* Manual Version Editor Dialog */}
      <ManualVersionEditor 
        open={versionEditorOpen}
        onClose={() => setVersionEditorOpen(false)}
        onUpdateComplete={(result) => {
          // Optionally refresh the page or show a success message
          console.log('Version update completed:', result);
          // You could trigger a catalog re-analysis here
        }}
      />

      {/* Detailed Recommendations Modal */}
      <Dialog
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">More4apps Update Recommendations</Typography>
            <IconButton onClick={() => setDetailModalOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 0 }}>
          {selectedRecommendation && (
            <Box>
              {/* Detailed Message */}
              <Box sx={{ p: 3, bgcolor: '#f8f9fa' }}>
                <Typography 
                  component="pre" 
                  sx={{ 
                    whiteSpace: 'pre-wrap', 
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    margin: 0
                  }}
                >
                  {selectedRecommendation.detailedMessage}
                </Typography>
              </Box>


            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2 }}>
          <Button
            startIcon={<ContentCopyIcon />}
            onClick={() => {
              if (selectedRecommendation?.detailedMessage) {
                console.log('Copy button clicked, message exists:', !!selectedRecommendation.detailedMessage);
                
                // The table is now included in the detailed message itself
                const combinedText = selectedRecommendation.detailedMessage;
                
                // Check if clipboard API is available
                if (navigator.clipboard && window.isSecureContext) {
                  console.log('Using modern clipboard API');
                  navigator.clipboard.writeText(combinedText)
                    .then(() => {
                      console.log('Successfully copied to clipboard');
                      alert('Complete recommendations copied to clipboard!');
                    })
                    .catch((err) => {
                      console.error('Clipboard API failed:', err);
                      // Fallback method
                      copyWithFallback(combinedText);
                    });
                } else {
                  console.log('Using fallback method');
                  copyWithFallback(combinedText);
                }
              } else {
                console.log('No message to copy');
              }

              function copyWithFallback(text) {
                try {
                  const textArea = document.createElement('textarea');
                  textArea.value = text;
                  textArea.style.position = 'fixed';
                  textArea.style.left = '-999999px';
                  textArea.style.top = '-999999px';
                  document.body.appendChild(textArea);
                  textArea.focus();
                  textArea.select();
                  
                  const successful = document.execCommand('copy');
                  document.body.removeChild(textArea);
                  
                  if (successful) {
                    console.log('Fallback copy successful');
                    alert('Complete recommendations copied to clipboard!');
                  } else {
                    console.error('Fallback copy failed');
                    alert('Failed to copy to clipboard. Please try selecting and copying the text manually.');
                  }
                } catch (err) {
                  console.error('Fallback method failed:', err);
                  alert('Copy failed. Please select and copy the text manually.');
                }
              }
            }}
            variant="outlined"
          >
            Copy to Clipboard
          </Button>
          <Button 
            href="https://community.more4apps.com/s/ebs-toolbox-downloads"
            target="_blank"
            variant="contained"
            color="primary"
          >
            Download Updates
          </Button>
          <Button onClick={() => setDetailModalOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Dashboard;