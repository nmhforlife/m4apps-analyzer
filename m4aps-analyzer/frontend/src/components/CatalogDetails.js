import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { useCatalog } from '../context/CatalogContext';
import moment from 'moment';

function CatalogDetails() {
  const { id } = useParams();
  const { catalogs } = useCatalog();
  
  const catalog = catalogs.find(cat => cat.id === parseInt(id));

  if (!catalog) {
    return (
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h5">Catalog not found</Typography>
      </Box>
    );
  }

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'VALID': return 'success';
      case 'INVALID': return 'error';
      case 'OPEN': return 'success';
      case 'NORMAL': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Catalog Details
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {catalog.filename} | Uploaded: {moment(catalog.uploadTimestamp).format('MMMM Do YYYY, h:mm:ss a')}
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* General Information */}
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">General Information</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {Object.entries(catalog.generalInfo || {}).map(([key, value]) => (
                  <Grid item xs={12} sm={6} md={4} key={key}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          {key}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {value}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* More4apps Packages */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                More4apps Packages ({catalog.m4apsPackages?.length || 0})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Package Name</TableCell>
                      <TableCell>Header Version</TableCell>
                      <TableCell>Body Version</TableCell>
                      <TableCell>Header Status</TableCell>
                      <TableCell>Body Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {catalog.m4apsPackages?.map((pkg, index) => (
                      <TableRow key={index}>
                        <TableCell>{pkg.packageName}</TableCell>
                        <TableCell>{pkg.header}</TableCell>
                        <TableCell>{pkg.body}</TableCell>
                        <TableCell>
                          <Chip 
                            label={pkg.headerStatus} 
                            color={getStatusColor(pkg.headerStatus)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={pkg.bodyStatus} 
                            color={getStatusColor(pkg.bodyStatus)}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No packages found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Database Nodes */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                Database Nodes ({catalog.dbNodes?.length || 0})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Host</TableCell>
                      <TableCell>Active</TableCell>
                      <TableCell>DB Status</TableCell>
                      <TableCell>Instance</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Version</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {catalog.dbNodes?.map((node, index) => (
                      <TableRow key={index}>
                        <TableCell>{node.host}</TableCell>
                        <TableCell>
                          <Chip 
                            label={node.active} 
                            color={getStatusColor(node.active)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{node.dbStatus}</TableCell>
                        <TableCell>{node.instance}</TableCell>
                        <TableCell>
                          <Chip 
                            label={node.status} 
                            color={getStatusColor(node.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{node.version}</TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No database nodes found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Invalid Objects */}
        {catalog.invalidObjects && catalog.invalidObjects.length > 0 && (
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" color="error">
                  Invalid Objects ({catalog.invalidObjects.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Invalid objects detected. These should be recompiled to ensure system stability.
                </Alert>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Owner</TableCell>
                        <TableCell>Object Name</TableCell>
                        <TableCell>Object Type</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {catalog.invalidObjects.map((obj, index) => (
                        <TableRow key={index}>
                          <TableCell>{obj.owner}</TableCell>
                          <TableCell>{obj.objectName}</TableCell>
                          <TableCell>{obj.objectType}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* Compilation Errors */}
        {catalog.compilationErrors && catalog.compilationErrors.length > 0 && (
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" color="error">
                  Compilation Errors ({catalog.compilationErrors.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Alert severity="error" sx={{ mb: 2 }}>
                  Compilation errors detected. These must be fixed for proper functionality.
                </Alert>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Package</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Line</TableCell>
                        <TableCell>Error</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {catalog.compilationErrors.map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>{error.package}</TableCell>
                          <TableCell>{error.type}</TableCell>
                          <TableCell>{error.line}</TableCell>
                          <TableCell>{error.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* Wizard Connections */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                Recent Wizard Connections ({catalog.wizardConnections?.length || 0})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Wizard</TableCell>
                      <TableCell>Servlet Version</TableCell>
                      <TableCell>Responsibility</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {catalog.wizardConnections?.slice(0, 20).map((conn, index) => (
                      <TableRow key={index}>
                        <TableCell>{conn.connectionDate}</TableCell>
                        <TableCell>{conn.username}</TableCell>
                        <TableCell>{conn.wizardVersion}</TableCell>
                        <TableCell>{conn.servletVersion}</TableCell>
                        <TableCell>{conn.responsibility}</TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No wizard connections found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </Box>
  );
}

export default CatalogDetails;