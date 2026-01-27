import React, { useState, useCallback, useMemo } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Chip,
    Alert,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Collapse,
    IconButton,
    Snackbar,
} from '@mui/material';
import {
    Info as InfoIcon,
    CloudUpload as CloudUploadIcon,
    Close as CloseIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    BugReport as BugReportIcon,
    ContentCopy as ContentCopyIcon,
    BarChart as BarChartIcon,
    AccessTime as AccessTimeIcon
} from '@mui/icons-material';

// =========================================================================
// 1. IMPROVED HELPER FUNCTIONS (PARSING, CLASSIFICATION, STATS)
// =========================================================================

/**
 * Detects errors, exceptions, and performance patterns in the query/command text.
 * Improved to handle specific Oracle errors from the provided log data.
 * @param {Object} query - A single parsed query object.
 * @returns {{hasErrors: boolean, errorTypes: string[], severity: 'error'|'warning'|'none'}}
 */
const detectErrors = (query) => {
    const text = `${query.description} ${query.sqlOrCommand}`.toLowerCase();
    const errors = [];
    const errorCodes = [];
    
    // Pattern: ORA-xxxxx, PLS-xxxxx
    const oracleErrorPattern = /(ora-\d{5}|pls-\d{5}|pl\/sql: numeric or value error|character to number conversion error)/gi;
    const oracleMatches = query.sqlOrCommand.match(oracleErrorPattern) || query.description.match(oracleErrorPattern);
    
    if (oracleMatches) {
        errorCodes.push(...oracleMatches.map(m => m.toUpperCase().trim()));
    }
    
    if (errorCodes.length > 0) {
        errors.push({ type: 'Database Error', severity: 'error' });
    }

    // General severe errors
    if (text.includes('rollback to savepoint') && errors.length === 0) {
        // Rollbacks usually indicate an error occurred and was handled/rolled back
        errors.push({ type: 'Rollback Event', severity: 'warning' });
    }
    
    // Performance/Warning patterns
    if (query.type === 'p_sql' && (text.includes('where rownum < 1001') || text.includes('order by meaning'))) {
        errors.push({ type: 'Lookup Query', severity: 'info' }); // Not an error, but a common operation
    }
    
    if (text.includes('opt_estimate(table xt rows=2)')) {
        errors.push({ type: 'Hint Usage', severity: 'info' }); // Not an error, useful context
    }
    
    if (text.includes('hz_parties party where party.party_type = xmltable.p1')) {
        errors.push({ type: 'Customer Upload Logic', severity: 'info' });
    }

    const finalErrors = {
        hasErrors: errors.length > 0 || errorCodes.length > 0,
        errorTypes: [...new Set([...errors.map(e => e.type), ...errorCodes.map(c => `Code: ${c}`)])],
        severity: errors.some(e => e.severity === 'error') ? 'error' : 
                  errors.some(e => e.severity === 'warning') ? 'warning' : 
                  errorCodes.length > 0 ? 'error' : 'none'
    };
    
    // Final check for log entries with just 'FALSE' followed by an error message
    if (query.type === 'FALSE' || query.description === 'FALSE') {
        finalErrors.hasErrors = true;
        finalErrors.severity = 'error';
        if (!finalErrors.errorTypes.includes('Database Error')) {
            finalErrors.errorTypes.unshift('Uncaught Exception');
        }
    }

    return finalErrors;
};

/**
 * Parses the raw log data, grouping multi-line commands/SQL.
 * @param {string} data - Raw pasted log data.
 * @returns {Array} - Parsed log entries.
 */
const parseQueryLogData = (data) => {
    if (!data.trim()) return [];

    const lines = data.split(/\r?\n/);
    const parsedQueries = [];
    let currentEntry = [];
    let id = 1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Regex to detect a new log entry: Starts with timestamp, followed by type, followed by description/content
        const isNewEntry = line.match(/^(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+([^\s]+)\s+([^\t]+)\s+(.+)$/);
        const isTabEntry = line.match(/^(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{2}:\d{2}:\d{2}\.\d{3})\t([^\t]+)\t([^\t]+)\t(.+)$/);

        if (isNewEntry || isTabEntry) {
            // Process the previous entry buffer
            if (currentEntry.length > 0) {
                const parts = currentEntry[0]; // [timestamp, type, description]
                const sqlOrCommand = currentEntry.slice(1).join('\n').trim();
                
                if (parts && parts.length >= 4) {
                    const [timestamp, type, description] = parts;
                    const queryObj = {
                        timestamp: new Date(timestamp.trim()),
                        type: type.trim(),
                        description: description.trim(),
                        sqlOrCommand: sqlOrCommand || parts[3].trim(), // Use buffered content or remaining part of first line
                        id: id++
                    };
                    queryObj.errorInfo = detectErrors(queryObj);
                    parsedQueries.push(queryObj);
                }
            }
            
            // Start new entry buffer
            if (isNewEntry) {
                // If regex split by spaces/tabs was successful
                const [, timestamp, type, description, sqlOrCommand] = isNewEntry;
                currentEntry = [
                    [timestamp, type, description, sqlOrCommand]
                ];
            } else if (isTabEntry) {
                // If tab split was successful
                const [, timestamp, type, description, sqlOrCommand] = isTabEntry;
                currentEntry = [
                    [timestamp, type, description, sqlOrCommand]
                ];
            }
        } else if (currentEntry.length > 0) {
            // Continuation line for a multi-line SQL/PLSQL block
            currentEntry.push(line);
        }
    }

    // Process the final entry
    if (currentEntry.length > 0 && currentEntry[0].length >= 4) {
        const parts = currentEntry[0];
        const sqlOrCommand = currentEntry.slice(1).join('\n').trim();
        const [timestamp, type, description] = parts;
        
        const queryObj = {
            timestamp: new Date(timestamp.trim()),
            type: type.trim(),
            description: description.trim(),
            sqlOrCommand: sqlOrCommand || parts[3].trim(),
            id: id++
        };
        queryObj.errorInfo = detectErrors(queryObj);
        parsedQueries.push(queryObj);
    }

    // Final sort by timestamp
    parsedQueries.sort((a, b) => a.timestamp - b.timestamp);
    return parsedQueries;
};

/**
 * Calculates statistics based on parsed queries.
 * @param {Array} parsedQueries
 * @returns {Object} Statistics summary.
 */
const getQueryStatistics = (parsedQueries) => {
    if (!parsedQueries.length) return null;
    
    const typeBreakdown = {};
    const errorCounts = { total: 0, errors: 0, warnings: 0 };
    
    const timeRange = {
        start: parsedQueries[0].timestamp,
        end: parsedQueries[parsedQueries.length - 1].timestamp
    };
    
    parsedQueries.forEach(query => {
        typeBreakdown[query.type] = (typeBreakdown[query.type] || 0) + 1;
        
        if (query.errorInfo && query.errorInfo.hasErrors) {
            errorCounts.total++;
            if (query.errorInfo.severity === 'error') {
                errorCounts.errors++;
            } else if (query.errorInfo.severity === 'warning') {
                errorCounts.warnings++;
            }
        }
    });
    
    const duration = timeRange.end - timeRange.start;
    const durationMinutes = Math.max(1, Math.round(duration / (1000 * 60))); // Ensure minimum 1 min for calc
    
    return {
        totalQueries: parsedQueries.length,
        uniqueTypes: Object.keys(typeBreakdown).length,
        typeBreakdown,
        timeRange,
        durationMinutes,
        avgQueriesPerMinute: (parsedQueries.length / durationMinutes).toFixed(2),
        errorCounts
    };
};

// =========================================================================
// 2. MAIN REACT COMPONENT
// =========================================================================

function QueryLogAnalyzer() {
    // Use useCallback/useMemo for performance
    const [queryLogData, setQueryLogData] = useState('');
    const [parsedQueries, setParsedQueries] = useState([]);
    const [queryAnalysisOpen, setQueryAnalysisOpen] = useState(true);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [copySuccess, setCopySuccess] = useState(false);
    const [copiedText, setCopiedText] = useState('');
    const [visibleQueryErrorTypes, setVisibleQueryErrorTypes] = useState(new Set(['error', 'warning', 'info'])); // New state for filtering

    // Load Sample Data (moved inside component to use hooks)
    const loadSampleData = useCallback(() => {
        const sampleData = `10/14/2025 14:52:45.105	p_sql	Checking validity of Session 1437477628	select fnd_global.user_name a, fnd_global.resp_name b,' ' c from dual;
10/14/2025 14:52:46.105	p_init	Search for CW	/
10/14/2025 14:52:46.105	p_sql	Search for CW	select count(PROC_NAME) ProcCount from XDP_PROC_BODY where PROC_NAME = 'CW';
10/14/2025 14:52:46.105	p_init	Retrieving: [Customer Wizard:TEMPLATES]	"DECLARE 
	 error_msg VARCHAR2(4000); 
	 template_name VARCHAR2(4000); 
	 xmldata XMLTYPE; 
	 CURSOR cur_templates IS 
	 SELECT * FROM xdp_proc_body 
	 WHERE proc_spec = 'CW:TEMPLATES'; 
BEGIN 
	 DELETE FROM AHL_MR_INSTANCES_TEMP; 
	 FOR template_rec IN cur_templates 
	 LOOP 
	 	 BEGIN 
	 	 	 xmldata := XMLTYPE(template_rec.proc_body); 
	 	 	 template_name := xmldata.EXTRACT('/Template/@Template_Name').getstringval(); 
	 	 	 INSERT INTO AHL_MR_INSTANCES_TEMP(STATUS, LOCATION) VALUES (template_rec.proc_name, template_name); 
	 	 EXCEPTION 
	 	 WHEN OTHERS THEN 
	 	 	 error_msg := SUBSTRB(SQLERRM, 1, 4000); 
	 	 	 INSERT INTO AHL_MR_INSTANCES_TEMP(OWNER, STATUS, LOCATION) VALUES ('ERROR', template_rec.proc_name, error_msg); 
	 	 END; 
	 END LOOP; 
END;/"
10/14/2025 14:53:04.104	FALSE	Executing upload	"ORA-06502: PL/SQL: numeric or value error: character to number conversion error
ORA-06512: at line 183
"`;
        
        setQueryLogData(sampleData);
        const parsed = parseQueryLogData(sampleData);
        setParsedQueries(parsed);
    }, []);

    // Handle query log paste (useCallback for performance)
    const handleQueryLogPaste = useCallback((event) => {
        const pastedData = event.target.value;
        setQueryLogData(pastedData);
        
        if (pastedData.trim()) {
            const parsed = parseQueryLogData(pastedData);
            setParsedQueries(parsed);
        } else {
            setParsedQueries([]);
        }
    }, []);

    // Get query statistics (useMemo to prevent re-calculation on every render)
    const stats = useMemo(() => getQueryStatistics(parsedQueries), [parsedQueries]);

    // Helper function to toggle row expansion (useCallback for performance)
    const toggleRowExpansion = useCallback((queryId) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(queryId)) {
                newSet.delete(queryId);
            } else {
                newSet.add(queryId);
            }
            return newSet;
        });
    }, []);

    // Helper function to copy text to clipboard (useCallback for performance)
    const copyToClipboard = useCallback(async (text, queryId) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedText(`Command for entry ID ${queryId} copied`);
            setCopySuccess(true);
        } catch (error) {
            console.error('Failed to copy text:', error);
            setCopiedText('Failed to copy');
            setCopySuccess(true);
        }
    }, []);

    // Export queries to CSV (useCallback for performance)
    const exportQueriesToCSV = useCallback(() => {
        if (!parsedQueries.length) return;
        
        const headers = ['Timestamp', 'Type', 'Description', 'SQL/Command', 'Severity', 'ErrorTypes'];
        const csvData = [
            headers.join('\t'), // Using TAB for better copy/paste into Excel/Sheets
            ...parsedQueries.map(query => [
                `"${query.timestamp.toISOString()}"`,
                `"${query.type}"`,
                `"${query.description.replace(/"/g, '""')}"`,
                `"${query.sqlOrCommand.replace(/"/g, '""')}"`,
                `"${query.errorInfo.severity}"`,
                `"${query.errorInfo.errorTypes.join('; ').replace(/"/g, '""')}"`
            ].join('\t'))
        ].join('\n');
        
        const blob = new Blob([csvData], { type: 'text/tab-separated-values' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `query-log-analysis-${new Date().toISOString().split('T')[0]}.tsv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, [parsedQueries]);

    // Clear query data (useCallback for performance)
    const clearQueryData = useCallback(() => {
        setQueryLogData('');
        setParsedQueries([]);
        setExpandedRows(new Set());
    }, []);
    
    // Helper to map severity to MUI color
    const getMuiColor = (severity) => {
        if (severity === 'error') return 'error';
        if (severity === 'warning') return 'warning';
        if (severity === 'info') return 'info';
        return 'default';
    };

    // Helper function to toggle visibility of query error types
    const toggleQueryErrorTypeVisibility = useCallback((type) => {
        setVisibleQueryErrorTypes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(type)) {
                newSet.delete(type);
            } else {
                newSet.add(type);
            }
            return newSet;
        });
    }, []);

    return (
        <Box sx={{ p: 3, maxWidth: '100%', mx: 'auto' }}>
            <Card elevation={3}>
                <CardContent>
                    {/* Header and Actions */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <BarChartIcon color="primary" sx={{ fontSize: 28 }} />
                            <Typography variant="h5" component="h1" fontWeight="bold">
                                Query Log Analyzer
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="outlined"
                                onClick={() => setQueryAnalysisOpen(!queryAnalysisOpen)}
                                startIcon={queryAnalysisOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            >
                                {queryAnalysisOpen ? 'Hide' : 'Show'} Analyzer
                            </Button>
                            {parsedQueries.length > 0 && (
                                <>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={exportQueriesToCSV}
                                        startIcon={<CloudUploadIcon />}
                                    >
                                        Export TSV
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={clearQueryData}
                                        startIcon={<CloseIcon />}
                                        color="error"
                                    >
                                        Clear
                                    </Button>
                                </>
                            )}
                        </Box>
                    </Box>

                    <Collapse in={queryAnalysisOpen}>
                        <Box>
                            {/* Data Input Area */}
                            <Box sx={{ padding: 2, mb: 2 }}>
                                <Typography variant="subtitle1" color="textSecondary" gutterBottom>
                                    Paste your query log data below: Expected format: Timestamp, Type, Description, SQL/Command
                                </Typography>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="body2" color="textSecondary">
                                            Supports **tab-separated** data. Data should start with a timestamp column.
                                        </Typography>
                                        <Box sx={{ marginTop: 2 }}>
                                            <textarea
                                                value={queryLogData}
                                                onChange={handleQueryLogPaste}
                                                placeholder="Paste your query log data here (tab-separated: timestamp, type, description, SQL/command)..."
                                                style={{
                                                    width: '100%',
                                                    minHeight: '150px',
                                                    padding: '10px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #ccc',
                                                    fontFamily: 'monospace'
                                                }}
                                            />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Box>

                            {/* Query Statistics Summary */}
                            {stats && stats.totalQueries > 0 && (
                                <Box sx={{ mb: 3 }}>
                                    <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                                        <CardContent>
                                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}><BarChartIcon fontSize="small" /> Analysis Summary</Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={6} md={3}>
                                                  <Typography variant="body2" color="textSecondary">Total Entries</Typography>
                                                  <Typography variant="h5" fontWeight="bold">{stats.totalQueries}</Typography>
                                                </Grid>
                                                <Grid item xs={6} md={3}>
                                                  <Typography variant="body2" color="textSecondary">Log Duration</Typography>
                                                  <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <AccessTimeIcon fontSize="small" />
                                                    {stats.durationMinutes > 0 ? `${stats.durationMinutes} min` : 'N/A'}
                                                  </Typography>
                                                </Grid>
                                                <Grid item xs={12} md={6}>
                                                  <Typography variant="body2" color="textSecondary">Error Breakdown</Typography>
                                                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                                    <Chip 
                                                      label={`Errors: ${stats.errorCounts.errors}`} 
                                                      size="small" 
                                                      color="error" 
                                                      variant={visibleQueryErrorTypes.has('error') ? "filled" : "outlined"} 
                                                      onClick={() => toggleQueryErrorTypeVisibility('error')} 
                                                      clickable 
                                                    />
                                                    <Chip 
                                                      label={`Warnings: ${stats.errorCounts.warnings}`} 
                                                      size="small" 
                                                      color="warning" 
                                                      variant={visibleQueryErrorTypes.has('warning') ? "filled" : "outlined"} 
                                                      onClick={() => toggleQueryErrorTypeVisibility('warning')} 
                                                      clickable 
                                                    />
                                                    <Chip 
                                                      label={`Info: ${stats.errorCounts.total - stats.errorCounts.errors - stats.errorCounts.warnings}`} 
                                                      size="small" 
                                                      color="info" 
                                                      variant={visibleQueryErrorTypes.has('info') ? "filled" : "outlined"} 
                                                      onClick={() => toggleQueryErrorTypeVisibility('info')} 
                                                      clickable 
                                                    />
                                                  </Box>
                                                </Grid>
                                            </Grid>
                                            
                                            {/* Query Type Breakdown Chips */}
                                            <Box sx={{ mt: 2, borderTop: '1px solid #eee', pt: 2 }}>
                                              <Typography variant="subtitle2" gutterBottom>Type Distribution:</Typography>
                                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                {Object.entries(stats.typeBreakdown).map(([type, count]) => (
                                                  <Chip
                                                    key={type}
                                                    label={`${type} (${count})`}
                                                    variant="outlined"
                                                    size="small"
                                                    color={type.includes('sql') || type.includes('custom') ? 'primary' :
                                                            type.includes('init') || type.includes('block') ? 'secondary' : 'default'}
                                                  />
                                                ))}
                                              </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Box>
                            )}

                            {/* Query Details Table */}
                            {parsedQueries.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Query Details ({parsedQueries.length} entries)
                                    </Typography>
                                    <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                                        <Table stickyHeader size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ width: '15%' }}>Timestamp</TableCell>
                                                    <TableCell sx={{ width: '15%' }}>Type</TableCell>
                                                    <TableCell sx={{ width: '30%' }}>Description / Error</TableCell>
                                                    <TableCell sx={{ width: '40%' }}>SQL / Command</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {parsedQueries.filter(query => visibleQueryErrorTypes.has(query.errorInfo?.severity || 'info')).map((query) => {
                                                    const errorSeverity = query.errorInfo?.severity || 'info';
                                                    
                                                    return (
                                                        <TableRow 
                                                            key={query.id} 
                                                            hover 
                                                            sx={{ 
                                                                '&.MuiTableRow-root:hover': { 
                                                                    backgroundColor: getMuiColor(errorSeverity) === 'error' ? 'error.lightest' : getMuiColor(errorSeverity) === 'warning' ? 'warning.lightest' : 'action.hover' 
                                                                } 
                                                            }}
                                                        >
                                                            <TableCell>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    {query.errorInfo.hasErrors && (
                                                                        errorSeverity === 'error' ? <ErrorIcon color="error" fontSize="small" /> :
                                                                        errorSeverity === 'warning' ? <WarningIcon color="warning" fontSize="small" /> :
                                                                        <InfoIcon color="info" fontSize="small" />
                                                                    )}
                                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                                                        {query.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
                                                                    </Typography>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    label={query.type}
                                                                    size="small"
                                                                    color={query.type.includes('sql') || query.type.includes('custom') ? 'primary' : 
                                                                            query.type.includes('init') || query.type.includes('block') ? 'secondary' : 'default'}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                                                    {query.description}
                                                                </Typography>
                                                                {query.errorInfo.errorTypes.length > 0 && (
                                                                    <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                        {query.errorInfo.errorTypes.map((errorType, idx) => (
                                                                            <Chip
                                                                                key={idx}
                                                                                label={errorType.includes('Code:') ? errorType.replace('Code:', 'E:') : errorType}
                                                                                size="small"
                                                                                variant="outlined"
                                                                                color={getMuiColor(errorSeverity)}
                                                                                sx={{ fontSize: '10px', height: 18 }}
                                                                            />
                                                                        ))}
                                                                    </Box>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Box sx={{ maxWidth: '100%' }}>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => toggleRowExpansion(query.id)}
                                                                            sx={{ p: 0.5 }}
                                                                            title={expandedRows.has(query.id) ? 'Collapse Details' : 'Expand Details'}
                                                                        >
                                                                            {expandedRows.has(query.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                                        </IconButton>
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => copyToClipboard(query.sqlOrCommand, query.id)}
                                                                            sx={{ p: 0.5 }}
                                                                            title="Copy SQL to clipboard"
                                                                        >
                                                                            <ContentCopyIcon fontSize="small" />
                                                                        </IconButton>
                                                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                                                            {query.sqlOrCommand.length} chars
                                                                        </Typography>
                                                                    </Box>
                                                                    
                                                                    {/* Shortened preview (when collapsed) */}
                                                                    <Collapse in={!expandedRows.has(query.id)} collapsedSize={35}>
                                                                        <Typography 
                                                                            variant="caption" 
                                                                            component="div"
                                                                            sx={{ 
                                                                                fontFamily: 'monospace', 
                                                                                fontSize: '11px',
                                                                                overflow: 'hidden',
                                                                                display: '-webkit-box',
                                                                                WebkitLineClamp: 3,
                                                                                WebkitBoxOrient: 'vertical',
                                                                                wordBreak: 'break-word',
                                                                                whiteSpace: 'pre-wrap' // Preserve PL/SQL formatting
                                                                            }}
                                                                        >
                                                                            {query.sqlOrCommand}
                                                                        </Typography>
                                                                    </Collapse>

                                                                    {/* Full detail view (when expanded) */}
                                                                    <Collapse in={expandedRows.has(query.id)}>
                                                                        <Typography 
                                                                            variant="caption" 
                                                                            component="pre"
                                                                            sx={{ 
                                                                                fontFamily: 'monospace', 
                                                                                fontSize: '11px',
                                                                                whiteSpace: 'pre-wrap', 
                                                                                wordBreak: 'break-word',
                                                                                mt: 0.5
                                                                            }}
                                                                        >
                                                                            {query.sqlOrCommand}
                                                                        </Typography>
                                                                    </Collapse>
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}

                            {/* No data messages */}
                            {parsedQueries.length === 0 && queryLogData.trim() === '' && (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                    <Typography variant="body2">
                                        Paste your Oracle query log data above to begin analysis. The tool expects **tab-separated** data with columns: **timestamp**, **type** (`p_sql`, `p_init`, etc.), **description**, and **SQL/command**.
                                    </Typography>
                                </Alert>
                            )}
                            {parsedQueries.length === 0 && queryLogData.trim() !== '' && (
                                <Alert severity="warning" sx={{ mt: 2 }}>
                                    <Typography variant="body2">
                                        **Unable to parse the data**. Ensure each line starts with a timestamp and the columns are correctly separated by **tabs** (or multiple spaces), especially for multi-line PL/SQL blocks.
                                    </Typography>
                                </Alert>
                            )}
                        </Box>
                    </Collapse>
                </CardContent>
            </Card>

            {/* Copy Success Notification */}
            <Snackbar
                open={copySuccess}
                autoHideDuration={2000}
                onClose={() => setCopySuccess(false)}
                message={copiedText}
                action={
                    <IconButton size="small" aria-label="close" color="inherit" onClick={() => setCopySuccess(false)}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                }
            />
        </Box>
    );
}

export default QueryLogAnalyzer;